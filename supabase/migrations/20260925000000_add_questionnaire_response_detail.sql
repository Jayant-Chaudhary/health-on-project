-- ============================================================
-- Free-text detail on a questionnaire answer.
--
-- The check-in asks "Please provide a few details" whenever a patient
-- answers Yes, and the clinician's questionnaire panel already renders
-- that text — but there was no column to keep it in, so it was dropped
-- on submit.
-- ============================================================

alter table questionnaire_responses
  add column if not exists detail text;
