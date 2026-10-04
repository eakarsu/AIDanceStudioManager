'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const express = require('express');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const createGuardianFamilyRouter = require('../routes/guardianFamily');
const legacyStaffBoundary = require('../middleware/legacyStaffBoundary');

const enabled = process.env.RUN_GUARDIAN_DB_TESTS === '1';

test('guardian reads only active account and child links in the selected tenant', { skip: !enabled }, async t => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const app = express();
  app.use('/api/guardian', createGuardianFamilyRouter(pool));
  app.use('/api', legacyStaffBoundary(pool));
  app.get('/api/students', (_req, res) => res.json({ legacy: true }));
  const server = await new Promise(resolve => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    await pool.end();
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const tag = randomUUID();
  const makeUser = async role => (await pool.query(
    'INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,$4) RETURNING id',
    [role, `${role}-${randomUUID()}@test.invalid`, 'not-a-login-hash', role],
  )).rows[0].id;
  const [staff, firstParent, secondParent, unlinkedParent] = await Promise.all([
    makeUser('admin'), makeUser('parent'), makeUser('parent'), makeUser('parent'),
  ]);
  const token = userId => jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const get = async (path, userId) => {
    const response = await fetch(base + path, { headers: userId ? { Authorization: `Bearer ${token(userId)}` } : {} });
    return { status: response.status, body: await response.json(), cache: response.headers.get('cache-control') };
  };
  const [firstTenant, secondTenant] = [randomUUID(), randomUUID()];
  await pool.query('INSERT INTO dance_tenants(id,name) VALUES($1,$2),($3,$4)', [firstTenant, `Studio A ${tag}`, secondTenant, `Studio B ${tag}`]);
  const makeGuardian = async (tenantId, ref) => (await pool.query(
    'INSERT INTO dance_guardians(tenant_id,external_ref,name_encrypted,contact_encrypted) VALUES($1,$2,$3,$4) RETURNING id',
    [tenantId, `${ref}-${tag}`, 'ciphertext', 'ciphertext'],
  )).rows[0].id;
  const makeStudent = async (tenantId, ref) => (await pool.query(
    'INSERT INTO dance_students(tenant_id,external_ref,is_minor,display_name_encrypted) VALUES($1,$2,true,$3) RETURNING id',
    [tenantId, `${ref}-${tag}`, 'private-ciphertext'],
  )).rows[0].id;
  const [firstGuardian, secondGuardian, otherStudioGuardian, firstChild, secondChild, otherStudioChild] = await Promise.all([
    makeGuardian(firstTenant, 'guardian-a'), makeGuardian(firstTenant, 'guardian-b'), makeGuardian(secondTenant, 'guardian-c'),
    makeStudent(firstTenant, 'child-a'), makeStudent(firstTenant, 'child-b'), makeStudent(secondTenant, 'child-c'),
  ]);
  for (const [tenantId, guardianId, userId, childId] of [
    [firstTenant, firstGuardian, firstParent, firstChild],
    [firstTenant, secondGuardian, secondParent, secondChild],
    [secondTenant, otherStudioGuardian, firstParent, otherStudioChild],
  ]) {
    await pool.query('INSERT INTO dance_guardian_accounts(tenant_id,guardian_id,user_id,linked_by) VALUES($1,$2,$3,$4)', [tenantId, guardianId, userId, staff]);
    await pool.query('INSERT INTO dance_guardian_student_links(tenant_id,guardian_id,student_id,linked_by) VALUES($1,$2,$3,$4)', [tenantId, guardianId, childId, staff]);
  }
  await assert.rejects(
    pool.query('INSERT INTO dance_guardian_student_links(tenant_id,guardian_id,student_id,linked_by) VALUES($1,$2,$3,$4)', [firstTenant, firstGuardian, otherStudioChild, staff]),
    /foreign key/,
  );
  const makeSection = async (tenantId, name) => (await pool.query(
    `INSERT INTO dance_sections(tenant_id,program_name,teacher_ref,room_ref,starts_at,ends_at,term_starts_at,term_ends_at,capacity,term_amount_cents)
     VALUES($1,$2,'teacher','room','2026-10-08T17:00:00Z','2026-10-08T18:00:00Z','2026-10-01T00:00:00Z','2026-12-01T00:00:00Z',20,10000) RETURNING id`,
    [tenantId, name],
  )).rows[0].id;
  const [sectionA, sectionB, sectionC] = await Promise.all([
    makeSection(firstTenant, 'Ballet A'), makeSection(firstTenant, 'Jazz B'), makeSection(secondTenant, 'Tap C'),
  ]);
  const makeEnrollment = async (tenantId, studentId, sectionId) => (await pool.query(
    `INSERT INTO dance_enrollments(tenant_id,student_id,section_id,status,tuition_cents,idempotency_key,created_by)
     VALUES($1,$2,$3,'active',10000,$4,$5) RETURNING id`,
    [tenantId, studentId, sectionId, `enroll-${randomUUID()}`, staff],
  )).rows[0].id;
  const [enrollmentA, enrollmentB, enrollmentC] = await Promise.all([
    makeEnrollment(firstTenant, firstChild, sectionA), makeEnrollment(firstTenant, secondChild, sectionB),
    makeEnrollment(secondTenant, otherStudioChild, sectionC),
  ]);
  for (const [tenantId, enrollmentId] of [[firstTenant, enrollmentA], [firstTenant, enrollmentB], [secondTenant, enrollmentC]])
    await pool.query(
      `INSERT INTO dance_attendance_events(tenant_id,enrollment_id,session_at,status,recorded_by,source,idempotency_key)
       VALUES($1,$2,'2026-10-08T17:00:00Z','present',$3,'staff',$4)`,
      [tenantId, enrollmentId, staff, `attendance-${randomUUID()}`],
    );

  assert.equal((await get(`/api/guardian/studios/${firstTenant}/family`)).status, 401);
  assert.equal((await get('/api/guardian/studios', staff)).status, 403);
  assert.equal((await get('/api/students', firstParent)).status, 403);
  assert.equal((await get('/api/students', staff)).status, 200);
  assert.deepEqual((await get('/api/guardian/studios', unlinkedParent)).body.studios, []);
  assert.equal((await get(`/api/guardian/studios/${secondTenant}/family`, secondParent)).status, 404);
  assert.equal((await get(`/api/guardian/studios/${firstTenant}/family`, unlinkedParent)).status, 404);
  const first = await get(`/api/guardian/studios/${firstTenant}/family?studentId=${secondChild}`, firstParent);
  assert.equal(first.status, 200);
  assert.match(first.cache, /no-store/);
  assert.deepEqual(first.body.children.map(row => String(row.id)), [String(firstChild)]);
  assert.deepEqual(first.body.enrollments.map(row => String(row.student_id)), [String(firstChild)]);
  assert.deepEqual(first.body.attendance.map(row => String(row.student_id)), [String(firstChild)]);
  assert.equal(JSON.stringify(first.body).includes('private-ciphertext'), false);
  const otherStudio = await get(`/api/guardian/studios/${secondTenant}/family`, firstParent);
  assert.deepEqual(otherStudio.body.children.map(row => String(row.id)), [String(otherStudioChild)]);
  assert.equal(otherStudio.body.attendance.length, 1);

  await pool.query('UPDATE dance_guardian_student_links SET revoked_at=NOW(),revoked_by=$1 WHERE tenant_id=$2 AND guardian_id=$3 AND student_id=$4', [staff, firstTenant, firstGuardian, firstChild]);
  const afterChildRevocation = await get(`/api/guardian/studios/${firstTenant}/family`, firstParent);
  assert.deepEqual(afterChildRevocation.body.children, []);
  assert.deepEqual(afterChildRevocation.body.enrollments, []);
  assert.deepEqual(afterChildRevocation.body.attendance, []);
  await pool.query('UPDATE dance_guardian_accounts SET revoked_at=NOW(),revoked_by=$1 WHERE tenant_id=$2 AND guardian_id=$3 AND user_id=$4', [staff, secondTenant, otherStudioGuardian, firstParent]);
  assert.equal((await get(`/api/guardian/studios/${secondTenant}/family`, firstParent)).status, 404);
  assert.deepEqual((await get('/api/guardian/studios', firstParent)).body.studios.map(row => row.id), [firstTenant]);
});
