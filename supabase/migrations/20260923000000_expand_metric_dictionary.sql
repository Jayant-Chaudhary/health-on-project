-- ============================================================
-- Expand metric_dictionary: PCOS/fertility, thyroid, CBC,
-- nutrients, proteins, liver, kidney, lipids and vitals.
--
-- Why this file exists
-- --------------------
-- standardizeLabReport.service.js matches a report's printed test name
-- against these aliases in two passes: exact equality after normalizeKey()
-- lowercases and strips every non-alphanumeric character, then an
-- order-insensitive pass that sorts the words before comparing. So:
--
--   * Punctuation variants are redundant. "Testosterone, Total" and
--     "Testosterone Total" both normalize to "testosteronetotal".
--   * Word-order variants are redundant too, since the second pass sorts
--     the words. "Glucose Fasting" finds the alias "Fasting Glucose" on its
--     own. Both are still listed where labs commonly print both, so the
--     exact pass resolves them without falling through.
--   * QUALIFIER SPELLINGS ARE NOT REDUNDANT. Sorting does not remove words,
--     so a report printing "TSH, Ultrasensitive" will never reach the alias
--     "TSH" — the qualified spelling has to be listed. This is deliberate:
--     stripping qualifiers would collapse "Testosterone, Total" onto
--     "Testosterone, Free", which are different analytes.
--
-- A spelling that two different metrics share is dropped from the
-- order-insensitive index rather than resolved arbitrarily, so adding an
-- alias can never silently steal another metric's values.
--
-- unit_standard must match what the labs actually print. convertUnit()
-- knows only a handful of conversions and flags needs_review on anything
-- it cannot convert, so a cosmetic unit difference costs a review card.
-- The micro sign below is U+00B5 (the character Indian lab PDFs emit),
-- not Greek mu U+03BC.
--
-- Idempotent: re-running updates the existing rows in place.
-- ============================================================

