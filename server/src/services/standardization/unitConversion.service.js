/**
 * Unit conversion for lab values.
 *
 * Two layers:
 *
 * 1. Canonicalization. Labs spell the same unit many ways ("cu.mm", "cumm",
 *    "mm3" and "µL" are one volume; "thou/mm3" and "10^3/µL" one count;
 *    "mcg", "ug" and "µg" one mass). Every spelling is reduced to a canonical
 *    token before anything is compared.
 *
 * 2. Families. A canonical unit belongs to a dimension (mass concentration,
 *    molar concentration, cell count, enzyme activity …) with a factor to
 *    that dimension's base, so any two units of one dimension convert by
 *    ratio. Crossing mass <-> molar needs the analyte's molar mass, and
 *    mEq <-> mmol its valence, so those take the metric's standard_key and
 *    refuse rather than guess when it is unknown.
 */

// ---------------------------------------------------------------------------
// Canonicalization
// ---------------------------------------------------------------------------

const K = 'K#'; // thousand, as a count multiplier ("10^3", "thou")
const M = 'M#'; // million ("10^6", "mill")

function canonicalUnit(unit) {
  let u = String(unit ?? '')
    .trim()
    .toLowerCase()
    .replace(/μ/g, 'µ') // Greek mu -> micro sign
    .replace(/[.\s]+$/g, '') // "mg/dL." — a trailing period from OCR
    .replace(/\s+/g, '');

  if (!u) return '';

  // Superscripts and "x10^n" notations.
  u = u
    .replace(/[×x*]?10(\^|e)?(3|³)/g, K)
    .replace(/[×x*]?10(\^|e)?(6|⁶)/g, M)
    .replace(/[×x*]?10(\^|e)?(9|⁹)\/l/g, `${K}/µl`) // 10^9/L == 10^3/µL
    .replace(/[×x*]?10(\^|e)?(12|¹²)\/l/g, `${M}/µl`) // 10^12/L == 10^6/µL
    .replace(/^(thousands?|thou)/, K)
    .replace(/^(millions?|mill|mil)/, M)
    .replace(/^(lakhs?|lacs?)/, 'lakh');

  // Volume spellings of a microlitre.
  u = u.replace(/(cu\.?mm|cumm|mm3|mm\^3|mm³|cmm)$/, 'µl');

  // Micro prefixes: mcg, ug, uIU, umol, uL -> µ… ("u/l" is units, so the
  // prefix only applies when a unit letter follows).
  u = u.replace(/(^|\/)(mc|u)(g|iu|u\/|mol|l$|l\/)/g, '$1µ$3');

  // Common synonyms.
  u = u
    .replace(/^gm/, 'g')
    .replace(/^(g|mg)%$/, '$1/dl')
    .replace(/^mm\/(h|hr|hour|1sthr|1sthour|1hr)$/, 'mm/hr')
    .replace(/^(femtolit(er|re)s?|cu\.?microns?|µ3)$/, 'fl')
    .replace(/^(picograms?|pg\/cell)$/, 'pg')
    .replace(/^(cells|cell|nos?)\/µl$/, '/µl')
    .replace(/^percent(age)?$/, '%')
    .replace(/^(kgs?|kilograms?)$/, 'kg')
    .replace(/^(lbs?|pounds?)$/, 'lb');

  return u;
}

// ---------------------------------------------------------------------------
// Families: canonical unit -> { dim, factor to the dimension's base }
// ---------------------------------------------------------------------------

const FAMILIES = {};
function family(dim, units) {
  for (const [unit, factor] of Object.entries(units)) FAMILIES[unit] = { dim, factor };
}

// Base g/L.
family('mass', {
  'g/l': 1,
  'g/dl': 10,
  'g/ml': 1000,
  'mg/ml': 1,
  'mg/dl': 0.01,
  'mg/l': 0.001,
  'µg/ml': 0.001,
  'µg/dl': 1e-5,
  'µg/l': 1e-6,
  'ng/ml': 1e-6,
  'ng/dl': 1e-8,
  'ng/l': 1e-9,
  'pg/ml': 1e-9,
});

// Base mmol/L.
family('molar', {
  'mol/l': 1000,
  'mmol/l': 1,
  'µmol/l': 1e-3,
  'nmol/l': 1e-6,
  'pmol/l': 1e-9,
});

// Base mEq/L; crosses to molar only with the analyte's valence.
family('equivalent', { 'meq/l': 1 });

// Base cells per µL.
family('count', {
  '/µl': 1,
  [`${K}/µl`]: 1e3,
  'lakh/µl': 1e5,
  [`${M}/µl`]: 1e6,
});

// Base IU/L. mIU/mL == IU/L and µIU/mL == mIU/L.
family('activity', {
  'iu/l': 1,
  'u/l': 1,
  'miu/ml': 1,
  'mu/ml': 1,
  'iu/ml': 1000,
  'u/ml': 1000,
  'miu/l': 1e-3,
  'mu/l': 1e-3,
  'µiu/ml': 1e-3,
  'µu/ml': 1e-3,
});

