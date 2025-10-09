
import React from 'react';
import { Distribution, ScenarioDistribution } from '../types';

interface DistributionInputsProps {
    scenarioId: string;
    distribution?: ScenarioDistribution;
    onDistributionChange: (scenarioId: string, type: 'baseline' | 'treatment', newDistribution: Distribution) => void;
}

const defaultDistribution: Distribution = { min: 0, max: 100, mode: 50, confidence: 50 };
const defaultScenarioDist: ScenarioDistribution = { baseline: defaultDistribution, treatment: defaultDistribution };

const InputRow: React.FC<{
    title: 'Baseline' | 'Treatment';
    color: 'blue' | 'green';
    data: Distribution;
    onChange: (newDistribution: Distribution) => void;
    maxConstraints?: Distribution; // For treatment, this will be the baseline values
}> = ({ title, color, data, onChange, maxConstraints }) => {
    
    const handleValueChange = (field: keyof Distribution, value: number) => {
        // Allow empty/invalid values during typing, but don't propagate them
        if (isNaN(value) || value === null || value === undefined) return;

        let { min, max, mode, confidence } = { ...data };
        
        // Apply max constraints for treatment (treatment values cannot exceed baseline values)
        const getMaxConstraint = (field: keyof Distribution) => {
            if (maxConstraints && field !== 'confidence') {
                return Math.min(100, maxConstraints[field]);
            }
            return 100;
        };
        
        switch (field) {
            case 'min':
                min = Math.round(Math.max(0, Math.min(value, getMaxConstraint('min'))));
                // Only adjust mode if the new min is greater than current mode
                if (min > mode) {
                    mode = Math.min(min, getMaxConstraint('mode'));
                }
                break;
            case 'max':
                max = Math.round(Math.min(getMaxConstraint('max'), Math.max(value, 0)));
                // Only adjust mode if the new max is less than current mode
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
        onChange({ min, max, mode, confidence });
    };

    return (
        <div className="space-y-3">
            <h4 className={`font-semibold text-lg text-${color}-600`}>{title}</h4>
            <div className="grid grid-cols-3 gap-x-4 gap-y-2">
                {(['min', 'mode', 'max'] as const).map((field) => (
                    <div key={field}>
                        <label htmlFor={`${title}-${field}`} className="block text-sm font-medium text-gray-700 capitalize">{field}</label>
                        <input
                            type="number"
                            id={`${title}-${field}`}
                            value={Math.round(data[field])}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val === '' || val === '-') return; // Allow empty or negative sign during typing
                                const numVal = parseInt(val);
                                if (!isNaN(numVal)) {
                                    handleValueChange(field, numVal);
                                }
                            }}
                            onBlur={(e) => {
                                // On blur, ensure we have a valid integer value
                                const val = e.target.value;
                                if (val === '' || isNaN(parseInt(val))) {
                                    // Reset to current valid value if input is invalid
                                    e.target.value = Math.round(data[field]).toString();
                                }
                            }}
                            min={0}
                            max={maxConstraints && field in maxConstraints ? Math.min(100, maxConstraints[field as keyof Distribution]) : 100}
                            step="1"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                    </div>
                ))}
            </div>
             <div className="flex items-center space-x-2 pt-2">
                <label htmlFor={`${title}-confidence`} className="w-24 text-sm font-medium text-gray-700">Confidence:</label>
                <input 
                    id={`${title}-confidence`}
                    type="range" 
                    min="1" 
                    max="100" 
                    value={data.confidence} 
                    onChange={(e) => handleValueChange('confidence', Number(e.target.value))}
                    className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-${color}-500`}
                />
                <span className="text-sm w-8 text-right">{data.confidence}</span>
            </div>
        </div>
    );
}

export const DistributionInputs: React.FC<DistributionInputsProps> = ({ scenarioId, distribution, onDistributionChange }) => {
    const { baseline, treatment } = distribution || defaultScenarioDist;

    return (
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Distribution Parameters</h2>
            <div className="space-y-6">
                <InputRow 
                    title="Baseline"
                    color="blue"
                    data={baseline}
                    onChange={(newDist) => onDistributionChange(scenarioId, 'baseline', newDist)}
                />
                <InputRow 
                    title="Treatment"
                    color="green"
                    data={treatment}
                    maxConstraints={baseline}
                    onChange={(newDist) => onDistributionChange(scenarioId, 'treatment', newDist)}
                />
            </div>
        </div>
    );
};
