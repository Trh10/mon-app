export type AnalyticsOverview = {
  productivity: { avgResponseTimeMin: number; emailsPerDay: number; processedToday: number };
  workload: { overloaded: Array<{ user: string; load: number }>; underutilized: Array<{ user: string; load: number }> };
  deadlines: { atRiskCount: number; examples: Array<{ id: string; title: string; risk: number }> };
  performanceScore: number;
};

export function getOverview(): AnalyticsOverview {
  return {
    productivity: { avgResponseTimeMin: 42, emailsPerDay: 128, processedToday: 57 },
    workload: { overloaded: [{ user: "Alice", load: 0.86 }], underutilized: [{ user: "Bob", load: 0.22 }] },
    deadlines: {
      atRiskCount: 3,
      examples: [
        { id: "TASK-101", title: "Répondre au client X", risk: 0.78 },
        { id: "TASK-214", title: "Devis à valider", risk: 0.65 }
      ],
    },
    performanceScore: 78,
  };
}