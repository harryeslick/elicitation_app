import React from 'react';
import { Scenario } from '../types';

interface ScenarioTableProps {
    scenarios: Scenario[];
    groups: string[];
    selectedGroup: string | null;
    selectedScenarioId: string | null;
    onSelectScenario: (id: string) => void;
    onSelectGroup: (group: string) => void;
}

export const ScenarioTable: React.FC<ScenarioTableProps> = ({ scenarios, groups, selectedGroup, selectedScenarioId, onSelectScenario, onSelectGroup }) => {

    const headers = scenarios.length > 0 ? Object.keys(scenarios[0]).filter(key => !['id', 'scenario_group'].includes(key)) : [];

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
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={headers.length} className="text-center py-4 text-gray-500">
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