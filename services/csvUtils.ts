import { Scenario, UserElicitationData } from '../types';

const DIST_HEADERS = ['baseline_min', 'baseline_max', 'baseline_mode', 'baseline_confidence', 'treatment_min', 'treatment_max', 'treatment_mode', 'treatment_confidence'];
const RESERVED_HEADERS = ['scenario_id', 'scenario_group', ...DIST_HEADERS];

// Function to find yield column using regex
function findYieldColumn(headers: string[]): string | null {
    const yieldRegex = /yield/i;
    return headers.find(header => yieldRegex.test(header)) || null;
}

export function generateCSV(scenarios: Scenario[], userData: UserElicitationData): string {
    if (scenarios.length === 0) {
        throw new Error('Cannot generate CSV: no scenarios provided');
    }
    
    // Get all possible headers from all scenarios to handle dynamic columns
    const allScenarioHeaders = new Set<string>();
    scenarios.forEach(scenario => {
        Object.keys(scenario).forEach(key => {
            if (key !== 'id') {
                allScenarioHeaders.add(key);
            }
        });
    });
    
    const scenarioHeaders = Array.from(allScenarioHeaders).sort();
    const headers = ['scenario_id', ...scenarioHeaders, ...DIST_HEADERS];

    const rows = scenarios.map(scenario => {
        const scenarioData = scenarioHeaders.map(h => scenario[h] ?? ''); // Handle missing properties
        const userDist = userData[scenario.id];

        const distData = userDist ? [
            userDist.baseline.min ?? '', userDist.baseline.max ?? '', userDist.baseline.mode ?? '', userDist.baseline.confidence ?? '',
            userDist.treatment.min ?? '', userDist.treatment.max ?? '', userDist.treatment.mode ?? '', userDist.treatment.confidence ?? '',
        ] : Array(8).fill('');

        return [scenario.id, ...scenarioData, ...distData].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
}

export interface ParsedCSVData {
    scenarios: Scenario[];
    userElicitationData: UserElicitationData;
    yieldColumn: string | null;
}

export function parseCSV(csvText: string, existingScenarios: Scenario[]): ParsedCSVData {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
        throw new Error('CSV file must contain at least a header row and one data row');
    }
    
    const headers = lines[0].split(',').map(h => h.trim());
    
    // Validate required columns
    if (!headers.includes('scenario_id')) {
        throw new Error('CSV file must contain a "scenario_id" column');
    }
    if (!headers.includes('scenario_group')) {
        throw new Error('CSV file must contain a "scenario_group" column');
    }
    
    // Validate distribution columns are present
    const missingDistHeaders = DIST_HEADERS.filter(h => !headers.includes(h));
    if (missingDistHeaders.length > 0) {
        throw new Error(`CSV file must contain distribution columns: ${missingDistHeaders.join(', ')}`);
    }
    
    // Find yield column
    const yieldColumn = findYieldColumn(headers);
    
    const userData: UserElicitationData = {};
    const scenarios: Scenario[] = []; // Start fresh, don't use existing scenarios

    const scenarioMap = new Map<string, Scenario>();
    // Get all non-reserved headers for scenario data (exclude dist headers AND scenario_id/scenario_group)
    const scenarioDataHeaders = headers.filter(h => !RESERVED_HEADERS.includes(h));

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row = headers.reduce((obj, header, index) => {
            obj[header] = values[index];
            return obj;
        }, {} as { [key: string]: string });
        
        const scenarioId = row['scenario_id'];
        
        // Build scenario from all non-distribution, non-id columns
        if (!scenarioMap.has(scenarioId)) {
            const scenarioData: { [key: string]: any } = {};
            
            // Add all custom columns (not reserved)
            for (const header of scenarioDataHeaders) {
                const value = row[header];
                if (value !== undefined && value !== '') {
                    // Try to parse as number, otherwise keep as string
                    scenarioData[header] = isNaN(Number(value)) ? value : Number(value);
                }
            }
            
            const newScenario: Scenario = {
                id: scenarioId,
                scenario_group: row['scenario_group'] || 'Unknown',
                ...scenarioData
            };
            
            scenarios.push(newScenario);
            scenarioMap.set(scenarioId, newScenario);
        }
        
        // Parse user elicitation data for this scenario (preserving empty values as null)
        const parseValue = (value: string): number | null => {
            return value === '' ? null : parseFloat(value);
        };

        const userBaseline = {
            min: parseValue(row['baseline_min']),
            max: parseValue(row['baseline_max']),
            mode: parseValue(row['baseline_mode']),
            confidence: parseValue(row['baseline_confidence']),
        };
        const userTreatment = {
            min: parseValue(row['treatment_min']),
            max: parseValue(row['treatment_max']),
            mode: parseValue(row['treatment_mode']),
            confidence: parseValue(row['treatment_confidence']),
        };
        
        userData[scenarioId] = { baseline: userBaseline, treatment: userTreatment };
    }

    return { scenarios, userElicitationData: userData, yieldColumn };
}