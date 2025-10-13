import tooltipsData from '../tooltips.json';

export interface TooltipConfig {
    [key: string]: string;
}

// Load tooltip configuration from JSON file
const tooltipConfig: TooltipConfig = tooltipsData as TooltipConfig;

// Get tooltip text for a specific column with case-insensitive matching
export const getTooltipText = (columnName: string): string | null => {
    if (!tooltipConfig) {
        return null;
    }
    
    // First try exact match
    if (tooltipConfig[columnName]) {
        return tooltipConfig[columnName];
    }
    
    // Try case-insensitive match
    const lowerKey = columnName.toLowerCase();
    for (const [tooltipKey, tooltipValue] of Object.entries(tooltipConfig)) {
        if (tooltipKey.toLowerCase() === lowerKey) {
            return tooltipValue;
        }
    }
    
    return null;
};