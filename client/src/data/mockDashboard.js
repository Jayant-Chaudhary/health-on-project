/**
 * Demo dataset for the clinician dashboard.
 *
 * Shapes mirror what `clinicianService` returns from the Express API, so the
 * UI renders identically whether the backend is up or not. This is what the
 * dashboard falls back to when `VITE_USE_MOCK_DATA=true` or the API is
 * unreachable — useful for demos and for building UI before seed data exists.
 */

const daysAgo = (n) => new Date(Date.now() - n * 86_400_000).toISOString();

export const mockPatients = [
  { id: 'p-1', name: 'Amara Okafor', mrn: 'MRN-849204', gestationalDays: 200, acuity: 'elevated' },
  { id: 'p-2', name: 'Priya Nair', mrn: 'MRN-849118', gestationalDays: 154, acuity: 'watch' },
  { id: 'p-3', name: 'Leah Mensah', mrn: 'MRN-848907', gestationalDays: 96, acuity: 'optimal' },
  { id: 'p-4', name: 'Rina Deshpande', mrn: 'MRN-848422', gestationalDays: 241, acuity: 'watch' },
];

export const mockDashboard = {
  patient: {
    id: 'p-1',
    name: 'Amara Okafor',
    mrn: 'MRN-849204',
    age: 32,
    bloodType: 'O+',
    gravida: 2,
    para: 1,
    gestationalDays: 200,
    dueDate: '2025-11-14',
    midwife: 'Sarah Lin, CNM',
    acuity: 'elevated',
    acuityLabel: 'Moderate Triage Priority',
  },

  appointment: {
    id: 'a-1',
    scheduledAt: daysAgo(0),
    status: 'checked_in',
    checkedInAt: daysAgo(0),
  },

  questionnaire: {
    submittedAt: daysAgo(0),
    answers: [
      {
        id: 'q-1',
        question: 'Sudden swelling in hands, face or feet',
        shortLabel: 'Extremity edema',
        answer: true,
        isRedFlagTrigger: true,
        detail: 'Bilateral ankles and feet, onset past 48h. Rings and sandals no longer fit.',
      },
      {
        id: 'q-2',
        question: 'Severe headaches or blurred vision',
        shortLabel: 'Headache / vision',
        answer: true,
        isRedFlagTrigger: true,
        detail: 'Mild bilateral forehead tension. No visual spots, aura or scotoma.',
      },
      {
        id: 'q-3',
        question: 'Decreased baby movement in the past 24 hours',
        shortLabel: 'Fetal movement',
        answer: false,
        isRedFlagTrigger: true,
        detail: '10+ distinct kicks logged within 90 min after breakfast.',
      },
      {
        id: 'q-4',
        question: 'Vaginal bleeding or fluid leakage',
        shortLabel: 'Bleeding / leakage',
        answer: false,
        isRedFlagTrigger: true,
        detail: 'None reported.',
      },
      {
        id: 'q-5',
        question: 'Fever, chills or burning during urination',
        shortLabel: 'Infection signs',
        answer: false,
        isRedFlagTrigger: true,
        detail: 'None reported.',
      },
      {
        id: 'q-6',
        question: 'Taken all prescribed prenatal vitamins',
        shortLabel: 'Vitamin adherence',
        answer: true,
        isRedFlagTrigger: false,
        detail: 'Daily, with occasional evening doses missed.',
      },
    ],
  },

  metrics: [
    {
      standardKey: 'blood_pressure_systolic',
      name: 'Blood Pressure',
      source: 'Manual sphygmomanometer',
      value: '134/86',
      unit: 'mmHg',
      status: 'elevated',
      reference: '< 120/80',
      recordedAt: daysAgo(0),
      history: [
        { date: daysAgo(112), value: 118 },
        { date: daysAgo(84), value: 120 },
        { date: daysAgo(56), value: 124 },
        { date: daysAgo(28), value: 129 },
        { date: daysAgo(12), value: 131 },
        { date: daysAgo(0), value: 134 },
      ],
    },
    {
      standardKey: 'hemoglobin',
      name: 'Hemoglobin (Hb)',
      source: 'Quest diagnostics panel',
      value: '10.4',
      unit: 'g/dL',
      status: 'watch',
      reference: '≥ 11.0 g/dL',
      recordedAt: daysAgo(12),
      history: [
        { date: daysAgo(112), value: 12.1 },
        { date: daysAgo(84), value: 11.8 },
        { date: daysAgo(56), value: 11.2 },
        { date: daysAgo(28), value: 10.9 },
        { date: daysAgo(12), value: 10.4 },
      ],
    },
    {
      standardKey: 'blood_glucose_fasting',
      name: 'Fasting Glucose (GTT)',
      source: '50g glucola challenge',
      value: '88',
      unit: 'mg/dL',
      status: 'optimal',
      reference: '70 – 95 mg/dL',
      recordedAt: daysAgo(14),
      history: [
        { date: daysAgo(84), value: 82 },
        { date: daysAgo(56), value: 85 },
        { date: daysAgo(28), value: 90 },
        { date: daysAgo(14), value: 88 },
      ],
    },
    {
      standardKey: 'platelets',
      name: 'Platelet Count',
      source: 'Quest CBC panel',
      value: null,
      unit: '10³/µL',
      status: 'pending',
      reference: '150 – 400',
      recordedAt: daysAgo(12),
      needsReview: true,
      history: [
        { date: daysAgo(84), value: 232 },
        { date: daysAgo(56), value: 221 },
        { date: daysAgo(28), value: 205 },
      ],
    },
    {
      standardKey: 'weight',
      name: 'Maternal Weight',
      source: 'Patient-logged, clinic scale',
      value: '68.4',
      unit: 'kg',
      status: 'optimal',
      reference: '+0.4 kg/wk expected',
      recordedAt: daysAgo(0),
      history: [
        { date: daysAgo(112), value: 60.2 },
        { date: daysAgo(84), value: 62.1 },
        { date: daysAgo(56), value: 64.0 },
        { date: daysAgo(28), value: 66.1 },
        { date: daysAgo(0), value: 68.4 },
      ],
    },
    {
      standardKey: 'urine_protein',
      name: 'Urine Protein',
      source: 'Clinic dipstick',
      value: 'Trace (+1)',
      unit: '',
      status: 'watch',
      reference: 'Negative',
      recordedAt: daysAgo(0),
      history: [
        { date: daysAgo(56), value: 0 },
        { date: daysAgo(28), value: 0 },
        { date: daysAgo(0), value: 1 },
      ],
    },
  ],

  triageAlerts: [
    {
      id: 'alert-1',
      labReportId: 'lr-9',
      metricId: 'lrm-22',
      standardKey: 'platelets',
      label: 'Platelet count',
      reportName: 'Quest CBC panel',
      reportDate: daysAgo(12),
      confidence: 0.82,
      reason: 'Value obscured by a physical fold in the scanned document.',
      imageUrl: null,
    },
  ],

  notes: {
    text:
      'Patient presents at 28w4d for scheduled third-trimester triage review.\n\n' +
      'Subjective: sudden bilateral ankle edema past 48 hours. Fetal kick counts ' +
      'reassuring (>10 in 90 min). Mild tension headache; vision clear, no RUQ pain.\n\n' +
      'Objective: BP elevated at 134/86 mmHg (baseline 120/78). Fundal height 29 cm, ' +
      'concordant. Trace protein (+1) on dipstick.',
    updatedAt: daysAgo(0),
  },

  checklist: [
    { id: 'c-1', label: 'Order repeat 24hr urine protein / creatinine', category: 'lab_order', isCompleted: true },
    { id: 'c-2', label: 'Prescribe iron supplement (oral ferrous sulfate)', category: 'prescription', isCompleted: true },
    { id: 'c-3', label: 'Schedule follow-up ultrasound in 2 weeks', category: 'appointment', isCompleted: true },
    { id: 'c-4', label: 'Advise bed rest & hydration', category: 'advice', isCompleted: false },
    { id: 'c-5', label: 'Pre-eclampsia warning-sign counselling', category: 'advice', isCompleted: false },
  ],

  notifications: [
    { id: 'n-1', text: 'Priya Nair submitted her pre-visit intake', at: daysAgo(0) },
    { id: 'n-2', text: '2 lab reports need manual review', at: daysAgo(0) },
  ],
};

export default mockDashboard;
