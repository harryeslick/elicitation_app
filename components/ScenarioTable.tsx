import React, { useMemo, useState } from 'react';
import { DEFAULT_BASELINE, DEFAULT_SLIDER_RANGE, DEFAULT_TREATMENT } from '../services/distributionUtils';
import { getTooltipText } from '../services/tooltipService';
import { Scenario, UserDistribution, UserElicitationData } from '../types';
import { Tooltip } from './Tooltip';
import { TripleHandleSlider } from './TripleHandleSlider';

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
    onUpdateComment: (scenarioId: string, comment: string) => void;
}

// Helper function to calculate yield impact
const calculateYieldImpact = (lossPercentage: number, baselineYield: number): number => {
    return baselineYield * (1 - lossPercentage / 100);
};

const EMPTY_KEY = '__EMPTY__';

const isValueEmpty = (value: unknown): boolean => {
    if (value === null || value === undefined) {
        return true;
    }
    if (typeof value === 'string') {
        return value.trim() === '';
    }
    return false;
};

const getValueKey = (value: unknown): string => {
    if (value === null || value === undefined) {
        return EMPTY_KEY;
    }
    if (typeof value === 'number' && Number.isNaN(value)) {
        return '__NAN__';
    }
    return String(value);
};

const extractNumericValue = (value: unknown): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === 'string') {
        const normalized = value.replace(/,/g, '').trim();
        if (!normalized) return null;
        const match = normalized.match(/-?\d*\.?\d+/);
        return match ? Number(match[0]) : null;
    }
    return null;
};

