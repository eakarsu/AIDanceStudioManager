import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../utils/api';

async function guardianPost(path, body, key) {
  const response = await fetch(`/api/guardian${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
      ...(key ? { 'Idempotency-Key': key } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Guardian request failed');
  return data;
}

function when(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleDateString();
}

export default function GuardianFamilyPage() {
  const navigate = useNavigate();
  const [studios, setStudios] = useState(null);
  const [studioId, setStudioId] = useState('');
  const [family, setFamily] = useState(null);
  const [sections, setSections] = useState([]);
  const [requests, setRequests] = useState([]);
  const [childId, setChildId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [requestKey, setRequestKey] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let active = true;
    apiGet('/guardian/studios').then(data => {
      if (!active) return;
      setStudios(data.studios);
      setStudioId(current => data.studios.some(studio => studio.id === current) ? current : (data.studios[0]?.id || ''));
    }).catch(err => { if (active) setError(err.message || 'Studios unavailable'); });
    return () => { active = false; };
  }, [refresh]);

  useEffect(() => {
    if (!studioId) { setFamily(null); return; }
    let active = true;
    setFamily(null);
    setError('');
    Promise.all([
      apiGet(`/guardian/studios/${encodeURIComponent(studioId)}/family`),
      apiGet(`/guardian/studios/${encodeURIComponent(studioId)}/sections`),
      apiGet(`/guardian/studios/${encodeURIComponent(studioId)}/enrollment-requests`),
    ])
      .then(([familyData, sectionData, requestData]) => {
        if (!active) return;
        setFamily(familyData);
        setSections(sectionData.sections || []);
        setRequests(requestData.requests || []);
        setChildId(current => familyData.children.some(child => String(child.id) === current) ? current : '');
      })
      .catch(err => { if (active) setError(err.message || 'Family records unavailable'); });
    return () => { active = false; };
  }, [studioId, refresh]);

  const logout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  async function submitRequest() {
    if (!studioId || !childId || !sectionId) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await guardianPost(`/studios/${encodeURIComponent(studioId)}/enrollment-requests`,
        { studentId: Number(childId), sectionId: Number(sectionId) }, requestKey);
      setNotice('Class request sent for staff review. No payment was collected.');
      setRequestKey(crypto.randomUUID());
      setRefresh(value => value + 1);
    } catch (err) { setError(err.message || 'Could not request enrollment'); }
    finally { setBusy(false); }
  }

  async function cancelRequest(id) {
    setBusy(true); setError(''); setNotice('');
    try {
      await guardianPost(`/studios/${encodeURIComponent(studioId)}/enrollment-requests/${id}/cancel`, {});
      setNotice('Pending request cancelled.');
      setRefresh(value => value + 1);
    } catch (err) { setError(err.message || 'Could not cancel request'); }
    finally { setBusy(false); }
  }

  return <main className="main-content" style={{ maxWidth: 900, margin: '0 auto' }}>
    <div className="page-header">
      <h1>My studio family</h1>
      <p>View linked children and attendance, and request a class for studio review.</p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button className="btn btn-secondary" onClick={() => setRefresh(value => value + 1)}>Refresh</button>
        <button className="btn btn-secondary" onClick={logout}>Sign out</button>
      </div>
    </div>
    {error && <p className="login-error" role="alert">{error}</p>}
    {studios === null && !error && <p>Loading studios…</p>}
    {studios?.length === 0 && <p>No studio has linked this account to a guardian record. Ask the studio to review your access.</p>}
    {studios?.length > 0 && <>
      <label className="form-group" htmlFor="guardian-studio">Studio</label>
      <select id="guardian-studio" value={studioId} onChange={event => setStudioId(event.target.value)}>
        {studios.map(studio => <option key={studio.id} value={studio.id}>{studio.name}</option>)}
      </select>
      {!family && !error && <p>Loading family records…</p>}
      {family && <>
        <section className="card" style={{ marginTop: 20, padding: 20 }}>
          <h2>Request a class</h2>
          <p>Staff checks consent, placement, capacity and tuition before recording enrollment. This request does not take payment or reserve a place.</p>
          {family.children.length > 0 && sections.length > 0 ? <>
            <label htmlFor="request-child">Linked child</label>{' '}
            <select id="request-child" value={childId} onChange={event => { setChildId(event.target.value); setRequestKey(crypto.randomUUID()); }}>
              <option value="">Choose child</option>
              {family.children.map(child => <option key={child.id} value={child.id}>{child.external_ref}</option>)}
            </select>{' '}
            <label htmlFor="request-section">Class</label>{' '}
            <select id="request-section" value={sectionId} onChange={event => { setSectionId(event.target.value); setRequestKey(crypto.randomUUID()); }}>
              <option value="">Choose class</option>
              {sections.map(item => <option key={item.id} value={item.id}>
                {item.program_name} · starts {when(item.starts_at)} · {item.active_count}/{item.capacity} places · term price {(item.term_amount_cents / 100).toFixed(2)}
              </option>)}
            </select>{' '}
            <button className="btn btn-primary" disabled={busy || !childId || !sectionId} onClick={submitRequest}>Send request</button>
          </> : <p>No linked child or open class is available for requests.</p>}
          <h3>My class requests</h3>
          {requests.length === 0 ? <p>No requests recorded.</p> : <ul>{requests.map(item => <li key={item.id}>
            {item.program_name} · child {family.children.find(child => String(child.id) === String(item.student_id))?.external_ref || item.student_id} · {item.status}
            {item.review_reason ? ` · ${item.review_reason}` : ''}
            {item.enrollment_id ? ` · enrollment #${item.enrollment_id}` : ''}
            {item.status === 'pending' && <button className="btn btn-secondary" disabled={busy} onClick={() => cancelRequest(item.id)}>Cancel</button>}
          </li>)}</ul>}
        </section>
        {family.children.length === 0 && <p>No children have been linked to this guardian record.</p>}
        {family.children.map(child => {
          const enrollments = family.enrollments.filter(item => String(item.student_id) === String(child.id));
          const attendance = family.attendance.filter(item => String(item.student_id) === String(child.id));
          return <section key={child.id} className="card" style={{ marginTop: 20, padding: 20 }}>
            <h2>{child.external_ref}</h2>
            <h3>Enrollments</h3>
            {enrollments.length === 0 ? <p>No enrollment recorded.</p> : <ul>
              {enrollments.map(item => <li key={item.id}>
                {item.program_name} · {item.status} · term {when(item.term_starts_at)} to {when(item.term_ends_at)}
                {item.waitlist_position ? ` · waitlist position ${item.waitlist_position}` : ''}
              </li>)}
            </ul>}
            <h3>Attendance</h3>
            {attendance.length === 0 ? <p>No attendance recorded.</p> : <ul>
              {attendance.map(item => <li key={item.id}>{when(item.session_at)} · {item.program_name} · {item.status}</li>)}
            </ul>}
          </section>;
        })}
        {Object.values(family.more).some(Boolean) && <p>Some older records are not shown here. Ask the studio for a complete history.</p>}
      </>}
    </>}
    {notice && <p role="status">{notice}</p>}
  </main>;
}
