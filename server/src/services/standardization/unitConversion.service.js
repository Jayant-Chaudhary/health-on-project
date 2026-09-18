const CONVERSIONS = {
  'g/l': { 'g/dl': (v) => v / 10 },
  'g/dl': { 'g/l': (v) => v * 10 },
  kg: { lb: (v) => v * 2.20462 },
  lb: { kg: (v) => v / 2.20462 },
  'mg/dl': { 'mmol/l': (v) => v / 18 },
  'mmol/l': { 'mg/dl': (v) => v * 18 },
};

function normalizeUnit(unit) {
  return (unit || '').trim().toLowerCase();
}

function convertUnit(value, fromUnit, toUnit) {
  const from = normalizeUnit(fromUnit);
  const to = normalizeUnit(toUnit);

  if (!from || !to || from === to) {
    return { value, converted: true };
  }

  const table = CONVERSIONS[from];
  const fn = table && table[to];

  if (!fn) {
    return { value, converted: false };
  }

  return { value: fn(value), converted: true };
}

module.exports = { convertUnit };
