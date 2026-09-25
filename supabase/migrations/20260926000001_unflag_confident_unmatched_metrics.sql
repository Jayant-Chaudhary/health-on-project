-- Metrics whose name was not in metric_dictionary used to be flagged for
-- review regardless of how confidently they were read. They are now flagged
-- only when the value itself is doubtful, so clear the flag on existing rows
-- that would not be flagged today: unmatched, not yet reviewed, a plain
-- numeric reading (not a bound like "<0.5"), and OCR confidence >= 0.85
-- (OCR_CONFIDENCE_REVIEW_THRESHOLD).

update lab_report_metrics
set needs_review = false
where needs_review = true
  and standard_key is null
  and reviewed_value is null
  and parsed_value is not null
  and confidence_score is not null
  and confidence_score >= 0.85
  and coalesce(raw_value, '') !~ '^\s*[<>≤≥]';
