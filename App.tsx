import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ConfirmationModal } from './components/ConfirmationModal';
import { ControlPanel } from './components/ControlPanel';
import { D3DistributionChart } from './components/D3DistributionChart';
import { DistributionInputs } from './components/DistributionInputs';
import { ScenarioEditModal } from './components/ScenarioEditModal';
import { ScenarioTable } from './components/ScenarioTable';
import { INITIAL_SCENARIOS } from './constants';
import { generateCSV, parseCSV, ParsedCSVData } from './services/csvUtils';
import { getEmptyUserScenario, hasScenarioUserEdits, userScenarioToScenario } from './services/distributionUtils';
import { ElicitationData, Scenario, ScenarioDistribution, UserDistribution, UserElicitationData, UserScenarioDistribution } from './types';

const App: React.FC = () => {
    const [scenarios, setScenarios] = useState<Scenario[]>(INITIAL_SCENARIOS);
    const [userElicitationData, setUserElicitationData] = useState<UserElicitationData>({});
    
    // Modal states
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [scenarioToEdit, setScenarioToEdit] = useState<Scenario | null>(null);
    const [confirmDeleteModalOpen, setConfirmDeleteModalOpen] = useState(false);
    const [scenarioToDelete, setScenarioToDelete] = useState<string | null>(null);
    
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


    const handleDistributionChange = useCallback((scenarioId: string, type: 'baseline' | 'treatment', newDistribution: UserDistribution) => {
        setUserElicitationData(prev => {
            const existingScenario = prev[scenarioId] || getEmptyUserScenario();
            
            return {
                ...prev,
                [scenarioId]: {
                    ...existingScenario,
                    [type]: newDistribution
                }
            };
        });
    }, []);

    const handleFileUpload = useCallback((file: File) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                const parsedData: ParsedCSVData = parseCSV(text, scenarios);
                
                // Update both scenarios and elicitation data
                setScenarios(parsedData.scenarios);
                setUserElicitationData(parsedData.userElicitationData);
                
                // If current selected group doesn't exist in loaded scenarios, reset to first group
                const loadedGroups = [...new Set(parsedData.scenarios.map(s => s.scenario_group))];
                if (selectedGroup && !loadedGroups.includes(selectedGroup)) {
                    setSelectedGroup(loadedGroups.length > 0 ? loadedGroups[0] : null);
                }
                
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
            const csvContent = generateCSV(scenarios, userElicitationData);
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
    }, [scenarios, userElicitationData]);

    const handleSelectScenario = useCallback((scenarioId: string) => {
        setSelectedScenarioId(scenarioId);
    }, []);

    const handleSelectGroup = useCallback((group: string) => {
        setSelectedGroup(group);
    }, []);

    const handleAddScenario = useCallback((templateScenario: Scenario) => {
        // Create a duplicate scenario with a new ID
        const newId = `scenario_${Date.now()}`;
        const newScenario: Scenario = {
            ...templateScenario,
            id: newId
        };
        
        setScenarioToEdit(newScenario);
        setEditModalOpen(true);
    }, []);

    const handleDeleteScenario = useCallback((scenarioId: string) => {
        setScenarioToDelete(scenarioId);
        setConfirmDeleteModalOpen(true);
    }, []);

    const confirmDeleteScenario = useCallback(() => {
        if (scenarioToDelete) {
            setScenarios(prev => prev.filter(s => s.id !== scenarioToDelete));
            
            // Remove elicitation data for deleted scenario
            setUserElicitationData(prev => {
                const updated = { ...prev };
                delete updated[scenarioToDelete];
                return updated;
            });
            
            // If the deleted scenario was selected, select another one
            if (selectedScenarioId === scenarioToDelete) {
                const remainingScenarios = scenarios.filter(s => s.id !== scenarioToDelete && s.scenario_group === selectedGroup);
                setSelectedScenarioId(remainingScenarios.length > 0 ? remainingScenarios[0].id : null);
            }
        }
        setConfirmDeleteModalOpen(false);
        setScenarioToDelete(null);
    }, [scenarioToDelete, scenarios, selectedGroup, selectedScenarioId]);

    const handleSaveNewScenario = useCallback((scenario: Scenario) => {
        setScenarios(prev => [...prev, scenario]);
        setEditModalOpen(false);
        setScenarioToEdit(null);
        
        // Select the new scenario
        setSelectedScenarioId(scenario.id);
    }, []);

    const currentUserDistribution = useMemo<UserScenarioDistribution | undefined>(() => {
        if (!selectedScenarioId) return undefined;
        return userElicitationData[selectedScenarioId] || getEmptyUserScenario();
    }, [selectedScenarioId, userElicitationData]);

    const currentDistribution = useMemo<ScenarioDistribution | undefined>(() => {
        if (!currentUserDistribution) return undefined;
        return userScenarioToScenario(currentUserDistribution);
    }, [currentUserDistribution]);

    const currentScenario = useMemo(() => {
        if (!selectedScenarioId) return undefined;
        return scenarios.find(s => s.id === selectedScenarioId);
    }, [selectedScenarioId, scenarios]);

    // Check completion status for scenarios
    const scenarioCompletionStatus = useMemo(() => {
        const status: { [scenarioId: string]: boolean } = {};
        for (const scenario of scenarios) {
            const userData = userElicitationData[scenario.id];
            status[scenario.id] = userData ? hasScenarioUserEdits(userData) : false;
        }
        return status;
    }, [scenarios, userElicitationData]);

    const dataForChart = useMemo(() => {
        const scenarioIdsInGroup = new Set(scenariosInGroup.map(s => s.id));
        const filteredData: ElicitationData = {};
        for (const scenarioId in userElicitationData) {
            if (scenarioIdsInGroup.has(scenarioId)) {
                filteredData[scenarioId] = userScenarioToScenario(userElicitationData[scenarioId]);
            }
        }
        return filteredData;
    }, [userElicitationData, scenariosInGroup]);

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
                        completionStatus={scenarioCompletionStatus}
                        onSelectScenario={handleSelectScenario}
                        onSelectGroup={handleSelectGroup}
                        onAddScenario={handleAddScenario}
                        onDeleteScenario={handleDeleteScenario}
                    />

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="space-y-8">
                           <ControlPanel onUpload={handleFileUpload} onDownload={handleFileDownload} />
                            {selectedScenarioId && (
                                <DistributionInputs
                                    scenarioId={selectedScenarioId}
                                    userDistribution={currentUserDistribution}
                                    scenario={currentScenario}
                                    onDistributionChange={handleDistributionChange}
                                />
                            )}
                        </div>
                        
                        <div className="lg:col-span-2 bg-white p-4 sm:p-6 rounded-lg shadow-md border border-gray-200 min-h-[500px]">
                            {selectedScenarioId && (
                               <D3DistributionChart
                                    key={selectedScenarioId} // Force re-render on scenario change
                                    scenarioId={selectedScenarioId}
                                    allData={dataForChart}
                                    onDistributionChange={handleDistributionChange}
                                    selectedDistribution={currentDistribution}
                                    currentScenario={currentScenario}
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
            
            {/* Modals */}
            <ScenarioEditModal
                isOpen={editModalOpen}
                scenario={scenarioToEdit}
                groups={scenarioGroups}
                onSave={handleSaveNewScenario}
                onCancel={() => {
                    setEditModalOpen(false);
                    setScenarioToEdit(null);
                }}
            />
            
            <ConfirmationModal
                isOpen={confirmDeleteModalOpen}
                title="Delete Scenario"
                message="Are you sure you want to delete this scenario? This action cannot be undone and will remove all associated elicitation data."
                confirmText="Delete"
                cancelText="Cancel"
                onConfirm={confirmDeleteScenario}
                onCancel={() => {
                    setConfirmDeleteModalOpen(false);
                    setScenarioToDelete(null);
                }}
                isDestructive={true}
            />
        </div>
    );
};

export default App;