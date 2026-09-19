export const mockVisitSummary = [
  {
    id: "vs_1",
    date: "2026-08-15",
    doctorName: "Dr. Anita Rao",
    prescriptionImageUrl: "https://via.placeholder.com/800x1200",
    notes: "Patient progressing well in Trimester 2. Blood pressure is normal. Mild swelling observed, recommended elevation. Start iron supplements.",
    nextSteps: [
      { id: "ns1", title: "Take iron tablet once daily", dueLabel: "Daily", done: true },
      { id: "ns2", title: "Book anomaly scan", dueLabel: "Within 2 weeks", done: true }
    ]
  },
  {
    id: "vs_2",
    date: "2026-09-18", // Today
    doctorName: "Dr. Anita Rao",
    prescriptionImageUrl: "https://via.placeholder.com/800x1200",
    notes: "Hemoglobin slightly low. Continue iron supplements. Rest and keep your feet elevated. Monitor BP twice a week.",
    nextSteps: [
      { id: "ns3", title: "Repeat blood test", dueLabel: "Before Nov 15", done: false },
      { id: "ns4", title: "Track BP twice a week", dueLabel: "Ongoing", done: false }
    ]
  }
];
