import React from 'react';
import { Scenario, UserElicitationData } from '../types';
import { DEFAULT_BASELINE, DEFAULT_TREATMENT } from '../services/distributionUtils';

interface ScenarioTableProps {
    scenarios: Scenario[];
    groups: string[];
    selectedGroup: string | null;
    selectedScenarioId: string | null;
    completionStatus: { [scenarioId: string]: boolean };
    userElicitationData: UserElicitationData;
    onSelectScenario: (id: string) => void;
    onSelectGroup: (group: string) => void;
    onAddScenario: (templateScenario: Scenario) => void;
    onDeleteScenario: (scenarioId: string) => void;
}

// Compact distribution slider component (no labels for non-selected rows)
const CompactDistributionSlider: React.FC<{
    min: number;
    mode: number;
    max: number;
    color: 'blue' | 'green';
}> = ({ min, mode, max, color }) => {
    const colorClass = color === 'blue' ? 'bg-blue-500' : 'bg-green-500';
    const bgColorClass = color === 'blue' ? 'bg-blue-100' : 'bg-green-100';
    
    return (
        <div className="relative w-full min-w-[80px] h-4 bg-gray-200 rounded flex items-center">
            <div 
                className={`absolute h-2 ${bgColorClass} rounded`}
                style={{ left: `${min}%`, width: `${max - min}%` }}
            />
            <div 
                className={`absolute w-2 h-2 ${colorClass} rounded-full`}
                style={{ left: `${min}%`, transform: 'translateX(-50%)' }}
            />
            <div 
                className={`absolute w-2 h-2 ${colorClass} rounded-full`}
                style={{ left: `${mode}%`, transform: 'translateX(-50%)' }}
            />
            <div 
                className={`absolute w-2 h-2 ${colorClass} rounded-full`}
                style={{ left: `${max}%`, transform: 'translateX(-50%)' }}
            />
        </div>
    );
};

// Full distribution slider component (with labels for selected row)
const FullDistributionSlider: React.FC<{
    min: number;
    mode: number;
    max: number;
    color: 'blue' | 'green';
    title: string;
}> = ({ min, mode, max, color, title }) => {
    const colorClass = color === 'blue' ? 'bg-blue-500' : 'bg-green-500';
    const bgColorClass = color === 'blue' ? 'bg-blue-100' : 'bg-green-100';
    const textColorClass = color === 'blue' ? 'text-blue-600' : 'text-green-600';
    
    return (
        <div className="space-y-0.5">
            <div className={`text-xs font-semibold ${textColorClass}`}>{title}</div>
            <div className="relative w-full min-w-[80px] h-4 bg-gray-200 rounded flex items-center">
                <div 
                    className={`absolute h-2 ${bgColorClass} rounded`}
                    style={{ left: `${min}%`, width: `${max - min}%` }}
                />
                <div 
                    className={`absolute w-2 h-2 ${colorClass} rounded-full`}
                    style={{ left: `${min}%`, transform: 'translateX(-50%)' }}
                />
                <div 
                    className={`absolute w-2 h-2 ${colorClass} rounded-full`}
                    style={{ left: `${mode}%`, transform: 'translateX(-50%)' }}
                />
                <div 
                    className={`absolute w-2 h-2 ${colorClass} rounded-full`}
                    style={{ left: `${max}%`, transform: 'translateX(-50%)' }}
                />
            </div>
            <div className="flex justify-between text-xs text-gray-500">
                <span>{min.toFixed(0)}%</span>
                <span>{mode.toFixed(0)}%</span>
                <span>{max.toFixed(0)}%</span>
            </div>
        </div>
    );
};