insert into metric_dictionary (standard_key, display_name, category, unit_standard, aliases) values
  ('fsh', 'Follicle Stimulating Hormone (FSH)', 'hormone', 'mIU/mL', ARRAY['FSH', 'Follicle Stimulating Hormone', 'Follicle-Stimulating Hormone', 'Serum FSH', 'FSH Serum', 'Follitropin']),
  ('lh', 'Luteinizing Hormone (LH)', 'hormone', 'mIU/mL', ARRAY['LH', 'Luteinizing Hormone', 'Luteinising Hormone', 'Serum LH', 'LH Serum', 'Lutropin']),
  ('lh_fsh_ratio', 'LH : FSH Ratio', 'hormone', null, ARRAY['LH:FSH Ratio', 'LH FSH Ratio', 'Ratio LH:FSH', 'LH to FSH Ratio', 'LH:FSH', 'FSH:LH Ratio']),
  ('prolactin', 'Prolactin', 'hormone', 'ng/mL', ARRAY['Prolactin', 'PRL', 'Serum Prolactin', 'Prolactin Serum']),
  ('testosterone_total', 'Testosterone, Total', 'hormone', 'ng/dL', ARRAY['Testosterone', 'Total Testosterone', 'Testosterone Total', 'Serum Testosterone', 'Testosterone Serum']),
  ('testosterone_free', 'Testosterone, Free', 'hormone', 'pg/mL', ARRAY['Free Testosterone', 'Testosterone Free']),
  ('amh', 'Anti-Mullerian Hormone (AMH)', 'hormone', 'ng/mL', ARRAY['AMH', 'Anti Mullerian Hormone', 'Anti-Mullerian Hormone', 'Mullerian Inhibiting Substance', 'MIS']),
  ('dheas', 'DHEA-Sulphate', 'hormone', 'µg/dL', ARRAY['DHEAS', 'DHEA S', 'DHEA Sulphate', 'DHEA Sulfate', 'Dehydroepiandrosterone Sulphate', 'Dehydroepiandrosterone Sulfate']),
  ('shbg', 'Sex Hormone Binding Globulin', 'hormone', 'nmol/L', ARRAY['SHBG', 'Sex Hormone Binding Globulin']),
  ('estradiol', 'Estradiol (E2)', 'hormone', 'pg/mL', ARRAY['Estradiol', 'Oestradiol', 'E2', 'Serum Estradiol', 'Estradiol E2']),
  ('progesterone', 'Progesterone', 'hormone', 'ng/mL', ARRAY['Progesterone', 'Serum Progesterone', 'P4']),
  ('cortisol', 'Cortisol', 'hormone', 'µg/dL', ARRAY['Cortisol', 'Serum Cortisol', 'Cortisol Serum', 'Hydrocortisone']),
  ('tsh', 'TSH', 'thyroid', 'µIU/mL', ARRAY['TSH', 'TSH Ultrasensitive', 'Ultrasensitive TSH', 'Thyroid Stimulating Hormone', 'Thyroid-Stimulating Hormone', 'TSH 3rd Generation', 'Serum TSH', 'Thyrotropin']),
  ('t3_total', 'Triiodothyronine (T3), Total', 'thyroid', 'ng/dL', ARRAY['T3', 'Total T3', 'T3 Total', 'Triiodothyronine', 'TT3']),
  ('t4_total', 'Thyroxine (T4), Total', 'thyroid', 'µg/dL', ARRAY['T4', 'Total T4', 'T4 Total', 'Thyroxine', 'TT4']),
  ('t3_free', 'Free T3 (FT3)', 'thyroid', 'pg/mL', ARRAY['FT3', 'Free T3', 'T3 Free', 'Free Triiodothyronine']),
  ('t4_free', 'Free T4 (FT4)', 'thyroid', 'ng/dL', ARRAY['FT4', 'Free T4', 'T4 Free', 'Free Thyroxine']),
  ('blood_glucose_fasting', 'Fasting Blood Sugar', 'metabolic', 'mg/dL', ARRAY['FBS', 'Fasting Glucose', 'Glucose Fasting', 'Fasting Blood Sugar', 'Blood Sugar Fasting', 'Sugar Fasting', 'Fasting Plasma Glucose', 'Plasma Glucose Fasting', 'FPG', 'Glucose Fasting Plasma']),
  ('blood_glucose_pp', 'Post Prandial Blood Sugar', 'metabolic', 'mg/dL', ARRAY['PPBS', 'Post Prandial Blood Sugar', 'Blood Sugar Post Prandial', 'Glucose Post Prandial', 'Post Prandial Glucose', 'Postprandial Glucose', 'PP Blood Sugar', 'PPG']),
  ('blood_glucose_random', 'Random Blood Sugar', 'metabolic', 'mg/dL', ARRAY['RBS', 'Random Blood Sugar', 'Blood Sugar Random', 'Random Glucose', 'Glucose Random']),
  ('hba1c', 'HbA1c', 'metabolic', '%', ARRAY['HbA1c', 'Hb A1c', 'A1c', 'Hemoglobin A1c', 'Haemoglobin A1c', 'Glycated Haemoglobin', 'Glycated Hemoglobin', 'Glycosylated Haemoglobin', 'Glycosylated Hemoglobin']),
  ('insulin_fasting', 'Insulin, Fasting', 'metabolic', 'µU/mL', ARRAY['Insulin', 'Insulin Fasting', 'Fasting Insulin', 'Serum Insulin Fasting', 'Fasting Serum Insulin', 'Serum Insulin']),
  ('homa_ir', 'HOMA-IR', 'metabolic', null, ARRAY['HOMA IR', 'HOMAIR', 'HOMA Index', 'Insulin Resistance Index']),
  ('hemoglobin', 'Hemoglobin', 'blood', 'g/dL', ARRAY['HB', 'HGB', 'Hb', 'Haemoglobin', 'Hemoglobin', 'Hb Estimation', 'Blood Haemoglobin', 'Haemoglobin Hb', 'Hemoglobin Hb']),
  ('platelets', 'Platelet Count', 'blood', '10^3/µL', ARRAY['PLT', 'Platelets', 'Platelet Count', 'Count Platelet', 'Platelets Count', 'Thrombocyte Count']),
  ('wbc', 'Total Leucocyte Count (WBC)', 'blood', '10^3/µL', ARRAY['WBC', 'TLC', 'Total Leucocyte Count', 'Total Leukocyte Count', 'White Blood Cell Count', 'WBC Count', 'Leucocyte Count', 'Total WBC Count']),
  ('rbc', 'Red Blood Cell Count (RBC)', 'blood', '10^6/µL', ARRAY['RBC', 'RBC Count', 'Red Blood Cell Count', 'Total RBC Count', 'Erythrocyte Count', 'Red Cell Count']),
  ('hematocrit', 'Haematocrit (PCV)', 'blood', '%', ARRAY['HCT', 'PCV', 'Hematocrit', 'Haematocrit', 'Packed Cell Volume']),
  ('mcv', 'Mean Corpuscular Volume (MCV)', 'blood', 'fL', ARRAY['MCV', 'Mean Corpuscular Volume', 'Mean Cell Volume']),
  ('mch', 'Mean Corpuscular Haemoglobin (MCH)', 'blood', 'pg', ARRAY['MCH', 'Mean Corpuscular Haemoglobin', 'Mean Corpuscular Hemoglobin', 'Mean Cell Haemoglobin']),
  ('mchc', 'MCHC', 'blood', 'g/dL', ARRAY['MCHC', 'Mean Corpuscular Haemoglobin Concentration', 'Mean Corpuscular Hemoglobin Concentration']),
  ('esr', 'Erythrocyte Sedimentation Rate (ESR)', 'blood', 'mm/hr', ARRAY['ESR', 'Erythrocyte Sedimentation Rate', 'Sedimentation Rate']),
  ('vitamin_d', 'Vitamin D (25-OH)', 'nutrient', 'ng/mL', ARRAY['Vitamin D', 'Vit D', 'Vitamin D3', 'Vitamin D Total', 'Total Vitamin D', '25 OH Vitamin D', 'Vitamin D 25 OH', 'Vitamin D 25 Hydroxy', '25 Hydroxy Vitamin D', '25 Hydroxyvitamin D', 'Cholecalciferol']),
  ('vitamin_b12', 'Vitamin B12', 'nutrient', 'pg/mL', ARRAY['Vitamin B12', 'Vit B12', 'B12', 'Serum B12', 'Cyanocobalamin', 'Cobalamin', 'Vitamin B 12']),
  ('ferritin', 'Ferritin', 'nutrient', 'ng/mL', ARRAY['Ferritin', 'Serum Ferritin', 'Ferritin Serum']),
  ('iron', 'Serum Iron', 'nutrient', 'µg/dL', ARRAY['Iron', 'Serum Iron', 'Iron Serum', 'Fe']),
  ('tibc', 'Total Iron Binding Capacity (TIBC)', 'nutrient', 'µg/dL', ARRAY['TIBC', 'Total Iron Binding Capacity', 'Iron Binding Capacity']),
  ('transferrin_saturation', 'Transferrin Saturation', 'nutrient', '%', ARRAY['Transferrin Saturation', 'Saturation Transferrin', 'TSAT', 'Transferrin Sat']),
  ('folate', 'Folate (Folic Acid)', 'nutrient', 'ng/mL', ARRAY['Folate', 'Folic Acid', 'Serum Folate', 'Folate Serum', 'Vitamin B9']),
  ('calcium', 'Calcium, Total', 'nutrient', 'mg/dL', ARRAY['Calcium', 'Total Calcium', 'Calcium Total', 'Serum Calcium']),
  ('calcium_ionized', 'Calcium, Ionized', 'nutrient', 'mg/dL', ARRAY['Ionized Calcium', 'Ionised Calcium', 'Calcium Ionized', 'Calcium Ionised', 'Free Calcium']),
  ('magnesium', 'Magnesium', 'nutrient', 'mg/dL', ARRAY['Magnesium', 'Serum Magnesium', 'Mg']),
  ('phosphorus', 'Phosphorus', 'nutrient', 'mg/dL', ARRAY['Phosphorus', 'Phosphate', 'Serum Phosphorus', 'Inorganic Phosphorus']),
  ('total_protein', 'Total Protein', 'protein', 'g/dL', ARRAY['Total Protein', 'Protein Total', 'Serum Protein', 'Total Proteins', 'Protein Serum']),
  ('albumin', 'Albumin', 'protein', 'g/dL', ARRAY['Albumin', 'Serum Albumin', 'Albumin Serum']),
  ('globulin', 'Globulin', 'protein', 'g/dL', ARRAY['Globulin', 'Serum Globulin']),
  ('creatinine', 'Creatinine', 'kidney', 'mg/dL', ARRAY['Creatinine', 'Serum Creatinine', 'Creatinine Serum']),
  ('urea', 'Blood Urea', 'kidney', 'mg/dL', ARRAY['Urea', 'Blood Urea', 'Serum Urea', 'BUN', 'Blood Urea Nitrogen']),
  ('uric_acid', 'Uric Acid', 'kidney', 'mg/dL', ARRAY['Uric Acid', 'Serum Uric Acid', 'Acid Uric']),
  ('alt', 'ALT (SGPT)', 'liver', 'U/L', ARRAY['ALT', 'SGPT', 'ALT SGPT', 'SGPT ALT', 'Alanine Aminotransferase', 'Alanine Transaminase']),
  ('ast', 'AST (SGOT)', 'liver', 'U/L', ARRAY['AST', 'SGOT', 'AST SGOT', 'SGOT AST', 'Aspartate Aminotransferase', 'Aspartate Transaminase']),
  ('bilirubin_total', 'Bilirubin, Total', 'liver', 'mg/dL', ARRAY['Bilirubin', 'Total Bilirubin', 'Bilirubin Total', 'Serum Bilirubin']),
  ('cholesterol_total', 'Cholesterol, Total', 'lipid', 'mg/dL', ARRAY['Cholesterol', 'Total Cholesterol', 'Cholesterol Total', 'Serum Cholesterol']),
  ('triglycerides', 'Triglycerides', 'lipid', 'mg/dL', ARRAY['Triglycerides', 'Triglyceride', 'TG', 'Serum Triglycerides']),
  ('hdl', 'HDL Cholesterol', 'lipid', 'mg/dL', ARRAY['HDL', 'HDL Cholesterol', 'Cholesterol HDL', 'HDL C', 'High Density Lipoprotein']),
  ('ldl', 'LDL Cholesterol', 'lipid', 'mg/dL', ARRAY['LDL', 'LDL Cholesterol', 'Cholesterol LDL', 'LDL C', 'Low Density Lipoprotein']),
  ('vldl', 'VLDL Cholesterol', 'lipid', 'mg/dL', ARRAY['VLDL', 'VLDL Cholesterol', 'Cholesterol VLDL', 'Very Low Density Lipoprotein']),
  ('blood_pressure_systolic', 'Systolic Blood Pressure', 'vitals', 'mmHg', ARRAY['BP Systolic', 'Systolic BP', 'SBP', 'Systolic', 'Systolic Blood Pressure']),
  ('blood_pressure_diastolic', 'Diastolic Blood Pressure', 'vitals', 'mmHg', ARRAY['BP Diastolic', 'Diastolic BP', 'DBP', 'Diastolic', 'Diastolic Blood Pressure']),
  ('urine_protein', 'Urine Protein', 'urine', null, ARRAY['Urine Protein', 'Protein Urine', 'Urine Albumin', 'Albumin Urine', 'Urinary Protein']),
  ('weight', 'Maternal Weight', 'vitals', 'kg', ARRAY['Weight', 'Body Weight', 'Maternal Weight', 'Wt'])

on conflict (standard_key) do update set
  display_name  = excluded.display_name,
  category      = excluded.category,
  unit_standard = excluded.unit_standard,
  aliases       = excluded.aliases,
  is_active     = true;