// Base kg.
family('weight', { kg: 1, g: 0.001, lb: 0.45359237 });

// ---------------------------------------------------------------------------
// Analyte data for crossing dimensions
// ---------------------------------------------------------------------------

/** Molar mass (g/mol) by standard_key, for mass <-> molar conversion. */
const MOLAR_MASS = {
  blood_glucose_fasting: 180.16,
  blood_glucose_pp: 180.16,
  blood_glucose_random: 180.16,
  urine_glucose: 180.16,
  cholesterol_total: 386.65,
  hdl: 386.65,
  ldl: 386.65,
  vldl: 386.65,
  non_hdl_cholesterol: 386.65,
  triglycerides: 885.7,
  creatinine: 113.12,
  urine_creatinine: 113.12,
  urea: 60.06,
  bun: 28.014, // reported as nitrogen
  uric_acid: 168.11,
  bilirubin_total: 584.66,
  bilirubin_direct: 584.66,
  bilirubin_indirect: 584.66,
  calcium: 40.078,
  calcium_ionized: 40.078,
  magnesium: 24.305,
  phosphorus: 30.974,
  sodium: 22.99,
  potassium: 39.098,
  chloride: 35.45,
  iron: 55.845,
  tibc: 55.845,
  zinc: 65.38,
  copper: 63.546,
  ammonia: 17.031,
  lactate: 90.08,
  vitamin_d: 400.64,
  vitamin_b12: 1355.37,
  folate: 441.4,
  testosterone_total: 288.42,
  testosterone_free: 288.42,
  cortisol: 362.46,
  estradiol: 272.38,
  progesterone: 314.46,
  dheas: 368.5,
  t4_total: 776.87,
  t4_free: 776.87,
  t3_total: 650.97,
  t3_free: 650.97,
  hemoglobin: 16114.5, // per haem monomer, the SI convention
};

/** Ionic charge, for mEq/L <-> mmol/L. */
const VALENCE = {
  sodium: 1,
  potassium: 1,
  chloride: 1,
  bicarbonate: 1,
  calcium: 2,
  calcium_ionized: 2,
  magnesium: 2,
};

// ---------------------------------------------------------------------------

/** Floating-point noise off, without losing clinically meaningful digits. */
function tidy(value) {
  return Number(value.toPrecision(10));
}

function convertAcrossDimensions(value, from, to, standardKey) {
  // HbA1c: NGSP % <-> IFCC mmol/mol (master equation).
  if (standardKey === 'hba1c') {
    if (from.unit === '%' && to.unit === 'mmol/mol') return (value - 2.15) * 10.929;
    if (from.unit === 'mmol/mol' && to.unit === '%') return value / 10.929 + 2.15;
  }

  if (!from.family || !to.family) return null;

  // Route through mmol/L: every cross-dimension pair is "into molar, out of molar".
  const mw = MOLAR_MASS[standardKey];
  const valence = VALENCE[standardKey];
  const base = value * from.family.factor; // in the source dimension's base

  let mmolPerL = null;
  if (from.family.dim === 'molar') mmolPerL = base;
  else if (from.family.dim === 'mass' && mw) mmolPerL = (base / mw) * 1000; // g/L -> mmol/L
  else if (from.family.dim === 'equivalent' && valence) mmolPerL = base / valence;
  if (mmolPerL == null) return null;

  let target = null;
  if (to.family.dim === 'molar') target = mmolPerL;
  else if (to.family.dim === 'mass' && mw) target = (mmolPerL / 1000) * mw; // mmol/L -> g/L
  else if (to.family.dim === 'equivalent' && valence) target = mmolPerL * valence;
  if (target == null) return null;

  return target / to.family.factor;
}

/**
 * Convert `value` from `fromUnit` to `toUnit`.
 *
 * A missing unit on either side passes the value through unchanged: most
 * dictionary rows print in the standard unit, and a unit the OCR dropped is
 * not evidence of a different one.
 *
 * @param {number} value
 * @param {string} fromUnit       - as printed on the report
 * @param {string} toUnit         - the dictionary's unit_standard
 * @param {string} [standardKey]  - needed for mass <-> molar and mEq <-> mmol
 * @returns {{ value: number, converted: boolean }} converted=false when no
 *          safe conversion exists (the value is returned unchanged)
 */
function convertUnit(value, fromUnit, toUnit, standardKey) {
  const fromCanon = canonicalUnit(fromUnit);
  const toCanon = canonicalUnit(toUnit);

  if (!fromCanon || !toCanon || fromCanon === toCanon) {
    return { value, converted: true };
  }

  const from = { unit: fromCanon, family: FAMILIES[fromCanon] };
  const to = { unit: toCanon, family: FAMILIES[toCanon] };

  if (from.family && to.family && from.family.dim === to.family.dim) {
    return { value: tidy((value * from.family.factor) / to.family.factor), converted: true };
  }

  const crossed = convertAcrossDimensions(value, from, to, standardKey);
  if (crossed != null && Number.isFinite(crossed)) return { value: tidy(crossed), converted: true };

  return { value, converted: false };
}

module.exports = { convertUnit, canonicalUnit };
