import defaultScenarioCSV from './sclerotiniLM elicitation_251110.csv?raw';
import { parseCSV, ParsedCSVData } from './services/csvUtils';
import { Scenario, UserElicitationData } from './types';

interface DefaultElicitationData extends ParsedCSVData {
    scenarios: Scenario[];
    userElicitationData: UserElicitationData;
}

const buildDefaultData = (): DefaultElicitationData => {
    try {
        return parseCSV(defaultScenarioCSV, []);
    } catch (error) {
        console.error('Failed to parse default scenario CSV.', error);
        return {
            scenarios: [],
            userElicitationData: {},
            yieldColumn: null
        };
    }
};

export const DEFAULT_ELICITATION_DATA = buildDefaultData();
export const INITIAL_SCENARIOS: Scenario[] = DEFAULT_ELICITATION_DATA.scenarios;
export const INITIAL_USER_ELICITATION_DATA: UserElicitationData = DEFAULT_ELICITATION_DATA.userElicitationData;
export const INITIAL_YIELD_COLUMN: string | null = DEFAULT_ELICITATION_DATA.yieldColumn;
