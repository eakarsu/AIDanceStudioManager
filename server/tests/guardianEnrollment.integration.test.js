'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const express = require('express');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const { guardianEnrollmentRouter, staffEnrollmentReviewRouter } = require('../routes/guardianEnrollment');
const legacyStaffBoundary = require('../middleware/legacyStaffBoundary');
const directOperations = require('../routes/governedOperations');
const directPool = require('../db');

test('guardian request is scoped, reviewable, retry-safe and never a payment receipt',
  { skip: process.env.RUN_GUARDIAN_REQUEST_DB_TESTS !== '1' }, async t => {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const app = express();
    app.use(express.json());
    app.use('/api/guardian', guardianEnrollmentRouter(pool));
    app.use('/api', legacyStaffBoundary(pool));
    app.use('/api/governed-operations', directOperations);
    app.use('/api/governed-operations', staffEnrollmentReviewRouter(pool));
    const server = await new Promise(resolve => {
      const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
    });
    t.after(async () => {
      await new Promise(resolve => server.close(resolve));
      await pool.end();
      await directPool.end();
    });
    const base = `http://127.0.0.1:${server.address().port}`;
    const token = userId => jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const call = async (path, userId, body, key) => {
      const response = await fetch(base + path, {
        method: body === undefined ? 'GET' : 'POST',
        headers: {
          Authorization: `Bearer ${token(userId)}`,
          'Content-Type': 'application/json',
          ...(key ? { 'Idempotency-Key': key } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      return { status: response.status, body: await response.json() };
    };
    const makeUser = async role => (await pool.query(
      `INSERT INTO users(name,email,password_hash,role)
       VALUES($1,$2,'test-hash',$3) RETURNING id`,
      [role, `${randomUUID()}@test.invalid`, role],
    )).rows[0].id;
    const [staff, secondStaff, parent, otherParent] = await Promise.all([
      makeUser('admin'), makeUser('staff'), makeUser('parent'), makeUser('parent'),
    ]);
    const [tenant, otherTenant] = [randomUUID(), randomUUID()];
    await pool.query('INSERT INTO dance_tenants(id,name) VALUES($1,$2),($3,$4)',
      [tenant, 'Request studio', otherTenant, 'Other studio']);
    await pool.query(
      `INSERT INTO dance_tenant_memberships(tenant_id,user_id,role) VALUES($1,$2,'registrar'),($1,$3,'teacher')`,
      [tenant, staff, secondStaff],
    );
    const guardian = (await pool.query(
      `INSERT INTO dance_guardians(tenant_id,external_ref,name_encrypted,contact_encrypted)
       VALUES($1,$2,'cipher','cipher') RETURNING id`,
      [tenant, `guardian-${randomUUID()}`],
    )).rows[0].id;
    const child = (await pool.query(
      `INSERT INTO dance_students(tenant_id,external_ref,is_minor,display_name_encrypted)
       VALUES($1,$2,true,'cipher') RETURNING id`,
      [tenant, `child-${randomUUID()}`],
    )).rows[0].id;
    const otherChild = (await pool.query(
      `INSERT INTO dance_students(tenant_id,external_ref,is_minor,display_name_encrypted)
       VALUES($1,$2,true,'cipher') RETURNING id`,
      [otherTenant, `other-child-${randomUUID()}`],
    )).rows[0].id;
    await pool.query(
      `INSERT INTO dance_guardian_accounts(tenant_id,guardian_id,user_id,linked_by)
       VALUES($1,$2,$3,$4)`, [tenant, guardian, parent, staff],
    );
    await pool.query(
      `INSERT INTO dance_guardian_student_links(tenant_id,guardian_id,student_id,linked_by)
       VALUES($1,$2,$3,$4)`, [tenant, guardian, child, staff],
    );
    const start = new Date(Date.now() + 86400000).toISOString();
    const end = new Date(Date.now() + 90000000).toISOString();
    const termStart = new Date(Date.now() - 86400000).toISOString();
    const termEnd = new Date(Date.now() + 30 * 86400000).toISOString();
    const section = (await pool.query(
      `INSERT INTO dance_sections
       (tenant_id,program_name,teacher_ref,room_ref,starts_at,ends_at,term_starts_at,term_ends_at,capacity,term_amount_cents)
       VALUES($1,'Ballet','teacher','room',$2,$3,$4,$5,1,10000) RETURNING id`,
      [tenant, start, end, termStart, termEnd],
    )).rows[0].id;
    const otherSection = (await pool.query(
      `INSERT INTO dance_sections
       (tenant_id,program_name,teacher_ref,room_ref,starts_at,ends_at,term_starts_at,term_ends_at,capacity,term_amount_cents)
       VALUES($1,'Other','teacher','room',$2,$3,$4,$5,1,10000) RETURNING id`,
      [otherTenant, start, end, termStart, termEnd],
    )).rows[0].id;
    const parentPath = `/api/guardian/studios/${tenant}/enrollment-requests`;
    const staffPath = `/api/governed-operations/tenants/${tenant}/enrollment-requests`;

    assert.equal((await call(`/api/guardian/studios/${tenant}/sections`, otherParent)).status, 404);
    const offered = await call(`/api/guardian/studios/${tenant}/sections`, parent);
    assert.equal(offered.status, 200, JSON.stringify(offered.body));
    assert.equal(offered.body.sections.length, 1);
    assert.equal((await call(parentPath, parent, { studentId: otherChild, sectionId: section }, 'other-child-key')).status, 404);
    assert.equal((await call(parentPath, parent, { studentId: child, sectionId: otherSection }, 'other-tenant-key')).status, 404);
    assert.equal((await call(parentPath, parent, { studentId: child, sectionId: section }, 'consent-needed-key')).status, 409);
    await pool.query(
      `INSERT INTO dance_consents
       (student_id,guardian_id,purpose,status,policy_version,evidence_hash,granted_at,expires_at)
       VALUES($1,$2,'program_participation','granted','v1',$3,NOW()-INTERVAL '1 day',NOW()+INTERVAL '30 days')`,
      [child, guardian, 'a'.repeat(64)],
    );
    const key = `request-${randomUUID()}`;
    const first = await call(parentPath, parent, { studentId: child, sectionId: section }, key);
    assert.equal(first.status, 201);
    assert.equal(first.body.request.status, 'pending');
    assert.equal((await call(parentPath, parent, { studentId: child, sectionId: section }, key)).body.replayed, true);
    assert.equal((await call(parentPath, parent, { studentId: child, sectionId: otherSection }, key)).status, 409);
    assert.equal((await call(parentPath, parent, { studentId: child, sectionId: section }, `duplicate-${randomUUID()}`)).status, 409);
    assert.equal((await call(staffPath, secondStaff)).status, 403);
    assert.equal((await call(staffPath, parent)).status, 403);
    assert.equal((await call(staffPath, staff)).body.requests.length, 1);
    const decisionPath = `${staffPath}/${first.body.request.id}/decision`;
    assert.equal((await call(decisionPath, staff, { decision: 'accept' })).status, 409);
    const accepted = await call(decisionPath, staff, { decision: 'accept', ageSkillVerified: true });
    assert.equal(accepted.status, 200);
    assert.equal(accepted.body.request.status, 'enrolled');
    assert.equal(accepted.body.enrollment.status, 'active');
    assert.equal(accepted.body.paymentStatus, 'unverified');
    assert.equal((await call(decisionPath, staff, { decision: 'accept', ageSkillVerified: true })).status, 409);
    assert.equal((await call(parentPath, parent)).body.requests[0].status, 'enrolled');
    assert.equal((await pool.query('SELECT COUNT(*)::int AS n FROM dance_ledger_entries WHERE tenant_id=$1', [tenant])).rows[0].n, 0);
    const audit = await pool.query(
      `SELECT action FROM dance_audit_events WHERE tenant_id=$1 AND aggregate_type='guardian_enrollment_request' ORDER BY id`,
      [tenant],
    );
    assert.deepEqual(audit.rows.map(row => row.action), ['guardian_enrollment.requested', 'guardian_enrollment.enrolled']);

    const retrySection = (await pool.query(
      `INSERT INTO dance_sections
       (tenant_id,program_name,teacher_ref,room_ref,starts_at,ends_at,term_starts_at,term_ends_at,capacity,term_amount_cents)
       VALUES($1,'Jazz','teacher','room',$2,$3,$4,$5,1,10000) RETURNING id`,
      [tenant, start, end, termStart, termEnd],
    )).rows[0].id;
    const parallelKey = `parallel-${randomUUID()}`;
    const parallel = await Promise.all(Array.from({ length: 6 }, () => call(parentPath, parent,
      { studentId: child, sectionId: retrySection }, parallelKey)));
    assert.deepEqual(parallel.map(item => item.status).sort(), [200, 200, 200, 200, 200, 201]);
    assert.equal(new Set(parallel.map(item => item.body.request.id)).size, 1);
    assert.equal((await pool.query(
      `SELECT COUNT(*)::int AS n FROM dance_guardian_enrollment_requests
       WHERE tenant_id=$1 AND guardian_user_id=$2 AND idempotency_key=$3`,
      [tenant, parent, parallelKey],
    )).rows[0].n, 1);
    await call(`${parentPath}/${parallel[0].body.request.id}/cancel`, parent, {});

    const sameChild = (await pool.query(
      `INSERT INTO dance_students(tenant_id,external_ref,is_minor,display_name_encrypted)
       VALUES($1,$2,true,'cipher') RETURNING id`,
      [tenant, `parallel-child-${randomUUID()}`],
    )).rows[0].id;
    await pool.query(
      `INSERT INTO dance_guardian_student_links(tenant_id,guardian_id,student_id,linked_by)
       VALUES($1,$2,$3,$4)`, [tenant, guardian, sameChild, staff],
    );
    await pool.query(
      `INSERT INTO dance_consents
       (student_id,guardian_id,purpose,status,policy_version,evidence_hash,granted_at,expires_at)
       VALUES($1,$2,'program_participation','granted','v1',$3,NOW()-INTERVAL '1 day',NOW()+INTERVAL '30 days')`,
      [sameChild, guardian, 'b'.repeat(64)],
    );
    const overlappingSections = [];
    for (const program of ['Concurrent A', 'Concurrent B']) {
      overlappingSections.push((await pool.query(
        `INSERT INTO dance_sections
         (tenant_id,program_name,teacher_ref,room_ref,starts_at,ends_at,term_starts_at,term_ends_at,capacity,term_amount_cents)
         VALUES($1,$2,'teacher','room',$3,$4,$5,$6,1,10000) RETURNING id`,
        [tenant, program, start, end, termStart, termEnd],
      )).rows[0].id);
    }
    const overlappingRequests = await Promise.all(overlappingSections.map(sectionId => call(parentPath, parent,
      { studentId: sameChild, sectionId }, `overlap-${randomUUID()}`)));
    assert.ok(overlappingRequests.every(item => item.status === 201));
    const decisions = await Promise.all(overlappingRequests.map(item => call(
      `${staffPath}/${item.body.request.id}/decision`, staff, { decision: 'accept', ageSkillVerified: true })));
    assert.ok(decisions.every(item => item.status === 200), JSON.stringify(decisions));
    assert.deepEqual(decisions.map(item => item.body.request.status).sort(), ['blocked', 'enrolled']);
    assert.equal((await pool.query(
      `SELECT COUNT(*)::int AS n FROM dance_enrollments
       WHERE tenant_id=$1 AND student_id=$2 AND status='active'`, [tenant, sameChild],
    )).rows[0].n, 1);

    const directChild = (await pool.query(
      `INSERT INTO dance_students(tenant_id,external_ref,is_minor,display_name_encrypted)
       VALUES($1,$2,true,'cipher') RETURNING id`,
      [tenant, `direct-child-${randomUUID()}`],
    )).rows[0].id;
    await pool.query(
      `INSERT INTO dance_guardian_student_links(tenant_id,guardian_id,student_id,linked_by)
       VALUES($1,$2,$3,$4)`, [tenant, guardian, directChild, staff],
    );
    await pool.query(
      `INSERT INTO dance_consents
       (student_id,guardian_id,purpose,status,policy_version,evidence_hash,granted_at,expires_at)
       VALUES($1,$2,'program_participation','granted','v1',$3,NOW()-INTERVAL '1 day',NOW()+INTERVAL '30 days')`,
      [directChild, guardian, 'c'.repeat(64)],
    );
    const directSections = [];
    for (const program of ['Direct class', 'Guardian class']) {
      directSections.push((await pool.query(
        `INSERT INTO dance_sections
         (tenant_id,program_name,teacher_ref,room_ref,starts_at,ends_at,term_starts_at,term_ends_at,capacity,term_amount_cents)
         VALUES($1,$2,'teacher','room',$3,$4,$5,$6,1,10000) RETURNING id`,
        [tenant, program, start, end, termStart, termEnd],
      )).rows[0].id);
    }
    const crossRequest = await call(parentPath, parent,
      { studentId: directChild, sectionId: directSections[1] }, `cross-path-${randomUUID()}`);
    assert.equal(crossRequest.status, 201);
    const directPath = '/api/governed-operations/enrollments';
    const directBody = { tenantId: tenant, studentId: directChild, sectionId: directSections[0],
      guardianId: guardian, enrollmentDate: new Date().toISOString() };
    const directKey = `direct-${randomUUID()}`;
    assert.equal((await call(directPath, secondStaff, directBody, `teacher-${randomUUID()}`)).status, 403);
    assert.equal((await call(directPath, staff, { ...directBody, tenantId: otherTenant },
      `foreign-${randomUUID()}`)).status, 403);
    const [directPlacement, guardianPlacement] = await Promise.all([
      call(directPath, staff, directBody, directKey),
      call(`${staffPath}/${crossRequest.body.request.id}/decision`, staff,
        { decision: 'accept', ageSkillVerified: true }),
    ]);
    assert.equal(directPlacement.status, 201, JSON.stringify(directPlacement.body));
    assert.equal(guardianPlacement.status, 200, JSON.stringify(guardianPlacement.body));
    assert.deepEqual([directPlacement.body.status,
      guardianPlacement.body.request.status === 'enrolled' ? 'active' : guardianPlacement.body.request.status].sort(),
    ['active', 'blocked']);
    const directRetry = await call(directPath, staff, directBody, directKey);
    assert.equal(directRetry.status, 200);
    assert.equal(directRetry.body.replayed, true);
    assert.equal(directRetry.body.id, directPlacement.body.id);
    assert.equal((await call(directPath, staff, { ...directBody,
      enrollmentDate: new Date(Date.parse(directBody.enrollmentDate) + 1000).toISOString() }, directKey)).status, 409);
    assert.equal((await call(directPath, staff, { ...directBody, guardianId: guardian + 1 }, directKey)).status, 409);
    assert.equal((await pool.query(
      `SELECT COUNT(*)::int AS n FROM dance_enrollments
       WHERE tenant_id=$1 AND student_id=$2 AND status='active'`, [tenant, directChild],
    )).rows[0].n, 1);

    const adult = (await pool.query(
      `INSERT INTO dance_students(tenant_id,external_ref,is_minor,display_name_encrypted)
       VALUES($1,$2,false,'cipher') RETURNING id`,
      [tenant, `direct-adult-${randomUUID()}`],
    )).rows[0].id;
    const adultSection = (await pool.query(
      `INSERT INTO dance_sections
       (tenant_id,program_name,teacher_ref,room_ref,starts_at,ends_at,term_starts_at,term_ends_at,capacity,term_amount_cents)
       VALUES($1,'Adult direct','teacher','room',$2,$3,$4,$5,1,10000) RETURNING id`,
      [tenant, start, end, termStart, termEnd],
    )).rows[0].id;
    const adultKey = `parallel-direct-${randomUUID()}`;
    const adultBody = { tenantId: tenant, studentId: adult, sectionId: adultSection,
      guardianId: null, enrollmentDate: directBody.enrollmentDate };
    const adultResults = await Promise.all(Array.from({ length: 4 }, () =>
      call(directPath, staff, adultBody, adultKey)));
    assert.deepEqual(adultResults.map(item => item.status).sort(), [200, 200, 200, 201]);
    assert.equal(new Set(adultResults.map(item => item.body.id)).size, 1);

    const foreignEnrollment = (await pool.query(
      `INSERT INTO dance_enrollments
       (tenant_id,student_id,section_id,status,tuition_cents,idempotency_key,created_by)
       VALUES($1,$2,$3,'active',10000,$4,$5) RETURNING id`,
      [otherTenant, otherChild, otherSection, `foreign-${randomUUID()}`, staff],
    )).rows[0].id;
    await assert.rejects(() => pool.query(
      `UPDATE dance_guardian_enrollment_requests SET enrollment_id=$1 WHERE id=$2`,
      [foreignEnrollment, first.body.request.id],
    ), error => error.code === '23503', 'cross-tenant enrollment pointer must fail at the database');

    const expirySection = (await pool.query(
      `INSERT INTO dance_sections
       (tenant_id,program_name,teacher_ref,room_ref,starts_at,ends_at,term_starts_at,term_ends_at,capacity,term_amount_cents)
       VALUES($1,'Expiry check','teacher','room',$2,$3,$4,$5,1,10000) RETURNING id`,
      [tenant, start, end, termStart, termEnd],
    )).rows[0].id;
    const expiryRequest = await call(parentPath, parent,
      { studentId: sameChild, sectionId: expirySection }, `expiry-${randomUUID()}`);
    assert.equal(expiryRequest.status, 201);
    const blocker = await pool.connect();
    try {
      await blocker.query('BEGIN');
      await blocker.query('SELECT id FROM dance_sections WHERE id=$1 FOR UPDATE', [expirySection]);
      await pool.query(
        `UPDATE dance_consents SET expires_at=clock_timestamp()+INTERVAL '2 seconds'
         WHERE student_id=$1 AND guardian_id=$2 AND purpose='program_participation'`,
        [sameChild, guardian],
      );
      const pendingReview = call(`${staffPath}/${expiryRequest.body.request.id}/decision`, staff,
        { decision: 'accept', ageSkillVerified: true });
      await new Promise(resolve => setTimeout(resolve, 2300));
      await blocker.query('COMMIT');
      const expiredReview = await pendingReview;
      assert.equal(expiredReview.status, 409, JSON.stringify(expiredReview.body));
      assert.match(expiredReview.body.error, /Consent expired or was revoked/i);
    } finally {
      try { await blocker.query('ROLLBACK'); } catch (_) { /* transaction already closed */ }
      blocker.release();
    }

    const nextSection = (await pool.query(
      `INSERT INTO dance_sections
       (tenant_id,program_name,teacher_ref,room_ref,starts_at,ends_at,term_starts_at,term_ends_at,capacity,term_amount_cents)
       VALUES($1,'Tap','teacher','room',$2,$3,$4,$5,1,10000) RETURNING id`,
      [tenant, start, end, termStart, termEnd],
    )).rows[0].id;
    const secondRequest = await call(parentPath, parent,
      { studentId: child, sectionId: nextSection }, `cancel-${randomUUID()}`);
    assert.equal(secondRequest.status, 201);
    assert.equal((await call(`${parentPath}/${secondRequest.body.request.id}/cancel`, otherParent, {})).status, 404);
    assert.equal((await call(`${parentPath}/${secondRequest.body.request.id}/cancel`, parent, {})).body.request.status, 'cancelled');
    assert.equal((await call(`${staffPath}/${secondRequest.body.request.id}/decision`, staff,
      { decision: 'accept', ageSkillVerified: true })).status, 409);
    const declinedRequest = await call(parentPath, parent,
      { studentId: child, sectionId: nextSection }, `decline-${randomUUID()}`);
    assert.equal(declinedRequest.status, 201);
    const declinePath = `${staffPath}/${declinedRequest.body.request.id}/decision`;
    assert.equal((await call(declinePath, staff, { decision: 'decline' })).status, 422);
    assert.equal((await call(declinePath, staff,
      { decision: 'decline', reason: 'Class suitability needs a separate review' })).body.request.status, 'declined');
    const revokedConsentRequest = await call(parentPath, parent,
      { studentId: child, sectionId: nextSection }, `consent-revoke-${randomUUID()}`);
    assert.equal(revokedConsentRequest.status, 201);
    await pool.query(
      `UPDATE dance_consents SET status='revoked',revoked_at=NOW()
       WHERE student_id=$1 AND guardian_id=$2 AND purpose='program_participation'`,
      [child, guardian],
    );
    assert.equal((await call(`${staffPath}/${revokedConsentRequest.body.request.id}/decision`, staff,
      { decision: 'accept', ageSkillVerified: true })).status, 409);
    await pool.query('UPDATE dance_guardian_student_links SET revoked_at=NOW(),revoked_by=$1 WHERE tenant_id=$2 AND guardian_id=$3 AND student_id=$4',
      [staff, tenant, guardian, child]);
    assert.ok((await call(parentPath, parent)).body.requests.every(item =>
      Number(item.student_id) !== Number(child)), 'revoked child requests must be hidden');
    assert.equal((await call(parentPath, parent, { studentId: child, sectionId: nextSection }, `revoked-${randomUUID()}`)).status, 404);
  });
