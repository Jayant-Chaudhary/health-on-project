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

  describe('mg/dl <-> mmol/l', () => {
    it('converts mg/dl to mmol/l by dividing by 18', () => {
      const result = convertUnit(180, 'mg/dl', 'mmol/l');
      expect(result.converted).toBe(true);
      expect(result.value).toBeCloseTo(10, 5);
    });

    it('converts mmol/l to mg/dl by multiplying by 18', () => {
      const result = convertUnit(5, 'mmol/l', 'mg/dl');
      expect(result.converted).toBe(true);
      expect(result.value).toBeCloseTo(90, 5);
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
      const result = convertUnit(180, 'MG/DL', 'mmol/l');
      expect(result.converted).toBe(true);
      expect(result.value).toBeCloseTo(10, 5);
    });

    it('treats MMOL/L and mmol/l as the same source unit', () => {
      const result = convertUnit(5, 'MMOL/L', 'mg/dl');
      expect(result.converted).toBe(true);
      expect(result.value).toBeCloseTo(90, 5);
    });

    it('trims whitespace from unit strings before matching', () => {
      const result = convertUnit(10, '  g/l  ', 'g/dl');
      expect(result.converted).toBe(true);
      expect(result.value).toBeCloseTo(1, 5);
    });
  });
});
