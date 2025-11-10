import React, { useMemo, useState } from 'react';
import { ScenarioTableSimple } from './components/ScenarioTableSimple';
import { DEFAULT_ELICITATION_DATA } from './constants';
import { Scenario, UserElicitationData } from './types';

const App: React.FC = () => {
    const [scenarios] = useState<Scenario[]>(DEFAULT_ELICITATION_DATA.scenarios);
    const [userElicitationData] = useState<UserElicitationData>(DEFAULT_ELICITATION_DATA.userElicitationData);
    
    const scenarioGroups = useMemo(() => {
        const groups = new Set(scenarios.map(s => s.scenario_group));
        return Array.from(groups);
    }, [scenarios]);
    
    const [selectedGroup] = useState<string | null>(scenarioGroups.length > 0 ? scenarioGroups[0] : null);
    const [selectedScenarioId] = useState<string | null>(null);
    
    // Simple completion status - all false for now
    const completionStatus = useMemo(() => {
        const status: { [scenarioId: string]: boolean } = {};
        scenarios.forEach(s => {
            status[s.id] = false;
        });
        return status;
    }, [scenarios]);
    
    return (
        <div className="min-h-screen bg-gray-100">
            <div className="max-w-7xl mx-auto py-4 px-4">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">
                    Expert Elicitation for Lupin Sclerotinia Management
                </h1>
                <ScenarioTableSimple
                    scenarios={scenarios}
                    groups={scenarioGroups}
                    selectedGroup={selectedGroup}
                    selectedScenarioId={selectedScenarioId}
                    completionStatus={completionStatus}
                    userElicitationData={userElicitationData}
                    yieldColumn={DEFAULT_ELICITATION_DATA.yieldColumn}
                    onSelectScenario={() => {}}
                    onSelectGroup={() => {}}
                    onAddScenario={() => {}}
                    onDeleteScenario={() => {}}
                    onDistributionChange={() => {}}
                />
            </div>
        </div>
    );
};

export default App;
