# Audit Apply Notes — AIDanceStudioManager

Source: `/Users/erolakarsu/projects/_AUDIT/reports/batch_02.md` (lines 745-794).

This project has 30 routes and ~20 AI endpoints (across `routes/ai.js` and
`routes/aiNew.js`), exceeding the >15-AI-endpoint threshold.

Per apply-pass policy, this pass is **backlog-only**.

## Original audit recommendations

### Existing AI features
generate, class-description, costume-brief, routine-scoring, program-content,
placement, music-suggestions, costume-design, program-book, student-placement,
plus aiNew.js endpoints: recital-program, parent-communication,
competition-strategy, recital-choreography, class-scheduling-optimizer,
student-progress-report, costume-budget-forecaster, talent-show-matcher,
multilingual-parent-portal.

### Missing AI counterparts
- `schedules.js`, `competitions.js`, `recitals.js` lack AI endpoints (note:
  `class-scheduling-optimizer`, `competition-strategy`, `recital-program`
  already exist — gap is partly satisfied).
- `music.js`, `videos.js`, `photos.js` lack AI endpoints for music curation,
  video suggestion, photo organization.

### Missing non-AI features
- Video streaming/recording integration.
- Parent portal for attendance, grades, messaging.
- Mobile app for students/teachers.
- Music licensing integration.

### Custom feature suggestions
- Predictive talent identification.
- Recital/competition optimization.
- Student progression tracking.
- Teacher workload balancing.
- Parent engagement automation.

## Implemented in this pass

None. Backlog-only.

## Backlog (prioritized)

### Mechanical, low-risk
1. `/api/ai/photo-tagging` — auto-tag photos with event/dancer/style.
2. `/api/ai/video-highlight-suggestions` — flag highlight clips from a long
   recital recording.
3. `/api/ai/teacher-workload-balance` — suggest re-assignments to balance
   teacher loads.

### Needs product decision
- Photo / video metadata schema (where to persist tags).
- Talent-identification scoring rubric.

### Needs credentials / external SDK
- Music licensing APIs (ASCAP, BMI, SoundExchange).
- Video streaming providers (Mux, Vimeo, YouTube).

### Too risky / large refactor
- Mobile app (frontend constraint).
- Streaming infrastructure for live recital broadcasts.

## Apply pass 3 (frontend)

LEFT-AS-IS. `client/src/pages/AIFeaturesPage.jsx` and `client/src/pages/AIAdvancedFeaturesPage.jsx` already wire all 19+ `/api/ai/*` endpoints (ai.js + aiNew.js). No backend pass-2 endpoints were added, so no FE delta required. Idempotent.
