export type MemoryEntry = {
  id: string;
  scope: string;
  sourceId: string;
  content: string;
  verified: boolean;
  expiresAt: string | null;
  updatedAt: string;
  correctionSourceId: string | null;
};

export type Analytics = {
  generatedAt: string;
  currentStages: Array<{ stage: string; count: number }>;
  cohort: {
    from: string | null;
    to: string | null;
    timezone: string;
    sampleSize: number;
    excludedCorrectedApplications: number;
    definition: string;
  };
  funnel: Array<{
    stage: string;
    reached: number;
    cohortDenominator: number;
    cohortRatePercent: number | null;
    priorMilestoneDenominator: number;
    priorMilestoneRatePercent: number | null;
  }>;
  funnelDefinition: string;
  timeInStage: Array<{
    stage: string;
    sampleSize: number;
    averageDays: number | null;
    medianDays: number | null;
  }>;
  durationDefinition: string;
  outcomes: { accepted: number; rejected: number; withdrawn: number };
};
