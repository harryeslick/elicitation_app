import { Scenario, ElicitationData, Distribution } from '../types';

const DIST_HEADERS = ['baseline_min', 'baseline_max', 'baseline_mode', 'baseline_confidence', 'treatment_min', 'treatment_max', 'treatment_mode', 'treatment_confidence'];

export function generateCSV(scenarios: Scenario[], data: ElicitationData): string {
    const scenarioHeaders = scenarios.length > 0 ? Object.keys(scenarios[0]).filter(k => k !== 'id') : [];
    const headers = ['scenario_id', ...scenarioHeaders, ...DIST_HEADERS];

    const rows = scenarios.map(scenario => {
        const scenarioData = scenarioHeaders.map(h => scenario[h]);
        const dist = data[scenario.id];

        const distData = dist ? [
            dist.baseline.min, dist.baseline.max, dist.baseline.mode, dist.baseline.confidence,
            dist.treatment.min, dist.treatment.max, dist.treatment.mode, dist.treatment.confidence,
        ] : Array(8).fill('');

        return [scenario.id, ...scenarioData, ...distData].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
}

export function parseCSV(csvText: string, existingScenarios: Scenario[]): ElicitationData {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const data: ElicitationData = {};

    const scenarioMap = new Map(existingScenarios.map(s => [s.id, s]));

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row = headers.reduce((obj, header, index) => {
            obj[header] = values[index];
            return obj;
        }, {} as { [key: string]: string });
        
        const scenarioId = row['scenario_id'];
        if (scenarioMap.has(scenarioId)) {
            const baseline: Distribution = {
                min: parseFloat(row['baseline_min']),
                max: parseFloat(row['baseline_max']),
                mode: parseFloat(row['baseline_mode']),
                confidence: parseFloat(row['baseline_confidence']),
            };
            const treatment: Distribution = {
                min: parseFloat(row['treatment_min']),
                max: parseFloat(row['treatment_max']),
                mode: parseFloat(row['treatment_mode']),
                confidence: parseFloat(row['treatment_confidence']),
            };
            
            // Basic validation to check if parsing was successful
            if (Object.values(baseline).every(v => !isNaN(v)) && Object.values(treatment).every(v => !isNaN(v))) {
                data[scenarioId] = { baseline, treatment };
            }
        }
    }

    return data;
}