type ColumnStyleResolver = (value: unknown) => React.CSSProperties | undefined;

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
    onDistributionChange,
    onUpdateComment
}) => {
    const [commentEditorScenario, setCommentEditorScenario] = useState<Scenario | null>(null);
    const [commentDraft, setCommentDraft] = useState('');

    const headers = scenarios.length > 0 ? Object.keys(scenarios[0]).filter(key => !['id', 'scenario_group', 'comment'].includes(key)) : [];

    const columnColorStyles = useMemo(() => {
        const styles: Record<string, ColumnStyleResolver> = {};

        headers.forEach((header, columnIndex) => {
            const columnValues = scenarios.map(s => s[header]);
            const meaningfulValues = columnValues.filter(value => !isValueEmpty(value));
            const uniqueValueKeys = Array.from(new Set(meaningfulValues.map(getValueKey)));

            if (uniqueValueKeys.length <= 1) {
                return;
            }

            const isNumericColumn = meaningfulValues.every(value => extractNumericValue(value) !== null);
            const baseHue = (columnIndex * 59) % 360;

            if (isNumericColumn) {
                const keyToNumeric = new Map<string, number>();
                meaningfulValues.forEach(value => {
                    const key = getValueKey(value);
                    if (!keyToNumeric.has(key)) {
                        const numericValue = extractNumericValue(value);
                        if (numericValue !== null) {
                            keyToNumeric.set(key, numericValue);
                        }
                    }
                });

                const sortedEntries = Array.from(keyToNumeric.entries()).sort((a, b) => a[1] - b[1]);
                if (sortedEntries.length <= 1) {
                    return;
                }

                styles[header] = (value: unknown) => {
                    if (isValueEmpty(value)) return undefined;
                    const key = getValueKey(value);
                    const entryIndex = sortedEntries.findIndex(([entryKey]) => entryKey === key);
                    if (entryIndex === -1) return undefined;
                    const steps = sortedEntries.length - 1;
                    const ratio = steps === 0 ? 0 : entryIndex / steps;
                    const lightnessStart = 92;
                    const lightnessEnd = 68;
                    const lightness = lightnessStart - (lightnessStart - lightnessEnd) * ratio;
                    const alphaStart = 0.35;
                    const alphaEnd = 0.7;
                    const alpha = alphaStart + (alphaEnd - alphaStart) * ratio;

                    return {
                        backgroundColor: `hsla(${baseHue}, 65%, ${lightness}%, ${alpha})`
                    };
                };
            } else {
                const valueCount = uniqueValueKeys.length;
                styles[header] = (value: unknown) => {
                    if (isValueEmpty(value)) return undefined;
                    const key = getValueKey(value);
                    const valueIndex = uniqueValueKeys.indexOf(key);
                    if (valueIndex === -1) return undefined;
                    const steps = Math.max(valueCount - 1, 1);
                    const ratio = valueIndex / steps;
                    const hueSpread = 160;
                    const hue = (baseHue + ratio * hueSpread) % 360;

                    return {
                        backgroundColor: `hsla(${hue}, 70%, 85%, 0.55)`
                    };
                };
            }
        });

        return styles;
    }, [headers, scenarios]);

    const handleCommentButtonClick = (event: React.MouseEvent, scenario: Scenario) => {
        event.stopPropagation();
        setCommentEditorScenario(scenario);
        setCommentDraft(scenario.comment ?? '');
    };

    const closeCommentEditor = () => {
        setCommentEditorScenario(null);
        setCommentDraft('');
    };

    const handleCommentSave = () => {
        if (commentEditorScenario) {
            onUpdateComment(commentEditorScenario.id, commentDraft);
        }
        closeCommentEditor();
    };

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

    const handleTripleSliderChange = (scenarioId: string, type: 'baseline' | 'treatment', values: { min: number; mode: number; max: number }) => {
        const currentUserDist = userElicitationData[scenarioId] || { 
            baseline: { min: null, max: null, mode: null, confidence: null }, 
            treatment: { min: null, max: null, mode: null, confidence: null } 
        };
        
        const defaults = type === 'baseline' ? DEFAULT_BASELINE : DEFAULT_TREATMENT;
        const currentConfidence = currentUserDist[type].confidence ?? defaults.confidence;

        // Convert back to UserDistribution (set to null if matches defaults)
        const newUserDistribution: UserDistribution = {
            min: values.min === defaults.min ? null : values.min,
            max: values.max === defaults.max ? null : values.max,
            mode: values.mode === defaults.mode ? null : values.mode,
            confidence: currentConfidence === defaults.confidence ? null : currentConfidence,
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
        <>
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
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0 z-10">
                        <tr>
                            <th scope="col" className="px-4 py-3 w-16">
                                <Tooltip text={getTooltipText('Status')}>
                                    Status
                                </Tooltip>
                            </th>
                            {headers.map(header => (
                                <th key={header} scope="col" className="px-4 py-3">
                                    <Tooltip text={getTooltipText(header)}>
                                        {header}
                                    </Tooltip>
                                </th>
                            ))}
                            <th scope="col" className="px-4 py-3 w-80">
                                <Tooltip text={getTooltipText('Distribution Parameters')}>
                                    Distribution Parameters
                                </Tooltip>
                            </th>
                            <th scope="col" className="px-4 py-3 w-20">
                                <Tooltip text={getTooltipText('Confidence')}>
                                    Confidence
                                </Tooltip>
                            </th>
                            <th scope="col" className="px-4 py-3 w-32">
                                <Tooltip text={getTooltipText('Actions')}>
                                    Actions
                                </Tooltip>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {scenarios.length > 0 ? (
                            scenarios.map((scenario, rowIndex) => {
                                const isSelected = selectedScenarioId === scenario.id;
                                const isCompleted = completionStatus[scenario.id];
                                const userDist = userElicitationData[scenario.id] || { 
                                    baseline: { min: null, max: null, mode: null, confidence: null }, 
                                    treatment: { min: null, max: null, mode: null, confidence: null } 
                                };
                                const baselineYield = yieldColumn && scenario[yieldColumn] ? scenario[yieldColumn] as number : undefined;

                                return (
                                    <tr
                                        key={`${scenario.id}-${rowIndex}`}
                                        className={`border-b cursor-pointer transition-all duration-200 ${
                                            isSelected 
                                                ? 'bg-blue-100 ring-2 ring-inset ring-blue-500 shadow-md' 
                                                : 'bg-white hover:bg-gray-50'
                                        }`}
                                        onClick={() => onSelectScenario(scenario.id)}
                                    >
                                        <td className={`px-4 ${isSelected ? 'py-4' : 'py-2'}`}>
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
                                        {headers.map(header => {
                                            const cellStyle = columnColorStyles[header]?.(scenario[header]);
                                            return (
                                                <td 
                                                    key={`${scenario.id}-${header}-${rowIndex}`}
                                                    className={`px-4 ${isSelected ? 'py-4' : 'py-2'}`}
                                                    style={cellStyle}
                                                >
                                                    {scenario[header]}
                                                </td>
                                            );
                                        })}
                                        
                        
                        {/* Distribution Parameters Column (without confidence) */}
                        <td className={`px-4 ${isSelected ? 'py-4' : 'py-2'}`} onClick={(e) => e.stopPropagation()}>
                            <div className={isSelected ? 'space-y-4' : 'space-y-2'}>
                                {/* Baseline Distribution */}
                                <div className={`${isSelected ? 'space-y-2' : ''} ${!isSelected ? 'pointer-events-none' : ''}`}>
                                    {isSelected && <div className="text-xs font-semibold text-blue-600 mb-2">BASELINE</div>}
                                    <TripleHandleSlider
                                        min={userDist.baseline.min ?? DEFAULT_BASELINE.min}
                                        mode={userDist.baseline.mode ?? DEFAULT_BASELINE.mode}
                                        max={userDist.baseline.max ?? DEFAULT_BASELINE.max}
                                        minBound={DEFAULT_SLIDER_RANGE.min}
                                        maxBound={DEFAULT_SLIDER_RANGE.max}
                                        disabled={!isSelected}
                                        color="blue"
                                        onChange={(values) => {
                                            handleTripleSliderChange(scenario.id, 'baseline', values);
                                            // If baseline changes and treatment exceeds it, adjust treatment
                                            const treatmentMin = userDist.treatment.min ?? DEFAULT_TREATMENT.min;
                                            const treatmentMode = userDist.treatment.mode ?? DEFAULT_TREATMENT.mode;
                                            const treatmentMax = userDist.treatment.max ?? DEFAULT_TREATMENT.max;
                                            
                                            if (treatmentMin > values.min || treatmentMode > values.mode || treatmentMax > values.max) {
                                                handleTripleSliderChange(scenario.id, 'treatment', {
                                                    min: Math.min(treatmentMin, values.min),
                                                    mode: Math.min(treatmentMode, values.mode),
                                                    max: Math.min(treatmentMax, values.max)
                                                });
                                            }
                                        }}
                                        yieldValue={baselineYield}
                                        showLabels={isSelected}
                                    />
                                </div>

                                {/* Treatment Distribution */}
                                <div className={`${isSelected ? 'space-y-2' : ''} ${!isSelected ? 'pointer-events-none' : ''}`}>
                                    {isSelected && <div className="text-xs font-semibold text-green-600 mb-2">TREATMENT</div>}
                                    <TripleHandleSlider
                                        min={userDist.treatment.min ?? DEFAULT_TREATMENT.min}
                                        mode={userDist.treatment.mode ?? DEFAULT_TREATMENT.mode}
                                        max={userDist.treatment.max ?? DEFAULT_TREATMENT.max}
                                        minBound={DEFAULT_SLIDER_RANGE.min}
                                        maxBound={DEFAULT_SLIDER_RANGE.max}
                                        disabled={!isSelected}
                                        color="green"
                                        onChange={(values) => {
                                            // Ensure treatment values don't exceed baseline values
                                            const baselineMin = userDist.baseline.min ?? DEFAULT_BASELINE.min;
                                            const baselineMode = userDist.baseline.mode ?? DEFAULT_BASELINE.mode;
                                            const baselineMax = userDist.baseline.max ?? DEFAULT_BASELINE.max;
                                            
                                            const constrainedValues = {
                                                min: Math.min(values.min, baselineMin),
                                                mode: Math.min(values.mode, baselineMode),
                                                max: Math.min(values.max, baselineMax)
                                            };
                                            
                                            handleTripleSliderChange(scenario.id, 'treatment', constrainedValues);
                                        }}
                                        yieldValue={baselineYield}
                                        showLabels={isSelected}
                                    />
                                </div>
                            </div>
                        </td>

                        {/* Separate Confidence Column */}
                        <td className={`px-2 ${isSelected ? 'py-4' : 'py-2'}`} onClick={(e) => e.stopPropagation()}>
                            {isSelected ? (
                                <div className="flex flex-col items-center space-y-3 h-full">
                                    {/* Baseline Confidence */}
                                    <div className="flex items-center gap-1">
                                        <div className="flex items-center justify-center" style={{ height: '80px', width: '24px' }}>
                                            <input 
                                                type="range" 
                                                min="50" 
                                                max="100" 
                                                value={userDist.baseline.confidence ?? DEFAULT_BASELINE.confidence}
                                                onChange={(e) => {
                                                    handleDistributionChange(scenario.id, 'baseline', 'confidence', Number(e.target.value));
                                                }}
                                                className="h-2 rounded-lg appearance-none cursor-pointer bg-gray-200 accent-blue-500"
                                                style={{ 
                                                    width: '80px',
                                                    transform: 'rotate(-90deg)',
                                                    transformOrigin: 'center center'
                                                }}
                                            />
                                        </div>
                                        <span className="text-xs font-medium text-blue-600">
                                            {userDist.baseline.confidence ?? DEFAULT_BASELINE.confidence}
                                        </span>
                                    </div>

                                    {/* Treatment Confidence */}
                                    <div className="flex items-center gap-1">
                                        <div className="flex items-center justify-center" style={{ height: '80px', width: '24px' }}>
                                            <input 
                                                type="range" 
                                                min="50" 
                                                max="100" 
                                                value={userDist.treatment.confidence ?? DEFAULT_TREATMENT.confidence}
                                                onChange={(e) => {
                                                    handleDistributionChange(scenario.id, 'treatment', 'confidence', Number(e.target.value));
                                                }}
                                                className="h-2 rounded-lg appearance-none cursor-pointer bg-gray-200 accent-green-500"
                                                style={{ 
                                                    width: '80px',
                                                    transform: 'rotate(-90deg)',
                                                    transformOrigin: 'center center'
                                                }}
                                            />
                                        </div>
                                        <span className="text-xs font-medium text-green-600">
                                            {userDist.treatment.confidence ?? DEFAULT_TREATMENT.confidence}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center space-y-2">
                                    {/* Just show the confidence values for non-selected rows */}
                                    <span className="text-xs font-medium text-blue-600">
                                        {userDist.baseline.confidence ?? DEFAULT_BASELINE.confidence}
                                    </span>
                                    <span className="text-xs font-medium text-green-600">
                                        {userDist.treatment.confidence ?? DEFAULT_TREATMENT.confidence}
                                    </span>
                                </div>
                            )}
                        </td>
                        <td className={`px-4 ${isSelected ? 'py-4' : 'py-2'}`}>
                            <div className="flex space-x-2">
                                <button
                                    onClick={(e) => handleCommentButtonClick(e, scenario)}
                                    className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                                    title={scenario.comment ? 'Edit comment' : 'Add comment'}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h8m-8 4h5M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H7l-4 4V7a2 2 0 012-2z" />
                                    </svg>
                                </button>
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
        {commentEditorScenario && (
            <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Comment for {commentEditorScenario.id}
                    </h3>
                    <textarea
                        value={commentDraft}
                        onChange={(e) => setCommentDraft(e.target.value)}
                        rows={6}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800"
                        placeholder="Add detailed notes for this scenario..."
                        autoFocus
                    />
                    <div className="flex justify-end space-x-3 mt-6">
                        <button
                            onClick={closeCommentEditor}
                            className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleCommentSave}
                            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                        >
                            Save Comment
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
};
