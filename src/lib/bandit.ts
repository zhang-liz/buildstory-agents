

export type ArmId = {
  storyId: string;
  section: string;
  variant: string;
};

export type BanditArm = {
  arm: ArmId;
  alpha: number;
  beta: number;
};

export type BanditState = {
  storyId: string;
  sectionKey: string;
  variantHash: string;
  alpha: number;
  beta: number;
};

// Simple Beta distribution sampler using transformation method
export function sampleBeta(alpha: number, beta: number): number {
  if (alpha <= 0 || beta <= 0) {
    throw new Error('Alpha and beta must be positive');
  }

  // For simple case, use rejection sampling or approximation
  // This is a simplified version - in production might want more robust sampler
  const u = Math.random();
  const v = Math.random();

  const x = Math.pow(u, 1 / alpha);
  const y = Math.pow(v, 1 / beta);

  return x / (x + y);
}

// Thompson Sampling to choose best variant
export async function chooseVariant(arms: BanditArm[]): Promise<ArmId> {
  if (arms.length === 0) {
    throw new Error('No arms available');
  }

  if (arms.length === 1) {
    return arms[0].arm;
  }

  // Sample from each arm's Beta distribution
  const samples = arms.map(arm => ({
    arm: arm.arm,
    sample: sampleBeta(arm.alpha, arm.beta)
  }));

  // Choose arm with highest sample
  const bestArm = samples.reduce((best, current) =>
    current.sample > best.sample ? current : best
  );

  return bestArm.arm;
}

// Calculate conversion rate estimate
export function getConversionRate(alpha: number, beta: number): number {
  return alpha / (alpha + beta);
}

// Calculate confidence interval for conversion rate
export function getConfidenceInterval(alpha: number, beta: number, confidence: number = 0.95): [number, number] {
  const rate = getConversionRate(alpha, beta);
  const variance = (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1));
  const stdError = Math.sqrt(variance);

  const z = confidence === 0.95 ? 1.96 : 2.58; // 95% or 99%
  const margin = z * stdError;

  return [Math.max(0, rate - margin), Math.min(1, rate + margin)];
}

// Update bandit state with reward
export function updateBanditState(state: BanditState, reward: number): BanditState {
  return {
    ...state,
    alpha: state.alpha + reward,
    beta: state.beta + (1 - reward)
  };
}

// Initialize new bandit arm
export function initializeBanditArm(storyId: string, sectionKey: string, variantHash: string): BanditState {
  return {
    storyId,
    sectionKey,
    variantHash,
    alpha: 1, // Prior belief of success
    beta: 1   // Prior belief of failure
  };
}

// Calculate regret (for analysis)
export function calculateRegret(arms: BanditArm[], optimalArm: ArmId): number {
  const optimalRate = arms.find(arm =>
    arm.arm.storyId === optimalArm.storyId &&
    arm.arm.section === optimalArm.section &&
    arm.arm.variant === optimalArm.variant
  );

  if (!optimalRate) return 0;

  const totalPulls = arms.reduce((sum, arm) => sum + arm.alpha + arm.beta - 2, 0);
  const optimalPulls = optimalRate.alpha + optimalRate.beta - 2;
  const suboptimalPulls = totalPulls - optimalPulls;

  const optimalConversionRate = getConversionRate(optimalRate.alpha, optimalRate.beta);
  const actualConversionRate = arms.reduce((sum, arm) => {
    const pulls = arm.alpha + arm.beta - 2;
    const rate = getConversionRate(arm.alpha, arm.beta);
    return sum + (rate * pulls);
  }, 0) / totalPulls;

  return (optimalConversionRate - actualConversionRate) * suboptimalPulls;
}

// Epsilon-greedy as fallback strategy
export function epsilonGreedy(arms: BanditArm[], epsilon: number = 0.1): ArmId {
  if (Math.random() < epsilon) {
    // Explore: choose random arm
    const randomIndex = Math.floor(Math.random() * arms.length);
    return arms[randomIndex].arm;
  } else {
    // Exploit: choose best arm based on current estimates
    const bestArm = arms.reduce((best, current) => {
      const bestRate = getConversionRate(best.alpha, best.beta);
      const currentRate = getConversionRate(current.alpha, current.beta);
      return currentRate > bestRate ? current : best;
    });
    return bestArm.arm;
  }
}
