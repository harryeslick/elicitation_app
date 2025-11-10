import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ConfirmationModal } from './components/ConfirmationModal';
import { ControlPanel } from './components/ControlPanel';

import { ScenarioEditModal } from './components/ScenarioEditModal';
import { ScenarioTable } from './components/ScenarioTable';
import { DEFAULT_ELICITATION_DATA } from './constants';
import { generateCSV, parseCSV, ParsedCSVData } from './services/csvUtils';
import { getEmptyUserScenario, hasScenarioUserEdits } from './services/distributionUtils';
import { Scenario, UserDistribution, UserElicitationData } from './types';

const App: React.FC = () => {
    const [scenarios, setScenarios] = useState<Scenario[]>(DEFAULT_ELICITATION_DATA.scenarios);
    const [userElicitationData, setUserElicitationData] = useState<UserElicitationData>(DEFAULT_ELICITATION_DATA.userElicitationData);
    const [yieldColumn, setYieldColumn] = useState<string | null>(DEFAULT_ELICITATION_DATA.yieldColumn); // Derived from default CSV
    
    // Modal states
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [scenarioToEdit, setScenarioToEdit] = useState<Scenario | null>(null);
    const [confirmDeleteModalOpen, setConfirmDeleteModalOpen] = useState(false);
    const [scenarioToDelete, setScenarioToDelete] = useState<string | null>(null);
    
    // Instructions collapse state
    const [instructionsCollapsed, setInstructionsCollapsed] = useState(false);
    const [assumptionsCollapsed, setAssumptionsCollapsed] = useState(false);
    
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
                const parsedData: ParsedCSVData = parseCSV(text, []); // Pass empty array to rebuild from scratch
                
                // Update scenarios, elicitation data, and yield column
                setScenarios(parsedData.scenarios);
                setUserElicitationData(parsedData.userElicitationData);
                setYieldColumn(parsedData.yieldColumn);
                
                // Reset to first group in loaded scenarios
                const loadedGroups = [...new Set(parsedData.scenarios.map(s => s.scenario_group))];
                setSelectedGroup(loadedGroups.length > 0 ? loadedGroups[0] : null);
                
                alert('Data loaded successfully!');
            } catch (error) {
                console.error("Failed to parse CSV:", error);
                alert('Error loading file. Please ensure it is a valid CSV file from a previous session.');
            }
        };
        reader.readAsText(file);
    }, []);
    
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

    const handleUpdateScenarioComment = useCallback((scenarioId: string, comment: string) => {
        setScenarios(prev => prev.map(scenario => {
            if (scenario.id !== scenarioId) {
                return scenario;
            }
            return {
                ...scenario,
                comment: comment.replace(/,/g, '')
            };
        }));
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



    // Check completion status for scenarios
    const scenarioCompletionStatus = useMemo(() => {
        const status: { [scenarioId: string]: boolean } = {};
        for (const scenario of scenarios) {
            const userData = userElicitationData[scenario.id];
            status[scenario.id] = userData ? hasScenarioUserEdits(userData) : false;
        }
        return status;
    }, [scenarios, userElicitationData]);

    return (
        <div className="min-h-screen bg-gray-50 text-gray-800 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="mb-8">
                    <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Expert Elicitation for Lupin Sclerotinia Management</h1>
                    <p className="mt-2 text-lg text-gray-600">Define outcome distributions for different scenarios based on your expert knowledge.</p>
                    <p className="mt-2 text-lg text-gray-600">The outcome range should reflect residual uncertainty, assuming all scenario factors are correct.</p>
                </header>
                
                <main className="flex flex-col gap-8">
                    {/* Instructions and Session Management in horizontal layout on larger screens */}
                    <div className="flex flex-col lg:flex-row gap-8">
                        <div className="flex flex-col gap-6 flex-1">
                            {/* Instructions Box */}
                            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-xl font-semibold text-gray-800">Instructions</h2>
                                    <button
                                        onClick={() => setInstructionsCollapsed(!instructionsCollapsed)}
                                        className="text-gray-500 hover:text-gray-700 focus:outline-none"
                                        aria-label={instructionsCollapsed ? "Expand instructions" : "Collapse instructions"}
                                    >
                                        {instructionsCollapsed ? (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                                {!instructionsCollapsed && (
                                    <ol className="list-decimal list-inside space-y-2 text-gray-700">
                                        <li>Select a scenario group using the tabs (e.g., 'canopy density').</li>
                                        <li>Select a specific scenario from the table. The selected row will be highlighted.</li>
                                        <li>Using the sliders, adjust the yield loss range for 'Unsprayed' (blue) and 'Sprayed' (green) outcomes.</li>
                                        <li>The min/max inputs should encode the plausible range after accounting for the scenario context; the mode reflects the most likely point within that range.</li>
                                        <li>Use the sliders to indicate your <span className="font-semibold">Confidence</span> in each distribution.</li>
                                        <li>Faded lines on the chart show other distributions from the <span className="font-semibold">current group</span> for comparison.</li>
                                        <li><span className="font-semibold">Your progress is NOT saved automatically.</span> Use the Session Management buttons to download or upload your session.</li>
                                        <li>If you prefer to work in a spreadsheet, you can download the results and fill the values in manually.</li>
                                    </ol>
                                )}
                            </div>

                            {/* Assumptions Box */}
                            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-xl font-semibold text-gray-800">Assumptions</h2>
                                    <button
                                        onClick={() => setAssumptionsCollapsed(!assumptionsCollapsed)}
                                        className="text-gray-500 hover:text-gray-700 focus:outline-none"
                                        aria-label={assumptionsCollapsed ? "Expand assumptions" : "Collapse assumptions"}
                                    >
                                        {assumptionsCollapsed ? (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                                {!assumptionsCollapsed && (
                                    <ol className="list-decimal list-inside space-y-2 text-gray-700">
                                        <li>For each scenario, assume the paddock has had a wheat-canola-lupin rotation, with a history of sclerotinia yield loss.</li>
                                        <li>The current crop stage (for the rainfall observations) is the start of flowering, roughly optimum timing to apply a spray. eg. the 2-week rainfall outlook occurs after spray.</li>
                                        <li>The sprayed treatment was applied at the optimum time, with an effective chemical. </li>
                                        <li>The scenario is representative of the whole paddock, which is a plausible size for the region.</li>
                                        
                                    </ol>
                                )}
                            </div>
                        </div>

                        {/* Session Management - beside instructions on large screens, above scenario on smaller screens */}
                        <div className="lg:w-80 lg:flex-shrink-0">
                            <ControlPanel onUpload={handleFileUpload} onDownload={handleFileDownload} />
                        </div>
                    </div>

                    <ScenarioTable 
                        scenarios={scenariosInGroup} 
                        groups={scenarioGroups}
                        selectedGroup={selectedGroup}
                        selectedScenarioId={selectedScenarioId}
                        completionStatus={scenarioCompletionStatus}
                        userElicitationData={userElicitationData}
                        yieldColumn={yieldColumn}
                        onSelectScenario={handleSelectScenario}
                        onSelectGroup={handleSelectGroup}
                        onAddScenario={handleAddScenario}
                        onDeleteScenario={handleDeleteScenario}
                        onDistributionChange={handleDistributionChange}
                        onUpdateComment={handleUpdateScenarioComment}
                    />
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
