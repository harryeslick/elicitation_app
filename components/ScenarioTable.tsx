import React, { useState } from 'react';
import { DEFAULT_BASELINE, DEFAULT_TREATMENT } from '../services/distributionUtils';
import { Scenario, UserDistribution, UserElicitationData } from '../types';
import { Tooltip } from './Tooltip';

// Tooltips based on your YAML configuration
const TOOLTIPS: { [key: string]: string } = {
    'Status': 'Completion status indicator showing whether expert has provided custom distribution parameters (✓) or is using default values (○)',
    'STATUS': 'Geographic location or site where the scenario takes place',
    'CANOLA_PCT': 'Type of crop or vegetation being studied in this scenario',
    'SPORACLE': 'Total area of the field or study site in hectares',
    'BASELINE DISTRIBUTION': 'Expected yield per hectare under normal conditions (tonnes per hectare)',
    'Baseline Distribution': 'Distribution parameters for expected outcomes WITHOUT any treatment intervention. Represents the range of possible damage/loss percentages under baseline conditions.',
    'Treatment Distribution': 'Distribution parameters for expected outcomes AFTER applying treatment intervention. Values should be equal to or better than baseline (≤ baseline for damage scenarios).',
    'Actions': 'Available actions for this scenario including duplicate and delete options',
    'ACTIONS': 'Total expected yield for the entire field (tonnes)',
    'Yield (t)': 'Total expected yield for the entire field (tonnes)',
    'Scenario': 'Unique identifier or name for this scenario',
    'scenario_name': 'Unique identifier or name for this scenario',
    'Group': 'Category or grouping that this scenario belongs to',
    'Region': 'Geographic region or administrative area',
    'Treatment': 'Type of intervention or treatment being applied',
    'Control': 'Control or reference condition for comparison',
    'Farm': 'Farm or property identifier',
    'Season': 'Growing season or time period',
    'Variety': 'Crop variety or cultivar being studied',
    'Planting Date': 'Date when the crop was planted',
    'Harvest Date': 'Expected or actual harvest date',
    'Soil Type': 'Classification of soil type in the field',
    'Irrigation': 'Irrigation system or water management approach',
    'Climate': 'Climate classification or conditions',
    'Elevation': 'Elevation above sea level (meters)',
    'Rainfall': 'Annual or seasonal rainfall (mm)',
    'Temperature': 'Average temperature during growing season (°C)',
    'Humidity': 'Relative humidity levels (%)'
};

const getTooltipText = (key: string): string | null => {
    // First try exact match
    if (TOOLTIPS[key]) {
        return TOOLTIPS[key];
    }
    
    // Try case-insensitive match
    const lowerKey = key.toLowerCase();
    for (const [tooltipKey, tooltipValue] of Object.entries(TOOLTIPS)) {
        if (tooltipKey.toLowerCase() === lowerKey) {
            return tooltipValue;
        }
    }
    
    return null;
};

interface ScenarioTableProps {
    scenarios: Scenario[];
    groups: string[];
    selectedGroup: string | null;
    selectedScenarioId: string | null;
    completionStatus: { [scenarioId: string]: boolean };
    userElicitationData: UserElicitationData;
    yieldColumn: string | null;
    onSelectScenario: (id: string) => void;
    onSelectGroup: (group: string) => void;
    onAddScenario: (templateScenario: Scenario) => void;
    onDeleteScenario: (scenarioId: string) => void;
    onDistributionChange: (scenarioId: string, type: 'baseline' | 'treatment', newDistribution: UserDistribution) => void;
}

// Helper function to calculate yield impact
const calculateYieldImpact = (lossPercentage: number, baselineYield: number): number => {
    return baselineYield * (1 - lossPercentage / 100);
};

