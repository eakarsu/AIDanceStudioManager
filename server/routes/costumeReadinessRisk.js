const express = require('express');

const router = express.Router();

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

router.post('/score', (req, res) => {
  const {
    dancerCount = 0,
    missingCostumes = 0,
    alterationTickets = 0,
    recitalDays = 30,
    measurementAgeDays = 0,
    vendorDelayDays = 0,
  } = req.body || {};

  const dancers = Math.max(1, Number(dancerCount) || 1);
  const missingRate = (Number(missingCostumes) || 0) / dancers;
  const alterationRate = (Number(alterationTickets) || 0) / dancers;
  const deadlinePressure = clamp((21 - (Number(recitalDays) || 0)) / 21, 0, 1);
  const staleMeasurements = clamp(((Number(measurementAgeDays) || 0) - 60) / 90, 0, 1);
  const vendorDelay = clamp((Number(vendorDelayDays) || 0) / 14, 0, 1);

  const score = Math.round(clamp(
    (missingRate * 38) + (alterationRate * 24) + (deadlinePressure * 18) +
      (staleMeasurements * 12) + (vendorDelay * 8),
    0,
    100
  ));

  const level = score >= 70 ? 'critical' : score >= 40 ? 'watch' : 'ready';
  const actions = [
    missingRate > 0.15 && 'Prioritize missing costume orders by recital lineup order.',
    alterationRate > 0.2 && 'Schedule alteration blocks before next full cast rehearsal.',
    staleMeasurements > 0 && 'Refresh measurements for dancers with data older than 60 days.',
    vendorDelay > 0.4 && 'Escalate delayed vendor SKUs and identify loaner inventory.',
  ].filter(Boolean);

  res.json({
    feature: 'costume_readiness_risk',
    score,
    level,
    factors: { missingRate, alterationRate, deadlinePressure, staleMeasurements, vendorDelay },
    actions: actions.length ? actions : ['Keep current costume checkpoint cadence.'],
  });
});

module.exports = router;
