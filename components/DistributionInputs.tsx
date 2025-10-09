
import React from 'react';
import { DEFAULT_BASELINE, DEFAULT_TREATMENT } from '../services/distributionUtils';
import { Distribution, Scenario, UserDistribution, UserScenarioDistribution } from '../types';

interface DistributionInputsProps {
    scenarioId: string;
    userDistribution?: UserScenarioDistribution;
    scenario?: Scenario;
    yieldColumn?: string | null;
    onDistributionChange: (scenarioId: string, type: 'baseline' | 'treatment', newDistribution: UserDistribution) => void;
}

const emptyUserDistribution: UserDistribution = { min: null, max: null, mode: null, confidence: null };

// Helper function to calculate yield impact
const calculateYieldImpact = (lossPercentage: number, baselineYield: number): number => {
    return baselineYield * (1 - lossPercentage / 100);
};

const InputRow: React.FC<{
    title: 'Baseline' | 'Treatment';
    color: 'blue' | 'green';
    data: UserDistribution;
    defaults: Distribution;
    onChange: (newDistribution: UserDistribution) => void;
    maxConstraints?: Distribution; // For treatment, this will be the baseline values
    baselineYield?: number; // Yield in tonnes from scenario data
}> = ({ title, color, data, defaults, onChange, maxConstraints, baselineYield }) => {
    
    const handleValueChange = (field: keyof UserDistribution, value: number) => {
        // Allow empty/invalid values during typing, but don't propagate them
        if (isNaN(value) || value === null || value === undefined) return;

        // Get current values (use defaults for null values)
        const currentMin = data.min ?? defaults.min;
        const currentMax = data.max ?? defaults.max;
        const currentMode = data.mode ?? defaults.mode;
        const currentConfidence = data.confidence ?? defaults.confidence;

        let { min, max, mode, confidence } = { 
            min: currentMin, 
            max: currentMax, 
            mode: currentMode, 
            confidence: currentConfidence 
        };
        
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
        // Convert back to UserDistribution (set to null if matches defaults)
        const newUserDistribution: UserDistribution = {
            min: min === defaults.min ? null : min,
            max: max === defaults.max ? null : max,
            mode: mode === defaults.mode ? null : mode,
            confidence: confidence === defaults.confidence ? null : confidence,
        };

        onChange(newUserDistribution);
    };

    return (
        <div className="space-y-3">
            <h4 className={`font-semibold text-lg text-${color}-600`}>{title}</h4>
            <div className="grid grid-cols-3 gap-x-4 gap-y-2">
                {(['min', 'mode', 'max'] as const).map((field) => (
                    <div key={field} className="space-y-1">
                        <label htmlFor={`${title}-${field}`} className="block text-sm font-medium text-gray-700 capitalize">
                            {field} (%)
                        </label>
                        <input
                            type="number"
                            id={`${title}-${field}`}
                            value={data[field] === null ? '' : Math.round(data[field])}
                            placeholder={Math.round(defaults[field]).toString()}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val === '' || val === '-') return; // Allow empty or negative sign during typing
                                const numVal = parseInt(val);
                                if (!isNaN(numVal)) {
                                    handleValueChange(field, numVal);
                                }
                            }}
                            onBlur={(e) => {
                                // On blur, if empty, leave it empty (default will be used)
                                const val = e.target.value;
                                if (val !== '' && isNaN(parseInt(val))) {
                                    // Reset to empty if input is invalid
                                    e.target.value = '';
                                }
                            }}
                            min={0}
                            max={maxConstraints && field in maxConstraints ? Math.min(100, maxConstraints[field as keyof Distribution]) : 100}
                            step="1"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                        {baselineYield && (
                            <div className="text-xs font-medium text-center py-1 px-2 bg-gray-100 rounded border">
                                <span className={`text-${color}-600`}>
                                    {calculateYieldImpact(data[field] ?? defaults[field], baselineYield).toFixed(2)}t
                                </span>
                            </div>
                        )}
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
                    value={data.confidence ?? defaults.confidence} 
                    onChange={(e) => handleValueChange('confidence', Number(e.target.value))}
                    className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-${color}-500`}
                />
                <span className="text-sm w-8 text-right">{data.confidence ?? defaults.confidence}</span>
            </div>
        </div>
    );
}

export const DistributionInputs: React.FC<DistributionInputsProps> = ({ scenarioId, userDistribution, scenario, yieldColumn, onDistributionChange }) => {
    const baseline = userDistribution?.baseline || emptyUserDistribution;
    const treatment = userDistribution?.treatment || emptyUserDistribution;
    const baselineYield = scenario && yieldColumn ? scenario[yieldColumn] : undefined;

    return (
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Distribution Parameters</h2>
            <div className="mb-6 p-4 bg-blue-50 rounded-md border border-blue-200">
                <div className="space-y-3 text-sm text-gray-700">
                    <p className="font-medium text-gray-800">How to use this section:</p>
                    <div className="space-y-2">
                        <p><strong>• Baseline:</strong> Your estimates of percentage damage/loss WITHOUT any treatment intervention.</p>
                        <p><strong>• Treatment:</strong> Your estimates of percentage damage/loss AFTER applying treatment (always ≤ baseline).</p>
                        <p><strong>• Min/Mode/Max:</strong> Define the range and most likely value of your uncertainty about the damage percentage.</p>
                        <p><strong>• Confidence:</strong> How peaked your distribution is (higher = more certain about the mode value).</p>
                        {baselineYield && (
                            <p><strong>• Impact values:</strong> Show expected tonnage ({baselineYield}t baseline) after applying damage percentage.</p>
                        )}
                    </div>
                </div>
            </div>
            <div className="space-y-6">
                <InputRow 
                    title="Baseline"
                    color="blue"
                    data={baseline}
                    defaults={DEFAULT_BASELINE}
                    baselineYield={baselineYield}
                    onChange={(newDist) => onDistributionChange(scenarioId, 'baseline', newDist)}
                />
                <InputRow 
                    title="Treatment"
                    color="green"
                    data={treatment}
                    defaults={DEFAULT_TREATMENT}
                    maxConstraints={DEFAULT_BASELINE} // Use default baseline for constraints
                    baselineYield={baselineYield}
                    onChange={(newDist) => onDistributionChange(scenarioId, 'treatment', newDist)}
                />
            </div>
        </div>
    );
};
