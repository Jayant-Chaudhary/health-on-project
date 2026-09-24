const { convertUnit } = require('../../services/standardization/unitConversion.service');

describe('Unit Conversion Service', () => {
  // 1. The Happy Path (Standard Conversions)
  it('should convert g/l to g/dl correctly', () => {
    const result = convertUnit(10, 'g/l', 'g/dl');
    expect(result.converted).toBe(true);
    expect(result.value).toBe(1); // 10 / 10
  });

  it('should convert mg/dl to mmol/l correctly', () => {
    const result = convertUnit(180, 'mg/dl', 'mmol/l');
    expect(result.converted).toBe(true);
    expect(result.value).toBe(10); // 180 / 18
  });

  // 2. Edge Cases (Identical units, whitespace, case)
  it('should return the original value if units are identical', () => {
    const result = convertUnit(10, 'kg', 'kg');
    expect(result.converted).toBe(true);
    expect(result.value).toBe(10);
  });

  it('should handle case insensitivity and whitespace', () => {
    const result = convertUnit(10, ' G/L ', 'G/DL');
    expect(result.converted).toBe(true);
    expect(result.value).toBe(1);
  });

  it('should handle missing or null units gracefully', () => {
    const result = convertUnit(10, null, 'g/dl');
    expect(result.converted).toBe(true);
    expect(result.value).toBe(10); // Returns original because !from
  });

  // 3. Failure Path (Unknown conversions)
  it('should return converted: false for unsupported conversion paths', () => {
    const result = convertUnit(10, 'kg', 'mg');
    expect(result.converted).toBe(false);
    expect(result.value).toBe(10); // Returns original value, but flagged as not converted
  });
});
