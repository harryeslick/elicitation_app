import React, { useState } from 'react';
import { Scenario } from '../types';

interface ScenarioEditModalProps {
    isOpen: boolean;
    scenario: Scenario | null;
    groups: string[];
    onSave: (scenario: Scenario) => void;
    onCancel: () => void;
}

export const ScenarioEditModal: React.FC<ScenarioEditModalProps> = ({
    isOpen,
    scenario,
    groups,
    onSave,
    onCancel
}) => {
    const [editedScenario, setEditedScenario] = useState<Scenario>(scenario || {} as Scenario);

    React.useEffect(() => {
        if (scenario) {
            setEditedScenario(scenario);
        }
    }, [scenario]);

    if (!isOpen || !scenario) return null;

    const handleFieldChange = (field: string, value: any) => {
        setEditedScenario(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSave = () => {
        onSave(editedScenario);
    };

    // Get all fields except id
    const editableFields = Object.keys(scenario).filter(key => key !== 'id');

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
                <div className="mt-3">
                    <h3 className="text-lg font-medium text-gray-900 text-center mb-6">
                        Edit New Scenario
                    </h3>
                    
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                        {editableFields.map(field => (
                            <div key={field} className="flex flex-col">
                                <label className="text-sm font-medium text-gray-700 mb-1 capitalize">
                                    {field.replace(/_/g, ' ')}
                                </label>
                                {field === 'scenario_group' ? (
                                    <select
                                        value={editedScenario[field] || ''}
                                        onChange={(e) => handleFieldChange(field, e.target.value)}
                                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        {groups.map(group => (
                                            <option key={group} value={group}>
                                                {group}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type={typeof scenario[field] === 'number' ? 'number' : 'text'}
                                        value={editedScenario[field] || ''}
                                        onChange={(e) => {
                                            const value = typeof scenario[field] === 'number' 
                                                ? parseFloat(e.target.value) || 0
                                                : e.target.value;
                                            handleFieldChange(field, value);
                                        }}
                                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        step={typeof scenario[field] === 'number' ? '0.1' : undefined}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                    
                    <div className="flex items-center justify-end space-x-3 mt-6 pt-4 border-t">
                        <button
                            onClick={onCancel}
                            className="px-4 py-2 bg-gray-300 text-gray-800 text-sm font-medium rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                        >
                            Save Scenario
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};