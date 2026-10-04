'use strict';const express=require('express');const pool=require('../db');const auth=require('../middleware/auth');const {assertEnrollmentTransition}=require('../domain/studioPolicy');const router=express.Router();router.use(auth);
async function membership(client,tenantId,userId){const found=await client.query('SELECT role FROM dance_tenant_memberships WHERE tenant_id=$1 AND user_id=$2 AND active=true',[tenantId,userId]);if(!found.rows[0]){const error=new Error('studio membership required');error.status=403;throw error;}return found.rows[0].role;}
async function verifyTransitionEvidence(client,tenantId,enrollmentId,to,context){
  if(to==='dropped'){
    const ledgerId=Number(context.ledgerAdjustmentId);
    if(!Number.isSafeInteger(ledgerId)||ledgerId<=0)throw new Error('drop requires a persisted ledger adjustment id');
    const entry=(await client.query(`SELECT id,entry_type,policy_version FROM dance_ledger_entries WHERE id=$1 AND tenant_id=$2 AND entry_type IN ('refund','credit','proration') AND (enrollment_id=$3 OR enrollment_id IS NULL)`,[ledgerId,tenantId,enrollmentId])).rows[0];
    if(!entry)throw new Error('ledger adjustment not found for this tenant/enrollment');
    if(String(context.refundPolicyVersion)!==String(entry.policy_version))throw new Error('refundPolicyVersion does not match the stored ledger adjustment');
  }
  if(to==='completed'){
    const attendance=(await client.query('SELECT COUNT(*)::int AS n FROM dance_attendance_events WHERE enrollment_id=$1 AND tenant_id=$2',[enrollmentId,tenantId])).rows[0];
    if(!attendance||attendance.n<1)throw new Error('completion requires recorded attendance events for this enrollment');
  }
}
async function compactWaitlistPositions(client,sectionId){
  await client.query(`UPDATE dance_enrollments SET waitlist_position=waitlist_position+1000000 WHERE section_id=$1 AND status='waitlisted'`,[sectionId]);
  await client.query(`UPDATE dance_enrollments e SET waitlist_position=sub.rn FROM (SELECT id,ROW_NUMBER() OVER (ORDER BY waitlist_position,id) AS rn FROM dance_enrollments WHERE section_id=$1 AND status='waitlisted') sub WHERE e.id=sub.id AND e.waitlist_position IS DISTINCT FROM sub.rn`,[sectionId]);
}
router.post('/enrollments', require('./directEnrollment'));
router.post('/enrollments/:id/transition',async(req,res)=>{let client;try{client=await pool.connect();await client.query('BEGIN');const found=await client.query('SELECT * FROM dance_enrollments WHERE id=$1 FOR UPDATE',[req.params.id]);if(!found.rows[0]){const error=new Error('enrollment not found');error.status=404;throw error;}const record=found.rows[0];const role=await membership(client,record.tenant_id,req.user.id);const context=req.body.context||{};assertEnrollmentTransition(record.status,req.body.to,role,context);await verifyTransitionEvidence(client,record.tenant_id,record.id,req.body.to,context);const updated=await client.query('UPDATE dance_enrollments SET status=$1,version=version+1,updated_at=NOW()WHERE id=$2 AND version=$3 RETURNING *',[req.body.to,record.id,req.body.expectedVersion]);if(!updated.rows[0]){const error=new Error('version conflict');error.status=409;throw error;}if(record.status==='waitlisted'&&req.body.to!=='waitlisted'){await compactWaitlistPositions(client,record.section_id);}await client.query(`INSERT INTO dance_audit_events(tenant_id,aggregate_type,aggregate_id,actor_id,action,payload)VALUES($1,'enrollment',$2,$3,$4,$5)`,[record.tenant_id,record.id,req.user.id,`enrollment.${req.body.to}`,context]);await client.query('COMMIT');res.json(updated.rows[0]);}catch(error){if(client)await client.query('ROLLBACK');res.status(error.status||422).json({error:error.message});}finally{client?.release();}});
module.exports=router;
