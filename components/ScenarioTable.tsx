import React from 'react';
import { Scenario } from '../types';

interface ScenarioTableProps {
    scenarios: Scenario[];
    groups: string[];
    selectedGroup: string | null;
    selectedScenarioId: string | null;
    onSelectScenario: (id: string) => void;
    onSelectGroup: (group: string) => void;
    onAddScenario: (templateScenario: Scenario) => void;
    onDeleteScenario: (scenarioId: string) => void;
}

export const ScenarioTable: React.FC<ScenarioTableProps> = ({ 
    scenarios, 
    groups, 
    selectedGroup, 
    selectedScenarioId, 
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
                            {headers.map(header => (
                                <th key={header} scope="col" className="px-6 py-3">{header}</th>
                            ))}
                            <th scope="col" className="px-6 py-3 w-32">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {scenarios.length > 0 ? (
                            scenarios.map((scenario) => (
                                <tr
                                    key={scenario.id}
                                    className={`border-b hover:bg-gray-100 cursor-pointer ${selectedScenarioId === scenario.id ? 'bg-blue-100 ring-2 ring-inset ring-blue-500' : 'bg-white'}`}
                                    onClick={() => onSelectScenario(scenario.id)}
                                >
                                    {headers.map(header => (
                                        <td key={`${scenario.id}-${header}`} className="px-6 py-4">
                                            {scenario[header]}
                                        </td>
                                    ))}
                                    <td className="px-6 py-4">
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
                            ))
                        ) : (
                            <tr>
                                <td colSpan={headers.length + 1} className="text-center py-4 text-gray-500">
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