export const ScenarioTable: React.FC<ScenarioTableProps> = ({ 
    scenarios, 
    groups, 
    selectedGroup, 
    selectedScenarioId,
    completionStatus,
    userElicitationData,
    yieldColumn,
    onSelectScenario, 
    onSelectGroup,
    onAddScenario,
    onDeleteScenario,
    onDistributionChange
}) => {
    const [tooltipsLoaded] = useState(true); // Always true since we're using hardcoded tooltips
    
    const headers = scenarios.length > 0 ? Object.keys(scenarios[0]).filter(key => !['id', 'scenario_group'].includes(key)) : [];

    const handleDistributionChange = (scenarioId: string, type: 'baseline' | 'treatment', field: keyof UserDistribution, value: number) => {
        const currentUserDist = userElicitationData[scenarioId] || { 
            baseline: { min: null, max: null, mode: null, confidence: null }, 
            treatment: { min: null, max: null, mode: null, confidence: null } 
        };
        
        const currentData = currentUserDist[type];
        const defaults = type === 'baseline' ? DEFAULT_BASELINE : DEFAULT_TREATMENT;
        
        // Get current values (use defaults for null values)
        const currentMin = currentData.min ?? defaults.min;
        const currentMax = currentData.max ?? defaults.max;
        const currentMode = currentData.mode ?? defaults.mode;
        const currentConfidence = currentData.confidence ?? defaults.confidence;

        let { min, max, mode, confidence } = { 
            min: currentMin, 
            max: currentMax, 
            mode: currentMode, 
            confidence: currentConfidence 
        };
        
        // Apply max constraints for treatment (treatment values cannot exceed baseline values)
        const getMaxConstraint = (field: keyof UserDistribution) => {
            if (type === 'treatment' && field !== 'confidence') {
                const baselineData = currentUserDist.baseline;
                const baselineValue = baselineData[field as keyof UserDistribution] ?? DEFAULT_BASELINE[field as keyof UserDistribution];
                return Math.min(100, baselineValue);
            }
            return 100;
        };
        
        switch (field) {
            case 'min':
                min = Math.round(Math.max(0, Math.min(value, getMaxConstraint('min'))));
                if (min > mode) {
                    mode = Math.min(min, getMaxConstraint('mode'));
                }
                break;
            case 'max':
                max = Math.round(Math.min(getMaxConstraint('max'), Math.max(value, 0)));
                if (max < mode) {
                    mode = max;
                }
                break;
            case 'mode':
                mode = Math.round(Math.max(min, Math.min(value, Math.min(max, getMaxConstraint('mode')))));
                break;
            case 'confidence':
                confidence = Math.round(Math.max(1, Math.min(value, 100)));
                break;
        }

        // Convert back to UserDistribution (set to null if matches defaults)
        const newUserDistribution: UserDistribution = {
            min: min === defaults.min ? null : min,
            max: max === defaults.max ? null : max,
            mode: mode === defaults.mode ? null : mode,
            confidence: confidence === defaults.confidence ? null : confidence,
        };

        onDistributionChange(scenarioId, type, newUserDistribution);
    };

    const handleDuplicateScenario = (scenario: Scenario) => {
        onAddScenario(scenario);
    };

    const handleDeleteScenario = (e: React.MouseEvent, scenarioId: string) => {
        e.stopPropagation(); // Prevent row selection
        onDeleteScenario(scenarioId);
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <div className="sm:flex sm:items-baseline">
                 <h2 className="text-xl font-semibold text-gray-800">Scenarios</h2>
                 <div className="mt-4 sm:mt-0 sm:ml-10">
                    <nav className="-mb-px flex space-x-8">
                        {groups.map((group) => (
                        <button
                            key={group}
                            onClick={() => onSelectGroup(group)}
                            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                                selectedGroup === group
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            {group}
                        </button>
                        ))}
                    </nav>
                </div>
            </div>
           
            <div className="mt-4 overflow-x-auto max-h-[600px] overflow-y-auto border rounded-md">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                        <tr>
                            <th scope="col" className="px-4 py-3 w-16">
                                <Tooltip text={tooltipsLoaded ? getTooltipText('Status') : null}>
                                    Status
                                </Tooltip>
                            </th>
                            {headers.map(header => (
                                <th key={header} scope="col" className="px-4 py-3">
                                    <Tooltip text={tooltipsLoaded ? getTooltipText(header) : null}>
                                        {header}
                                    </Tooltip>
                                </th>
                            ))}
                            <th scope="col" className="px-4 py-3 w-80">
                                <Tooltip text={tooltipsLoaded ? getTooltipText('Baseline Distribution') : null}>
                                    Baseline Distribution
                                </Tooltip>
                            </th>
                            <th scope="col" className="px-4 py-3 w-80">
                                <Tooltip text={tooltipsLoaded ? getTooltipText('Treatment Distribution') : null}>
                                    Treatment Distribution
                                </Tooltip>
                            </th>
                            <th scope="col" className="px-4 py-3 w-32">
                                <Tooltip text={tooltipsLoaded ? getTooltipText('Actions') : null}>
                                    Actions
                                </Tooltip>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {scenarios.length > 0 ? (
                            scenarios.map((scenario) => {
                                const isSelected = selectedScenarioId === scenario.id;
                                const isCompleted = completionStatus[scenario.id];
                                const userDist = userElicitationData[scenario.id] || { 
                                    baseline: { min: null, max: null, mode: null, confidence: null }, 
                                    treatment: { min: null, max: null, mode: null, confidence: null } 
                                };
                                const baselineYield = yieldColumn && scenario[yieldColumn] ? scenario[yieldColumn] as number : undefined;

                                return (
                                    <tr
                                        key={scenario.id}
                                        className={`border-b cursor-pointer transition-all duration-200 ${
                                            isSelected 
                                                ? 'bg-blue-50 ring-2 ring-inset ring-blue-500 shadow-sm' 
                                                : 'bg-white hover:bg-gray-50 opacity-70 hover:opacity-90'
                                        }`}
                                        onClick={() => onSelectScenario(scenario.id)}
                                    >
                                        <td className="px-4 py-4">
                                            <div className="flex items-center justify-center">
                                                {completionStatus[scenario.id] ? (
                                                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" />
                                                    </svg>
                                                )}
                                            </div>
                                        </td>
                                        {headers.map(header => (
                                            <td key={`${scenario.id}-${header}`} className="px-4 py-4">
                                                {scenario[header]}
                                            </td>
                                        ))}
                                        
                                        {/* Baseline Distribution Column */}
                                        <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                                            <div className="space-y-2">
                                                <div className="text-xs font-semibold text-blue-600 mb-2">BASELINE</div>
                                                
                                                <div className="grid grid-cols-3 gap-2 text-xs">
                                                    {(['min', 'mode', 'max'] as const).map((field) => {
                                                        const value = userDist.baseline[field] ?? DEFAULT_BASELINE[field];
                                                        return (
                                                            <div key={field} className="space-y-1">
                                                                <label className="block text-gray-700 capitalize">{field}</label>
                                                                <input
                                                                    type="range"
                                                                    min="0"
                                                                    max="100"
                                                                    value={value}
                                                                    disabled={!isSelected}
                                                                    onChange={(e) => {
                                                                        if (isSelected) {
                                                                            handleDistributionChange(scenario.id, 'baseline', field, Number(e.target.value));
                                                                        }
                                                                    }}
                                                                    className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${
                                                                        isSelected 
                                                                            ? 'bg-gray-200 accent-blue-500' 
                                                                            : isCompleted 
                                                                                ? 'bg-gray-100 accent-blue-400 opacity-75' 
                                                                                : 'bg-gray-50 accent-gray-300 opacity-30'
                                                                    }`}
                                                                />
                                                                <div className="flex justify-between items-center">
                                                                    <span className={`font-medium ${
                                                                        isSelected 
                                                                            ? 'text-blue-600' 
                                                                            : isCompleted 
                                                                                ? 'text-blue-500 opacity-75' 
                                                                                : 'text-gray-400 opacity-50'
                                                                    }`}>{Math.round(value)}%</span>
                                                                    {baselineYield && (
                                                                        <span className={`text-xs ${
                                                                            isSelected 
                                                                                ? 'text-blue-500' 
                                                                                : isCompleted 
                                                                                    ? 'text-blue-400 opacity-75' 
                                                                                    : 'text-gray-400 opacity-50'
                                                                        }`}>
                                                                            {calculateYieldImpact(value, baselineYield).toFixed(1)}t
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                
                                                <div className="mt-2">
                                                    <label className="block text-gray-700 text-xs">Confidence</label>
                                                    <input 
                                                        type="range" 
                                                        min="1" 
                                                        max="100" 
                                                        value={userDist.baseline.confidence ?? DEFAULT_BASELINE.confidence}
                                                        disabled={!isSelected}
                                                        onChange={(e) => {
                                                            if (isSelected) {
                                                                handleDistributionChange(scenario.id, 'baseline', 'confidence', Number(e.target.value));
                                                            }
                                                        }}
                                                        className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${
                                                            isSelected 
                                                                ? 'bg-gray-200 accent-blue-500' 
                                                                : isCompleted 
                                                                    ? 'bg-gray-100 accent-blue-400 opacity-75' 
                                                                    : 'bg-gray-50 accent-gray-300 opacity-30'
                                                        }`}
                                                    />
                                                    <span className={`font-medium text-xs ${
                                                        isSelected 
                                                            ? 'text-blue-600' 
                                                            : isCompleted 
                                                                ? 'text-blue-500 opacity-75' 
                                                                : 'text-gray-400 opacity-50'
                                                    }`}>
                                                        {userDist.baseline.confidence ?? DEFAULT_BASELINE.confidence}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Treatment Distribution Column */}
                                        <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                                            <div className="space-y-2">
                                                <div className="text-xs font-semibold text-green-600 mb-2">TREATMENT</div>
                                                
                                                <div className="grid grid-cols-3 gap-2 text-xs">
                                                    {(['min', 'mode', 'max'] as const).map((field) => {
                                                        const value = userDist.treatment[field] ?? DEFAULT_TREATMENT[field];
                                                        const baselineValue = userDist.baseline[field] ?? DEFAULT_BASELINE[field];
                                                        return (
                                                            <div key={field} className="space-y-1">
                                                                <label className="block text-gray-700 capitalize">{field}</label>
                                                                <input
                                                                    type="range"
                                                                    min="0"
                                                                    max={Math.min(100, baselineValue)}
                                                                    value={value}
                                                                    disabled={!isSelected}
                                                                    onChange={(e) => {
                                                                        if (isSelected) {
                                                                            handleDistributionChange(scenario.id, 'treatment', field, Number(e.target.value));
                                                                        }
                                                                    }}
                                                                    className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${
                                                                        isSelected 
                                                                            ? 'bg-gray-200 accent-green-500' 
                                                                            : isCompleted 
                                                                                ? 'bg-gray-100 accent-green-400 opacity-75' 
                                                                                : 'bg-gray-50 accent-gray-300 opacity-30'
                                                                    }`}
                                                                />
                                                                <div className="flex justify-between items-center">
                                                                    <span className={`font-medium ${
                                                                        isSelected 
                                                                            ? 'text-green-600' 
                                                                            : isCompleted 
                                                                                ? 'text-green-500 opacity-75' 
                                                                                : 'text-gray-400 opacity-50'
                                                                    }`}>{Math.round(value)}%</span>
                                                                    {baselineYield && (
                                                                        <span className={`text-xs ${
                                                                            isSelected 
                                                                                ? 'text-green-500' 
                                                                                : isCompleted 
                                                                                    ? 'text-green-400 opacity-75' 
                                                                                    : 'text-gray-400 opacity-50'
                                                                        }`}>
                                                                            {calculateYieldImpact(value, baselineYield).toFixed(1)}t
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                
                                                <div className="mt-2">
                                                    <label className="block text-gray-700 text-xs">Confidence</label>
                                                    <input 
                                                        type="range" 
                                                        min="1" 
                                                        max="100" 
                                                        value={userDist.treatment.confidence ?? DEFAULT_TREATMENT.confidence}
                                                        disabled={!isSelected}
                                                        onChange={(e) => {
                                                            if (isSelected) {
                                                                handleDistributionChange(scenario.id, 'treatment', 'confidence', Number(e.target.value));
                                                            }
                                                        }}
                                                        className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${
                                                            isSelected 
                                                                ? 'bg-gray-200 accent-green-500' 
                                                                : isCompleted 
                                                                    ? 'bg-gray-100 accent-green-400 opacity-75' 
                                                                    : 'bg-gray-50 accent-gray-300 opacity-30'
                                                        }`}
                                                    />
                                                    <span className={`font-medium text-xs ${
                                                        isSelected 
                                                            ? 'text-green-600' 
                                                            : isCompleted 
                                                                ? 'text-green-500 opacity-75' 
                                                                : 'text-gray-400 opacity-50'
                                                    }`}>
                                                        {userDist.treatment.confidence ?? DEFAULT_TREATMENT.confidence}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-4 py-4">
                                            <div className="flex space-x-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDuplicateScenario(scenario);
                                                }}
                                                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                                title="Duplicate scenario"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={(e) => handleDeleteScenario(e, scenario.id)}
                                                className="text-red-600 hover:text-red-800 text-sm font-medium"
                                                title="Delete scenario"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })
                        ) : (
                            <tr>
                                <td colSpan={headers.length + 4} className="text-center py-4 text-gray-500">
                                    No scenarios in this group.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};