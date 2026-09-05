const test=require('node:test'),assert=require('node:assert/strict'),p=require('../domain/studioPolicy');
test('missing age/capacity cannot activate an enrollment',()=>{assert.throws(()=>p.enrollmentDecision({studentId:1,sectionId:2}));assert.throws(()=>p.enrollmentDecision({studentId:1,sectionId:2,studentAge:20,enrolled:0,capacity:null}));});
test('malformed or absent consent dates are rejected',()=>{for(const expiresAt of [null,undefined,'not-a-date'])assert.throws(()=>p.assertConsent({status:'granted',purpose:'media',grantedAt:'2026-01-01',expiresAt},'media'));});
test('nonrefundable component cannot exceed paid money',()=>assert.throws(()=>p.refundCents(100,0,10,101)));
