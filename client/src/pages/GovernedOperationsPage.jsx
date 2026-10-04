import React, { useEffect, useRef, useState } from 'react';
import { apiGet } from '../utils/api';

async function governedPost(path, body) {
  const response = await fetch(`/api/governed-operations${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
      'Idempotency-Key': crypto.randomUUID(),
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Governed operation failed');
  return data;
}

function placement(section, student, guardianId, overview) {
  if (!student) return { status: 'select a student', ready: false };
  if (student.is_minor) {
    const hasConsent = overview.consents.some(consent =>
      Number(consent.student_id) === Number(student.id) &&
      Number(consent.guardian_id) === Number(guardianId) &&
      consent.purpose === 'program_participation' && consent.status === 'granted' &&
      new Date(consent.granted_at) <= new Date() && new Date(consent.expires_at) > new Date());
    if (!hasConsent) return { status: 'guardian participation consent required', ready: false };
  }
  const occupied = overview.enrollments.filter(item => Number(item.student_id) === Number(student.id) && item.status === 'active');
  const conflict = occupied.some(item => {
    const other = overview.sections.find(candidate => Number(candidate.id) === Number(item.section_id));
    return other && new Date(other.starts_at) < new Date(section.ends_at) && new Date(other.ends_at) > new Date(section.starts_at);
  });
  if (conflict) return { status: 'schedule conflict', ready: false };
  if (Number(section.active_count) >= Number(section.capacity)) return { status: 'waitlist candidate', ready: true };
  return { status: 'open place', ready: true };
}

export default function GovernedOperationsPage() {
  const [tenants, setTenants] = useState([]);
  const [tenantId, setTenantId] = useState('');
  const [overview, setOverview] = useState(null);
  const [guardianRequests, setGuardianRequests] = useState([]);
  const [verifiedRequests, setVerifiedRequests] = useState({});
  const [declineReasons, setDeclineReasons] = useState({});
  const [studentId, setStudentId] = useState('');
  const [guardianId, setGuardianId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [enrollmentId, setEnrollmentId] = useState('');
  const [attendanceStatus, setAttendanceStatus] = useState('present');
  const [sessionAt, setSessionAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const selectedTenant = useRef('');
  const refreshNumber = useRef(0);
  useEffect(() => {
    apiGet('/governed-operations/tenants').then(rows => {
      setTenants(Array.isArray(rows) ? rows : []);
      if (rows[0]) setTenantId(rows[0].id);
    }).catch(e => setError(e.message));
  }, []);
  async function refresh(requestedTenant = tenantId) {
    if (!requestedTenant || requestedTenant !== selectedTenant.current) return;
    const number = ++refreshNumber.current;
    try {
      const nextOverview = await apiGet(`/governed-operations/tenants/${requestedTenant}/overview`);
      if (number !== refreshNumber.current || requestedTenant !== selectedTenant.current) return;
      setOverview(nextOverview);
      if (['registrar', 'manager', 'admin'].includes(nextOverview.role)) {
        const data = await apiGet(`/governed-operations/tenants/${requestedTenant}/enrollment-requests`);
        if (number !== refreshNumber.current || requestedTenant !== selectedTenant.current) return;
        setGuardianRequests(data.requests || []);
      } else setGuardianRequests([]);
      setError('');
    }
    catch (e) { if (number === refreshNumber.current && requestedTenant === selectedTenant.current) setError(e.message); }
  }
  useEffect(() => {
    selectedTenant.current = tenantId;
    refreshNumber.current++;
    setOverview(null);
    setGuardianRequests([]);
    if (tenantId) void refresh(tenantId);
  }, [tenantId]);
  async function mutate(work, success) {
    setBusy(true); setError(''); setNotice('');
    try { await work(); setNotice(success); await refresh(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  const student = overview?.students.find(item => String(item.id) === studentId);
  const section = overview?.sections.find(item => String(item.id) === sectionId);
  const selectedPlacement = section && overview ? placement(section, student, guardianId, overview) : null;
  return <div>
    <div className="page-header"><h1>Governed studio operations</h1><p>Enrollment and attendance on the tenant scoped workflow.</p></div>
    <p>Placement prompts use recorded consent, capacity and schedule. Age and skill are unavailable in this workflow, so staff must verify those before offering a class. Payment entries below are records, not confirmed processor settlements.</p>
    {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}
    {notice && <p role="status">{notice}</p>}
    <label>Studio tenant <select value={tenantId} onChange={e => {
      selectedTenant.current = e.target.value;
      refreshNumber.current++;
      setOverview(null);
      setGuardianRequests([]);
      setTenantId(e.target.value);
    }}>
      {tenants.map(item => <option key={item.id} value={item.id}>{item.name} ({item.role})</option>)}
    </select></label>
    <button onClick={() => void refresh()} disabled={!tenantId}>Refresh</button>
    {overview && <>
      {['registrar', 'manager', 'admin'].includes(overview.role) && <>
        <h2>Guardian class requests</h2>
        <p>Confirm age and skill suitability from studio records before accepting. The server rechecks guardian links, consent, schedule and capacity. Payment is unverified.</p>
        {guardianRequests.length === 0 ? <p>No guardian requests recorded.</p> : <ul>{guardianRequests.map(item => <li key={item.id}>
          #{item.id} · {item.student_ref} · {item.program_name} · guardian {item.guardian_ref} · {item.status}
          {item.enrollment_id ? ` · enrollment #${item.enrollment_id}` : ''}
          {item.review_reason ? ` · ${item.review_reason}` : ''}
          {item.status === 'pending' && <div>
            <label><input type="checkbox" checked={!!verifiedRequests[item.id]}
              onChange={event => setVerifiedRequests(current => ({ ...current, [item.id]: event.target.checked }))} />
              I verified age and skill suitability</label>{' '}
            <button disabled={busy || !verifiedRequests[item.id]} onClick={() => mutate(
              () => governedPost(`/tenants/${tenantId}/enrollment-requests/${item.id}/decision`,
                { decision: 'accept', ageSkillVerified: true }),
              'Guardian request reviewed; placement and tuition recorded. Payment remains unverified.')}>Accept and place</button>{' '}
            <label>Decline reason <input value={declineReasons[item.id] || ''}
              onChange={event => setDeclineReasons(current => ({ ...current, [item.id]: event.target.value }))} /></label>{' '}
            <button disabled={busy || !String(declineReasons[item.id] || '').trim()} onClick={() => mutate(
              () => governedPost(`/tenants/${tenantId}/enrollment-requests/${item.id}/decision`,
                { decision: 'decline', reason: declineReasons[item.id] }),
              'Guardian request declined with a recorded reason.')}>Decline</button>
          </div>}
        </li>)}</ul>}
      </>}
      <h2>Class placement review</h2>
      <label>Student <select value={studentId} onChange={e => setStudentId(e.target.value)}>
        <option value="">Choose student</option>{overview.students.map(item => <option key={item.id} value={item.id}>{item.external_ref} {item.is_minor ? '(minor)' : ''}</option>)}
      </select></label>
      {student?.is_minor && <label>Guardian <select value={guardianId} onChange={e => setGuardianId(e.target.value)}>
        <option value="">Choose guardian</option>{overview.guardians.map(item => <option key={item.id} value={item.id}>{item.external_ref}</option>)}
      </select></label>}
      <ul>{overview.sections.map(item => {
        const decision = placement(item, student, guardianId, overview);
        return <li key={item.id}>
          <button type="button" onClick={() => setSectionId(String(item.id))}>{item.program_name}</button>
          {' · '}{new Date(item.starts_at).toLocaleString()} · {item.active_count}/{item.capacity} places · {item.waitlist_count} waiting · {decision.status}
        </li>;
      })}</ul>
      {section && <div>
        <p>Selected: {section.program_name} · {selectedPlacement?.status}. The server will recheck consent, conflicts and capacity when recording enrollment.</p>
        <button disabled={busy || !selectedPlacement?.ready || !studentId}
          onClick={() => mutate(async () => {
            await governedPost('/enrollments', {
              tenantId, studentId: Number(studentId), guardianId: guardianId ? Number(guardianId) : null,
              sectionId: section.id, enrollmentDate: new Date().toISOString(),
            });
          }, 'Enrollment request recorded.')}>Request enrollment</button>
      </div>}
      <h2>Enrollment and waitlist</h2>
      <ul>{overview.enrollments.map(item => <li key={item.id}>#{item.id} · student {item.student_id} · section {item.section_id} · {item.status}
        {item.waitlist_position ? ` · waitlist #${item.waitlist_position}` : ''} · tuition {(item.tuition_cents / 100).toFixed(2)} {item.status_reason || ''}
      </li>)}</ul>
      <h2>Record staff attendance</h2>
      <label>Active enrollment <select value={enrollmentId} onChange={e => setEnrollmentId(e.target.value)}>
        <option value="">Choose enrollment</option>{overview.enrollments.filter(item => item.status === 'active').map(item =>
          <option key={item.id} value={item.id}>#{item.id} · student {item.student_id} · section {item.section_id}</option>)}
      </select></label>
      <label>Session time <input type="datetime-local" value={sessionAt} onChange={e => setSessionAt(e.target.value)} /></label>
      <label>Status <select value={attendanceStatus} onChange={e => setAttendanceStatus(e.target.value)}>
        {['present','absent','late','excused','makeup'].map(status => <option key={status}>{status}</option>)}
      </select></label>
      <button disabled={busy || !enrollmentId || !sessionAt} onClick={() => mutate(async () => {
        await governedPost('/attendance', {
          tenantId, enrollmentId: Number(enrollmentId), sessionAt: new Date(sessionAt).toISOString(),
          status: attendanceStatus, source: 'staff_ui',
        });
      }, 'Attendance event recorded.')}>Record attendance</button>
      <ul>{overview.attendance.map(item => <li key={item.id}>Enrollment #{item.enrollment_id} · {new Date(item.session_at).toLocaleString()} · {item.status}</li>)}</ul>
      <h2>Ledger and reconciliation status</h2>
      <ul>{overview.ledger.map(item => <li key={item.id}>#{item.id} {item.entry_type} · {(item.amount_cents / 100).toFixed(2)} {item.currency} · {item.reconciled_at ? 'reconciled' : 'unreconciled'} · policy {item.policy_version}</li>)}</ul>
      {overview.ledger.length === 0 && <p>No ledger entries in this tenant.</p>}
    </>}
  </div>;
}
