import { Scenario } from './types';

const rawScenarioData = {
    "canola_pct": { "72": 20.0, "73": 25.0, "74": 30.0, "75": 15.0, "76": 22.0 },
    "Sporacle": { "72": "High", "73": "High", "74": "Low", "75": "Medium", "76": "High" },
    "Yield (t)": { "72": 2.0, "73": 2.2, "74": 2.5, "75": 1.8, "76": 2.1 },
    "Resistance loss": { "72": 0.0, "73": 0.1, "74": 0.05, "75": 0.2, "76": 0.15 }
};

const keys = Object.keys(rawScenarioData['canola_pct']);
export const INITIAL_SCENARIOS: Scenario[] = keys.map((key, index) => {
    const scenario: Scenario = { 
        id: `scenario_${key}`,
        scenario_group: index < 3 ? 'Pest Pressure' : 'Drought Stress' // Assigning groups for demonstration
    };
    for (const prop in rawScenarioData) {
        scenario[prop] = (rawScenarioData as any)[prop][key];
    }
    return scenario;
});