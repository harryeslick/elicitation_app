export interface Scenario {
    id: string;
    scenario_group: string;
    [key: string]: any; 
}

export interface Distribution {
    min: number;
    max: number;
    mode: number;
    confidence: number; // 0-100
}

export interface ScenarioDistribution {
    baseline: Distribution;
    treatment: Distribution;
}

export interface ElicitationData {
    [scenarioId: string]: ScenarioDistribution;
}

export interface BetaParams {
    alpha: number;
    beta: number;
}