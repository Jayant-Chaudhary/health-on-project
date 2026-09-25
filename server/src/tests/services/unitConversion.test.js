const { convertUnit } = require('../../services/standardization/unitConversion.service');

describe('convertUnit', () => {
  // --- Passthrough cases ---

  describe('same unit (from === to)', () => {
    it('returns the original value with converted: true', () => {
      expect(convertUnit(12, 'g/dl', 'g/dl')).toEqual({ value: 12, converted: true });
    });

    it('is case-insensitive when both sides normalise to the same unit', () => {
      expect(convertUnit(5, 'G/DL', 'g/dl')).toEqual({ value: 5, converted: true });
    });

    it('treats null fromUnit as missing and passes through', () => {
      expect(convertUnit(10, null, 'g/dl')).toEqual({ value: 10, converted: true });
    });

    it('treats null toUnit as missing and passes through', () => {
      expect(convertUnit(10, 'g/dl', null)).toEqual({ value: 10, converted: true });
    });

    it('treats empty-string fromUnit as missing and passes through', () => {
      expect(convertUnit(10, '', 'g/dl')).toEqual({ value: 10, converted: true });
    });

    it('treats empty-string toUnit as missing and passes through', () => {
      expect(convertUnit(10, 'g/dl', '')).toEqual({ value: 10, converted: true });
    });

    it('treats undefined fromUnit as missing and passes through', () => {
      expect(convertUnit(10, undefined, 'g/dl')).toEqual({ value: 10, converted: true });
    });
  });

  // --- Known conversion pairs ---

  describe('g/l <-> g/dl', () => {
    it('converts g/l to g/dl by dividing by 10', () => {
      const result = convertUnit(10, 'g/l', 'g/dl');
      expect(result.converted).toBe(true);
      expect(result.value).toBeCloseTo(1, 5);
    });

    it('converts g/dl to g/l by multiplying by 10', () => {
      const result = convertUnit(1, 'g/dl', 'g/l');
      expect(result.converted).toBe(true);
      expect(result.value).toBeCloseTo(10, 5);
    });
  });

  describe('mg/dl <-> mmol/l (per analyte)', () => {
    it('converts glucose mg/dl to mmol/l using its molar mass', () => {
      const result = convertUnit(180.16, 'mg/dl', 'mmol/l', 'blood_glucose_fasting');
      expect(result.converted).toBe(true);
      expect(result.value).toBeCloseTo(10, 5);
    });

    it('converts glucose mmol/l to mg/dl', () => {
      const result = convertUnit(5.5, 'mmol/l', 'mg/dl', 'blood_glucose_fasting');
      expect(result.converted).toBe(true);
      expect(result.value).toBeCloseTo(99.09, 2);
    });

    it("uses cholesterol's own factor, not glucose's", () => {
      const result = convertUnit(5, 'mmol/L', 'mg/dL', 'cholesterol_total');
      expect(result.converted).toBe(true);
      expect(result.value).toBeCloseTo(193.3, 1);
    });

    it('converts creatinine µmol/L to mg/dL', () => {
      const result = convertUnit(88.4, 'µmol/L', 'mg/dL', 'creatinine');
      expect(result.value).toBeCloseTo(1, 3);
    });

    it('refuses mass <-> molar without an analyte rather than guess', () => {
      expect(convertUnit(180, 'mg/dl', 'mmol/l')).toEqual({ value: 180, converted: false });
      expect(convertUnit(40, 'U/L', 'mmol/l', 'alt')).toEqual({ value: 40, converted: false });
    });

    it('converts mEq/L through the analyte valence', () => {
      expect(convertUnit(140, 'mEq/L', 'mmol/L', 'sodium').value).toBeCloseTo(140, 5);
      expect(convertUnit(5, 'mEq/L', 'mg/dL', 'calcium').value).toBeCloseTo(10.02, 2);
    });
  });

  describe('lab unit spellings', () => {
    it.each([
      ['lakh/cu.mm', '10^3/µL', 2.5, 250],
      ['mill/cumm', '10^6/µL', 4.8, 4.8],
      ['thou/mm3', '10^3/µL', 7.2, 7.2],
      ['cells/cumm', '10^3/µL', 7200, 7.2],
      ['x10^9/L', '10^3/µL', 7.2, 7.2],
      ['mg/dL.', 'mg/dL', 1.1, 1.1],
      ['mcg/dL', 'µg/dL', 80, 80],
      ['ug/dl', 'µg/dL', 80, 80],
      ['uIU/ml', 'µIU/mL', 2.1, 2.1],
      ['mIU/L', 'µIU/mL', 2.1, 2.1],
      ['IU/L', 'U/L', 30, 30],
      ['gm%', 'g/dL', 13.5, 13.5],
      ['mm/1st hr', 'mm/hr', 12, 12],
      ['mg/L', 'mg/dL', 10, 1],
    ])('%s -> %s', (from, to, value, expected) => {
      const result = convertUnit(value, from, to);
      expect(result.converted).toBe(true);
      expect(result.value).toBeCloseTo(expected, 6);
    });

    it('converts HbA1c between IFCC mmol/mol and NGSP %', () => {
      expect(convertUnit(48, 'mmol/mol', '%', 'hba1c').value).toBeCloseTo(6.54, 2);
      expect(convertUnit(6.5, '%', 'mmol/mol', 'hba1c').value).toBeCloseTo(47.5, 1);
    });
  });

  describe('kg <-> lb', () => {
    it('converts kg to lb', () => {
      const result = convertUnit(1, 'kg', 'lb');
      expect(result.converted).toBe(true);
      expect(result.value).toBeCloseTo(2.20462, 4);
    });

    it('converts lb to kg', () => {
      const result = convertUnit(2.20462, 'lb', 'kg');
      expect(result.converted).toBe(true);
      expect(result.value).toBeCloseTo(1, 4);
    });
  });

  // --- Unknown / unsupported pair ---

  describe('unsupported pair', () => {
    it('returns the original value with converted: false', () => {
      expect(convertUnit(100, 'mg/dl', 'kg')).toEqual({ value: 100, converted: false });
    });

    it('returns converted: false for completely unknown units', () => {
      expect(convertUnit(42, 'furlongs', 'fathoms')).toEqual({ value: 42, converted: false });
    });

    it('returns converted: false when only fromUnit is unknown', () => {
      expect(convertUnit(5, 'unknown_unit', 'g/dl')).toEqual({ value: 5, converted: false });
    });
  });

  // --- Case-insensitive normalisation ---

  describe('case-insensitive unit normalisation', () => {
    it('treats MG/DL and mg/dl as the same source unit', () => {
      const result = convertUnit(180.16, 'MG/DL', 'mmol/l', 'blood_glucose_fasting');
      expect(result.converted).toBe(true);
      expect(result.value).toBeCloseTo(10, 5);
    });

    it('treats MMOL/L and mmol/l as the same source unit', () => {
      const result = convertUnit(5, 'MMOL/L', 'mg/dl', 'blood_glucose_fasting');
      expect(result.converted).toBe(true);
      expect(result.value).toBeCloseTo(90.08, 5);
    });

    it('trims whitespace from unit strings before matching', () => {
      const result = convertUnit(10, '  g/l  ', 'g/dl');
      expect(result.converted).toBe(true);
      expect(result.value).toBeCloseTo(1, 5);
    });
  });
});
