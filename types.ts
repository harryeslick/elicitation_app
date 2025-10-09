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

// User-editable distribution with nullable values for defaults
export interface UserDistribution {
    min: number | null;
    max: number | null;
    mode: number | null;
    confidence: number | null;
}

export interface ScenarioDistribution {
    baseline: Distribution;
    treatment: Distribution;
}

// User scenario distribution with nullable values
export interface UserScenarioDistribution {
    baseline: UserDistribution;
    treatment: UserDistribution;
}

export interface ElicitationData {
    [scenarioId: string]: ScenarioDistribution;
}

// User elicitation data with nullable values
export interface UserElicitationData {
    [scenarioId: string]: UserScenarioDistribution;
}

export interface BetaParams {
    alpha: number;
    beta: number;
}