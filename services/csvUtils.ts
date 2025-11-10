import { Scenario, UserElicitationData } from '../types';

const COMMENT_HEADER = 'comment';
const DIST_HEADERS = ['baseline_min', 'baseline_max', 'baseline_mode', 'baseline_confidence', 'treatment_min', 'treatment_max', 'treatment_mode', 'treatment_confidence'];
const RESERVED_HEADERS = ['scenario_id', 'scenario_group', COMMENT_HEADER, ...DIST_HEADERS];

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
            if (!['id', 'scenario_group', 'comment'].includes(key)) {
                allScenarioHeaders.add(key);
            }
        });
    });
    
    const scenarioHeaders = Array.from(allScenarioHeaders).sort();
    const headers = ['scenario_id', 'scenario_group', COMMENT_HEADER, ...scenarioHeaders, ...DIST_HEADERS];

    const rows = scenarios.map(scenario => {
        const scenarioData = scenarioHeaders.map(h => scenario[h] ?? ''); // Handle missing properties
        const userDist = userData[scenario.id];

        const distData = userDist ? [
            userDist.baseline.min ?? '', userDist.baseline.max ?? '', userDist.baseline.mode ?? '', userDist.baseline.confidence ?? '',
            userDist.treatment.min ?? '', userDist.treatment.max ?? '', userDist.treatment.mode ?? '', userDist.treatment.confidence ?? '',
        ] : Array(8).fill('');

        const sanitizedComment = (scenario.comment ?? '')
            .replace(/,/g, '')
            .replace(/\r?\n/g, '\\n');

        return [
            scenario.id,
            scenario.scenario_group ?? '',
            sanitizedComment,
            ...scenarioData,
            ...distData
        ].join(',');
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

    // Get all non-reserved headers for scenario data (exclude dist headers AND scenario_id/scenario_group)
    const scenarioDataHeaders = headers.filter(h => !RESERVED_HEADERS.includes(h));
    const comparableHeaders = headers.filter(header => header !== 'scenario_group');
    const canonicalRows = new Map<string, Record<string, string>>();

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) {
            continue;
        }

        const values = line.split(',').map(v => v.trim());
        const row = headers.reduce((obj, header, index) => {
            obj[header] = values[index] ?? '';
            return obj;
        }, {} as { [key: string]: string });
        
        const scenarioId = row['scenario_id'];
        if (!scenarioId) {
            throw new Error(`Row ${i + 1} is missing a scenario_id value.`);
        }

        const comparableRow = comparableHeaders.reduce((acc, header) => {
            acc[header] = row[header] ?? '';
            return acc;
        }, {} as Record<string, string>);

        const existingComparable = canonicalRows.get(scenarioId);
        if (existingComparable) {
            const mismatchedColumns = comparableHeaders.filter(header => {
                const previous = existingComparable[header] ?? '';
                const current = comparableRow[header] ?? '';
                return previous !== current;
            });

            if (mismatchedColumns.length > 0) {
                throw new Error(
                    `Duplicate scenario_id "${scenarioId}" must match on all columns except scenario_group. Conflicts found in: ${mismatchedColumns.join(', ')}`
                );
            }
        } else {
            canonicalRows.set(scenarioId, comparableRow);
        }

        const scenarioData: { [key: string]: any } = {};
        for (const header of scenarioDataHeaders) {
            const value = row[header];
            if (value !== undefined && value !== '') {
                scenarioData[header] = isNaN(Number(value)) ? value : Number(value);
            }
        }

        const newScenario: Scenario = {
            id: scenarioId,
            scenario_group: row['scenario_group'] || 'Unknown',
            comment: (row[COMMENT_HEADER] || '').replace(/\\n/g, '\n'),
            ...scenarioData
        };

        scenarios.push(newScenario);
        
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
