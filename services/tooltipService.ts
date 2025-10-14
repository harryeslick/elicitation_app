import tooltipsData from '../tooltips.json';

export interface TooltipConfig {
    [key: string]: string;
}

interface TooltipsStructure {
    table_headers: TooltipConfig;
    distribution_parameters: TooltipConfig;
}

// Load tooltip configuration from JSON file
const tooltips = tooltipsData as TooltipsStructure;

// Get tooltip text for table headers with case-insensitive matching
export const getTooltipText = (columnName: string): string | null => {
    if (!tooltips || !tooltips.table_headers) {
        return null;
    }
    
    const config = tooltips.table_headers;
    
    // First try exact match
    if (config[columnName]) {
        return config[columnName];
    }
    
    // Try case-insensitive match
    const lowerKey = columnName.toLowerCase();
    for (const [tooltipKey, tooltipValue] of Object.entries(config)) {
        if (tooltipKey.toLowerCase() === lowerKey) {
            return tooltipValue;
        }
    }
    
    return null;
};

// Get tooltip text for distribution parameters (Min, Mode, Max)
export const getDistributionParamTooltip = (paramName: string): string | null => {
    if (!tooltips || !tooltips.distribution_parameters) {
        return null;
    }
    
    const config = tooltips.distribution_parameters;
    
    // First try exact match
    if (config[paramName]) {
        return config[paramName];
    }
    
    // Try case-insensitive match
    const lowerKey = paramName.toLowerCase();
    for (const [tooltipKey, tooltipValue] of Object.entries(config)) {
        if (tooltipKey.toLowerCase() === lowerKey) {
            return tooltipValue;
        }
    }
    
    return null;
};