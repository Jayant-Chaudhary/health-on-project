/**
 * Re-runs standardization over lab values already in the database.
 *
 * A metric is matched, converted and flagged once, when its report is
 * uploaded. After the metric dictionary, the unit converter or the review
 * rules change, older rows keep their old answer — an unmatched name stays
 * unmatched and a stale review flag stays up. This recomputes standard_key,
 * parsed_value, unit_standard and needs_review from each row's raw reading.
 *
 * Rows a clinician has already reviewed (reviewed_value set) are skipped:
 * a human answer outranks a recomputed one.
 *
 *   node scripts/restandardizeMetrics.js            # dry run: show what would change
 *   node scripts/restandardizeMetrics.js --apply    # write the changes
 */
const supabaseAdmin = require('../src/config/supabaseAdminClient');
const { standardizeMetrics } = require('../src/services/standardization/standardizeLabReport.service');

const FIELDS = ['standard_key', 'parsed_value', 'unit_standard', 'needs_review'];
const PAGE = 1000;

async function loadUnreviewedMetrics() {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabaseAdmin
      .from('lab_report_metrics')
      .select('id, raw_key, raw_value, unit_raw, confidence_score, standard_key, parsed_value, unit_standard, needs_review')
      .is('reviewed_value', null)
      .order('created_at', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < PAGE) return rows;
  }
}

function sameValue(a, b) {
  if (a == null || b == null) return a == null && b == null;
  if (typeof a === 'number' || typeof b === 'number') return Math.abs(Number(a) - Number(b)) < 1e-9;
  return a === b;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const rows = await loadUnreviewedMetrics();

  const recomputed = await standardizeMetrics(
    rows.map((row) => ({
      key: row.raw_key,
      value: row.raw_value,
      unit: row.unit_raw,
      confidence: row.confidence_score == null ? undefined : Number(row.confidence_score),
    }))
  );

  const changes = [];
  rows.forEach((row, i) => {
    const next = recomputed[i];
    const diff = Object.fromEntries(FIELDS.filter((f) => !sameValue(row[f], next[f])).map((f) => [f, next[f]]));
    if (Object.keys(diff).length > 0) changes.push({ row, diff });
  });

  for (const { row, diff } of changes) {
    const parts = Object.entries(diff).map(([field, value]) => `${field}: ${JSON.stringify(row[field])} -> ${JSON.stringify(value)}`);
    console.log(`${row.raw_key} = ${row.raw_value} ${row.unit_raw ?? ''}\n    ${parts.join('\n    ')}`);
  }

  const stillFlagged = recomputed.filter((m) => m.needs_review).length;
  console.log(
    `\n${rows.length} unreviewed metrics checked, ${changes.length} would change, ${stillFlagged} still need review.`
  );

  if (!apply) {
    if (changes.length) console.log('Dry run. Re-run with --apply to write these changes.');
    return 0;
  }

  let failed = 0;
  for (const { row, diff } of changes) {
    const { error } = await supabaseAdmin.from('lab_report_metrics').update(diff).eq('id', row.id);
    if (error) {
      failed += 1;
      console.error(`Could not update ${row.id} (${row.raw_key}): ${error.message}`);
    }
  }
  console.log(`Updated ${changes.length - failed} of ${changes.length} metrics.`);
  return failed ? 1 : 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error('Failed:', err.message || err);
    process.exit(1);
  });
