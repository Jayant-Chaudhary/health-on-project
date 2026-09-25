-- ============================================================
-- Written-answer questions.
--
-- Pre-visit questions were yes/no only. A doctor can now also ask a
-- question the patient answers in their own words ("What medicines are
-- you taking?"). The question's response_type says which, and the answer
-- lands in `answer` (yes/no) or `answer_text` (written) accordingly.
-- ============================================================

alter type questionnaire_response_type add value if not exists 'text';

alter table questionnaire_responses
  add column if not exists answer_text text;

-- A written answer has no yes/no, so `answer` can no longer be required.
alter table questionnaire_responses
  alter column answer drop not null;

-- Every response carries exactly one kind of answer.
alter table questionnaire_responses
  drop constraint if exists questionnaire_responses_one_answer;

alter table questionnaire_responses
  add constraint questionnaire_responses_one_answer
  check ((answer is not null) <> (answer_text is not null));
