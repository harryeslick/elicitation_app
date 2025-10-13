import { load } from 'js-yaml';

export interface TooltipConfig {
    [key: string]: string;
}

// Cache for tooltip configuration
let tooltipConfig: TooltipConfig | null = null;

// Load tooltip configuration from YAML file
export const loadTooltipConfig = async (): Promise<TooltipConfig> => {
    console.log('loadTooltipConfig called');
    
    if (tooltipConfig) {
        console.log('Returning cached tooltip config');
        return tooltipConfig;
    }

    // Hardcoded fallback config
    const fallbackConfig: TooltipConfig = {
        'Status': 'Completion status indicator showing whether expert has provided custom distribution parameters',
        'Actions': 'Available actions for this scenario including duplicate and delete options',
        'Baseline Distribution': 'Distribution parameters for expected outcomes WITHOUT any treatment intervention',
        'Treatment Distribution': 'Distribution parameters for expected outcomes AFTER applying treatment intervention',
        'Location': 'Geographic location or site where the scenario takes place',
        'Crop Type': 'Type of crop or vegetation being studied in this scenario',
        'Treatment Type': 'Type of intervention or treatment being applied in this scenario',
        'Expected Yield': 'Expected crop yield or production outcome for this scenario',
        'Risk Level': 'Assessment of risk level associated with this scenario'
    };

    try {
        console.log('Fetching tooltips.yaml...');
        const response = await fetch('/tooltips.yaml');
        if (!response.ok) {
            console.warn('Failed to load tooltips.yaml, using fallback config');
            tooltipConfig = fallbackConfig;
            return tooltipConfig;
        }
        
        console.log('Parsing YAML...');
        const yamlText = await response.text();
        tooltipConfig = load(yamlText) as TooltipConfig || fallbackConfig;
        console.log('Tooltip config loaded successfully:', Object.keys(tooltipConfig).length, 'entries');
        return tooltipConfig;
    } catch (error) {
        console.error('Error loading tooltip configuration:', error);
        console.log('Using fallback config');
        tooltipConfig = fallbackConfig;
        return tooltipConfig;
    }
};

// Get tooltip text for a specific column
export const getTooltipText = (columnName: string): string | null => {
    if (!tooltipConfig) {
        return null;
    }
    
    return tooltipConfig[columnName] || null;
};

// Reset tooltip config (useful for testing)
export const resetTooltipConfig = (): void => {
    tooltipConfig = null;
};