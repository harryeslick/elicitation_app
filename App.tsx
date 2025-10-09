import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { ScenarioTable } from './components/ScenarioTable';
import { DistributionChart } from './components/DistributionChart';
import { ControlPanel } from './components/ControlPanel';
import { DistributionInputs } from './components/DistributionInputs';
import { Scenario, Distribution, ElicitationData, ScenarioDistribution } from './types';
import { INITIAL_SCENARIOS } from './constants';
import { parseCSV, generateCSV } from './services/csvUtils';

const App: React.FC = () => {
    const [scenarios] = useState<Scenario[]>(INITIAL_SCENARIOS);
    const [elicitationData, setElicitationData] = useState<ElicitationData>({});
    
    const scenarioGroups = useMemo(() => {
        const groups = new Set(scenarios.map(s => s.scenario_group));
        return Array.from(groups);
    }, [scenarios]);
    
    const [selectedGroup, setSelectedGroup] = useState<string | null>(scenarioGroups.length > 0 ? scenarioGroups[0] : null);

    const scenariosInGroup = useMemo(() => {
        if (!selectedGroup) return [];
        return scenarios.filter(s => s.scenario_group === selectedGroup);
    }, [scenarios, selectedGroup]);

    const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(scenariosInGroup.length > 0 ? scenariosInGroup[0].id : null);

    useEffect(() => {
        // When group changes, select the first scenario of the new group
        if (scenariosInGroup.length > 0) {
            const currentScenarioIsInNewGroup = scenariosInGroup.some(s => s.id === selectedScenarioId);
            if (!currentScenarioIsInNewGroup) {
                setSelectedScenarioId(scenariosInGroup[0].id);
            }
        } else {
            setSelectedScenarioId(null);
        }
    }, [selectedGroup, scenariosInGroup, selectedScenarioId]);


    const handleDistributionChange = useCallback((scenarioId: string, type: 'baseline' | 'treatment', newDistribution: Distribution) => {
        setElicitationData(prev => ({
            ...prev,
            [scenarioId]: {
                ...(prev[scenarioId] || {
                    baseline: { min: 0, max: 100, mode: 50, confidence: 50 },
                    treatment: { min: 0, max: 100, mode: 50, confidence: 50 }
                }),
                [type]: newDistribution
            }
        }));
    }, []);

    const handleFileUpload = useCallback((file: File) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                const data = parseCSV(text, scenarios);
                setElicitationData(data);
                alert('Data loaded successfully!');
            } catch (error) {
                console.error("Failed to parse CSV:", error);
                alert('Error loading file. Please ensure it is a valid CSV file from a previous session.');
            }
        };
        reader.readAsText(file);
    }, [scenarios]);
    
    const handleFileDownload = useCallback(() => {
        try {
            const csvContent = generateCSV(scenarios, elicitationData);
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', 'elicitation_results.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Failed to generate CSV:", error);
            alert('Error generating file for download.');
        }
    }, [scenarios, elicitationData]);

    const handleSelectScenario = useCallback((scenarioId: string) => {
        setSelectedScenarioId(scenarioId);
    }, []);

    const handleSelectGroup = useCallback((group: string) => {
        setSelectedGroup(group);
    }, []);

    const currentDistribution = useMemo<ScenarioDistribution | undefined>(() => {
        if (!selectedScenarioId) return undefined;
        return elicitationData[selectedScenarioId];
    }, [selectedScenarioId, elicitationData]);

    const dataForChart = useMemo(() => {
        const scenarioIdsInGroup = new Set(scenariosInGroup.map(s => s.id));
        const filteredData: ElicitationData = {};
        for (const scenarioId in elicitationData) {
            if (scenarioIdsInGroup.has(scenarioId)) {
                filteredData[scenarioId] = elicitationData[scenarioId];
            }
        }
        return filteredData;
    }, [elicitationData, scenariosInGroup]);

    return (
        <div className="min-h-screen bg-gray-50 text-gray-800 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="mb-8">
                    <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Expert Elicitation for Ecological Modeling</h1>
                    <p className="mt-2 text-lg text-gray-600">Define outcome distributions for baseline and treatment scenarios based on your expert knowledge.</p>
                </header>
                
                <main className="flex flex-col gap-8">
                    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                         <h2 className="text-xl font-semibold mb-4 text-gray-800">Instructions</h2>
                        <ol className="list-decimal list-inside space-y-2 text-gray-700">
                            <li>Select a scenario group using the tabs (e.g., 'Pest Pressure').</li>
                            <li>Select a specific scenario from the table. The selected row will be highlighted.</li>
                            <li>On the chart, adjust the distributions for 'Baseline' (blue) and 'Treatment' (green) outcomes.</li>
                            <li>Drag the circular handles on the chart or type values directly into the 'Distribution Parameters' panel.</li>
                            <li>Use the sliders to indicate your <span className="font-semibold">Confidence</span> in each distribution.</li>
                            <li>Faded lines on the chart show other distributions from the <span className="font-semibold">current group</span> for comparison.</li>
                            <li>Your progress is saved automatically. Use the controls to download or upload your session.</li>
                        </ol>
                    </div>

                    <ScenarioTable 
                        scenarios={scenariosInGroup} 
                        groups={scenarioGroups}
                        selectedGroup={selectedGroup}
                        selectedScenarioId={selectedScenarioId}
                        onSelectScenario={handleSelectScenario}
                        onSelectGroup={handleSelectGroup}
                    />

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="space-y-8">
                           <ControlPanel onUpload={handleFileUpload} onDownload={handleFileDownload} />
                            {selectedScenarioId && (
                                <DistributionInputs
                                    scenarioId={selectedScenarioId}
                                    distribution={currentDistribution}
                                    onDistributionChange={handleDistributionChange}
                                />
                            )}
                        </div>
                        
                        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md border border-gray-200 min-h-[500px]">
                            {selectedScenarioId && (
                               <DistributionChart
                                    key={selectedScenarioId} // Force re-render on scenario change
                                    scenarioId={selectedScenarioId}
                                    allData={dataForChart}
                                    onDistributionChange={handleDistributionChange}
                                    selectedDistribution={currentDistribution}
                               />
                            )}
                            {!selectedScenarioId && (
                                <div className="flex items-center justify-center h-full">
                                    <p className="text-gray-500">Select a scenario to begin.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default App;