export const ScenarioTable: React.FC<ScenarioTableProps> = ({ 
    scenarios, 
    groups, 
    selectedGroup, 
    selectedScenarioId,
    completionStatus,
    userElicitationData,
    onSelectScenario, 
    onSelectGroup,
    onAddScenario,
    onDeleteScenario
}) => {

    const headers = scenarios.length > 0 ? Object.keys(scenarios[0]).filter(key => !['id', 'scenario_group'].includes(key)) : [];

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
           
            <div className="mt-4 overflow-x-auto max-h-72 overflow-y-auto border rounded-md">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                        <tr>
                            <th scope="col" className="px-6 py-2 w-20">Status</th>
                            {headers.map(header => (
                                <th key={header} scope="col" className="px-6 py-2">{header}</th>
                            ))}
                            <th scope="col" className="px-6 py-2 w-32">Baseline</th>
                            <th scope="col" className="px-6 py-2 w-32">Treatment</th>
                            <th scope="col" className="px-6 py-2 w-24">Confidence</th>
                            <th scope="col" className="px-6 py-2 w-32">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {scenarios.length > 0 ? (
                            scenarios.map((scenario) => {
                                const isSelected = selectedScenarioId === scenario.id;
                                const userData = userElicitationData[scenario.id];
                                
                                // Get distribution values or defaults
                                const baselineMin = userData?.baseline?.min ?? DEFAULT_BASELINE.min;
                                const baselineMode = userData?.baseline?.mode ?? DEFAULT_BASELINE.mode;
                                const baselineMax = userData?.baseline?.max ?? DEFAULT_BASELINE.max;
                                const treatmentMin = userData?.treatment?.min ?? DEFAULT_TREATMENT.min;
                                const treatmentMode = userData?.treatment?.mode ?? DEFAULT_TREATMENT.mode;
                                const treatmentMax = userData?.treatment?.max ?? DEFAULT_TREATMENT.max;
                                const confidence = userData?.baseline?.confidence ?? DEFAULT_BASELINE.confidence;
                                
                                return (
                                    <tr
                                        key={scenario.id}
                                        className={`border-b cursor-pointer transition-colors ${isSelected ? 'bg-blue-100 ring-2 ring-inset ring-blue-500' : 'bg-white hover:bg-gray-50'}`}
                                        onClick={() => onSelectScenario(scenario.id)}
                                    >
                                        <td className="px-6 py-2">
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
                                            <td key={`${scenario.id}-${header}`} className="px-6 py-2">
                                                {scenario[header]}
                                            </td>
                                        ))}
                                        <td className="px-6 py-2">
                                            {isSelected ? (
                                                <FullDistributionSlider 
                                                    min={baselineMin} 
                                                    mode={baselineMode} 
                                                    max={baselineMax} 
                                                    color="blue"
                                                    title="Baseline"
                                                />
                                            ) : (
                                                <CompactDistributionSlider 
                                                    min={baselineMin} 
                                                    mode={baselineMode} 
                                                    max={baselineMax} 
                                                    color="blue"
                                                />
                                            )}
                                        </td>
                                        <td className="px-6 py-2">
                                            {isSelected ? (
                                                <FullDistributionSlider 
                                                    min={treatmentMin} 
                                                    mode={treatmentMode} 
                                                    max={treatmentMax} 
                                                    color="green"
                                                    title="Treatment"
                                                />
                                            ) : (
                                                <CompactDistributionSlider 
                                                    min={treatmentMin} 
                                                    mode={treatmentMode} 
                                                    max={treatmentMax} 
                                                    color="green"
                                                />
                                            )}
                                        </td>
                                        <td className="px-6 py-2">
                                            {isSelected ? (
                                                <div className="flex flex-col items-center space-y-1">
                                                    <input 
                                                        type="range" 
                                                        min="1" 
                                                        max="100" 
                                                        value={confidence} 
                                                        readOnly
                                                        className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                    <span className="text-xs font-medium">{confidence}</span>
                                                </div>
                                            ) : (
                                                <div className="text-center text-sm font-medium text-gray-700">
                                                    {confidence}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-2">
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
                                <td colSpan={headers.length + 5} className="text-center py-4 text-gray-500">
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