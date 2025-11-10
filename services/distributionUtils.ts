import { Distribution, ScenarioDistribution, UserDistribution, UserScenarioDistribution } from '../types';

// Default values for distributions
export const DEFAULT_BASELINE: Distribution = { min: 0, max: 30, mode: 15, confidence: 100 };
export const DEFAULT_TREATMENT: Distribution = { min: 0, max: 20, mode: 10, confidence: 100 };
export const DEFAULT_SLIDER_RANGE = { min: 0, max: 40 };

/**
 * Convert a UserDistribution (with possible nulls) to a full Distribution using defaults
 */
export function userDistributionToDistribution(userDist: UserDistribution, defaults: Distribution): Distribution {
    return {
        min: userDist.min ?? defaults.min,
        max: userDist.max ?? defaults.max,
        mode: userDist.mode ?? defaults.mode,
        confidence: userDist.confidence ?? defaults.confidence,
    };
}

/**
 * Convert a full Distribution to UserDistribution, setting values that match defaults to null
 */
export function distributionToUserDistribution(dist: Distribution, defaults: Distribution): UserDistribution {
    return {
        min: dist.min === defaults.min ? null : dist.min,
        max: dist.max === defaults.max ? null : dist.max,
        mode: dist.mode === defaults.mode ? null : dist.mode,
        confidence: dist.confidence === defaults.confidence ? null : dist.confidence,
    };
}

/**
 * Check if a UserDistribution has any user-edited values (non-null)
 */
export function hasUserEdits(userDist: UserDistribution): boolean {
    return userDist.min !== null || userDist.max !== null || userDist.mode !== null || userDist.confidence !== null;
}

/**
 * Check if a UserScenarioDistribution has any user-edited values
 */
export function hasScenarioUserEdits(userScenarioDist: UserScenarioDistribution): boolean {
    return hasUserEdits(userScenarioDist.baseline) || hasUserEdits(userScenarioDist.treatment);
}

/**
 * Convert UserScenarioDistribution to ScenarioDistribution using defaults
 */
export function userScenarioToScenario(userScenario: UserScenarioDistribution): ScenarioDistribution {
    return {
        baseline: userDistributionToDistribution(userScenario.baseline, DEFAULT_BASELINE),
        treatment: userDistributionToDistribution(userScenario.treatment, DEFAULT_TREATMENT),
    };
}

/**
 * Convert ScenarioDistribution to UserScenarioDistribution, nullifying defaults
 */
export function scenarioToUserScenario(scenario: ScenarioDistribution): UserScenarioDistribution {
    return {
        baseline: distributionToUserDistribution(scenario.baseline, DEFAULT_BASELINE),
        treatment: distributionToUserDistribution(scenario.treatment, DEFAULT_TREATMENT),
    };
}

/**
 * Get a default empty UserScenarioDistribution (all nulls)
 */
export function getEmptyUserScenario(): UserScenarioDistribution {
    return {
        baseline: { min: null, max: null, mode: null, confidence: null },
        treatment: { min: null, max: null, mode: null, confidence: null },
    };
}