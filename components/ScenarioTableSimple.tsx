import React from 'react';
import { Scenario, UserDistribution, UserElicitationData } from '../types';

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

export const ScenarioTableSimple: React.FC<ScenarioTableProps> = ({ 
    scenarios, 
    groups, 
    selectedGroup, 
    completionStatus
}) => {
    const scenariosInGroup = selectedGroup 
        ? scenarios.filter(s => s.scenario_group === selectedGroup) 
        : [];

    return (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <h2 className="text-xl font-semibold p-4 bg-gray-50 border-b">
                Scenarios Table (Simple Version)
            </h2>
            
            {/* Groups */}
            <div className="p-4 border-b">
                <h3 className="font-medium mb-2">Groups:</h3>
                <div className="flex gap-2">
                    {groups.map(group => (
                        <span key={group} className="px-2 py-1 bg-blue-100 rounded text-sm">
                            {group}
                        </span>
                    ))}
                </div>
            </div>

            {/* Scenarios */}
            <div className="p-4">
                <h3 className="font-medium mb-2">
                    Scenarios in {selectedGroup || 'No Group'}: {scenariosInGroup.length}
                </h3>
                
                {scenariosInGroup.length > 0 ? (
                    <div className="space-y-2">
                        {scenariosInGroup.map(scenario => (
                            <div 
                                key={scenario.id} 
                                className={`p-2 border rounded ${
                                    completionStatus[scenario.id] ? 'bg-green-50' : 'bg-gray-50'
                                }`}
                            >
                                <div className="font-medium">{scenario.scenario_name}</div>
                                <div className="text-sm text-gray-600">
                                    ID: {scenario.id} | Status: {completionStatus[scenario.id] ? 'Complete' : 'Incomplete'}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500">No scenarios in this group</p>
                )}
            </div>
        </div>
    );
};

export default ScenarioTableSimple;