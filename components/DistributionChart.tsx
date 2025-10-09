import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CartesianGrid, Customized, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getBetaPdfPoints } from '../services/betaUtils';
import { Distribution, ElicitationData, ScenarioDistribution } from '../types';

interface DraggablePointProps {
    cx: number;
    cy: number;
    onDrag: (newX: number) => void;
    xScale: any; 
    color: string;
}

const DraggablePoint: React.FC<DraggablePointProps> = ({ cx, cy, onDrag, xScale, color }) => {
    const pointRef = useRef<SVGCircleElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Mouse down on point', { cx, cy, color }); // Debug log
        setIsDragging(true);
    }, [cx, cy, color]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleMouseMove = useCallback((event: MouseEvent) => {
        if (isDragging && pointRef.current) {
            event.preventDefault();
            const svg = pointRef.current.ownerSVGElement;
            if (svg) {
                try {
                    const rect = svg.getBoundingClientRect();
                    const x = event.clientX - rect.left;
                    const dataX = xScale.invert(x);
                    onDrag(dataX);
                } catch (error) {
                    console.warn('Error during drag:', error);
                }
            }
        }
    }, [isDragging, onDrag, xScale]);

    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove, { passive: false });
            document.addEventListener('mouseup', handleMouseUp);
        } else {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        }
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, handleMouseMove, handleMouseUp]);
    
    // Render only if cx and cy are valid numbers
    if (isNaN(cx) || isNaN(cy)) {
        console.log('Invalid coordinates:', { cx, cy }); // Debug log
        return null;
    }
    
    console.log('Rendering draggable point:', { cx, cy, color });

    return (
        <g>
            {/* Larger transparent hit area for easier clicking */}
            <circle 
                cx={cx} 
                cy={cy} 
                r={15} 
                fill="red" 
                fillOpacity={0.3}
                cursor="ew-resize" 
                onMouseDown={handleMouseDown}
            />
            {/* Visible point */}
            <circle 
                ref={pointRef} 
                cx={cx} 
                cy={cy} 
                r={8} 
                fill={color} 
                stroke="white" 
                strokeWidth={3} 
                cursor="ew-resize" 
                onMouseDown={handleMouseDown}
            />
            {/* Hover effect */}
            <circle 
                cx={cx} 
                cy={cy} 
                r={isDragging ? 12 : 8} 
                fill={color} 
                opacity={isDragging ? 0.5 : 0.2}
                cursor="ew-resize" 
                onMouseDown={handleMouseDown}
                style={{ pointerEvents: 'none' }}
            />
            {/* Add visual feedback during drag */}
            {isDragging && (
                <circle 
                    cx={cx} 
                    cy={cy} 
                    r={18} 
                    fill="none" 
                    stroke={color} 
                    strokeWidth={2}
                    opacity={0.8}
                    style={{ pointerEvents: 'none' }}
                />
            )}
        </g>
    );
};

interface DistributionChartProps {
    scenarioId: string;
    allData: ElicitationData;
    selectedDistribution?: ScenarioDistribution;
    onDistributionChange: (scenarioId: string, type: 'baseline' | 'treatment', newDistribution: Distribution) => void;
}

const defaultDistribution: Distribution = { min: 0, max: 100, mode: 50, confidence: 50 };
const defaultScenarioDist: ScenarioDistribution = { baseline: defaultDistribution, treatment: defaultDistribution };

export const DistributionChart: React.FC<DistributionChartProps> = ({ scenarioId, allData, selectedDistribution, onDistributionChange }) => {
    const { baseline, treatment } = selectedDistribution || defaultScenarioDist;
    
    // Initialize with default values if not provided
    const baselineDistribution = baseline || defaultDistribution;
    const treatmentDistribution = treatment || defaultDistribution;

    const handleDrag = (type: 'baseline' | 'treatment', point: 'min' | 'max' | 'mode', value: number) => {
        const current = type === 'baseline' ? baselineDistribution : treatmentDistribution;
        let { min, max, mode, confidence } = { ...current };
        
        // Clamp the value to the chart bounds
        const clampedValue = Math.max(0, Math.min(100, value));
    
        switch (point) {
            case 'min':
                min = clampedValue;
                // Only adjust mode if the new min is greater than current mode
                if (min > mode) {
                    mode = min;
                }
                // If min is dragged past max, swap them
                if (min > max) {
                    max = min;
                    mode = min;
                }
                break;
            case 'max':
                max = clampedValue;
                // Only adjust mode if the new max is less than current mode
                if (max < mode) {
                    mode = max;
                }
                // If max is dragged below min, swap them
                if (max < min) {
                    min = max;
                    mode = max;
                }
                break;
            case 'mode':
                mode = Math.max(min, Math.min(clampedValue, max));
                break;
        }
        onDistributionChange(scenarioId, type, { min, max, mode, confidence });
    };

    const baselinePdf = useMemo(() => getBetaPdfPoints(baselineDistribution.min, baselineDistribution.max, baselineDistribution.mode, baselineDistribution.confidence), [baselineDistribution]);
    const treatmentPdf = useMemo(() => getBetaPdfPoints(treatmentDistribution.min, treatmentDistribution.max, treatmentDistribution.mode, treatmentDistribution.confidence), [treatmentDistribution]);

    const otherScenariosPdfs = useMemo(() => {
        return Object.entries(allData)
            .filter(([id]) => id !== scenarioId)
            .flatMap(([_, dist]) => {
                const scenarioDist = dist as ScenarioDistribution;
                return [
                    { type: 'baseline', data: getBetaPdfPoints(scenarioDist.baseline.min, scenarioDist.baseline.max, scenarioDist.baseline.mode, scenarioDist.baseline.confidence)},
                    { type: 'treatment', data: getBetaPdfPoints(scenarioDist.treatment.min, scenarioDist.treatment.max, scenarioDist.treatment.mode, scenarioDist.treatment.confidence)}
                ];
            });
    }, [allData, scenarioId]);

    const fixedMaxY = 0.4;

    return (
        <div className="h-full flex flex-col">
            <h3 className="text-lg font-semibold text-center mb-4">Outcome Distribution for Scenario {scenarioId.split('_')[1]}</h3>
            <div className="flex-grow relative">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart margin={{ top: 5, right: 20, left: -10, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" dataKey="x" name="Outcome" domain={[0, 100]} label={{ value: 'Outcome Value', position: 'insideBottom', offset: -10 }}/>
                    <YAxis 
                        type="number" 
                        dataKey="y" 
                        name="Probability" 
                        domain={[0, fixedMaxY]} 
                        allowDataOverflow={false}
                        label={{ value: 'Probability Density', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip />
                    <Legend verticalAlign="top" height={36}/>
                    
                    {otherScenariosPdfs.map((pdf, index) => (
                        <Line key={index} type="monotone" data={pdf.data} dataKey="y" stroke={pdf.type === 'baseline' ? '#3b82f6' : '#22c55e'} strokeOpacity={0.15} dot={false} strokeWidth={2}/>
                    ))}

                    <Line isAnimationActive={false} type="monotone" data={baselinePdf} dataKey="y" name="Baseline" stroke="#3b82f6" strokeWidth={3} dot={false} />
                    <Line isAnimationActive={false} type="monotone" data={treatmentPdf} dataKey="y" name="Treatment" stroke="#22c55e" strokeWidth={3} dot={false} />

                    <Customized
                        component={(chartProps: any) => {
                            console.log('Customized component called with props:', Object.keys(chartProps || {}));
                            return (
                                <CustomLayer
                                    {...chartProps}
                                    baseline={baselineDistribution}
                                    treatment={treatmentDistribution}
                                    onDrag={handleDrag}
                                />
                            );
                        }}
                    />

                </LineChart>
            </ResponsiveContainer>
            
            {/* Simple overlay with draggable points */}
            <div className="absolute bottom-16 left-8 right-8 h-4 border-b-2 border-gray-300">
                {/* Baseline points */}
                <div 
                    className="absolute w-4 h-4 bg-blue-500 rounded-full cursor-ew-resize border-2 border-white shadow-lg hover:scale-110 transition-transform" 
                    style={{ 
                        left: `${(baselineDistribution.min / 100) * 100}%`, 
                        top: '-8px',
                        transform: 'translateX(-50%)'
                    }}
                    title={`Baseline Min: ${baselineDistribution.min}`}
                    onMouseDown={(e) => {
                        e.preventDefault();
                        console.log('Clicked baseline min');
                        // TODO: Add drag logic
                    }}
                />
                <div 
                    className="absolute w-4 h-4 bg-blue-500 rounded-full cursor-ew-resize border-2 border-white shadow-lg hover:scale-110 transition-transform" 
                    style={{ 
                        left: `${(baselineDistribution.mode / 100) * 100}%`, 
                        top: '-8px',
                        transform: 'translateX(-50%)'
                    }}
                    title={`Baseline Mode: ${baselineDistribution.mode}`}
                    onMouseDown={(e) => {
                        e.preventDefault();
                        console.log('Clicked baseline mode');
                    }}
                />
                <div 
                    className="absolute w-4 h-4 bg-blue-500 rounded-full cursor-ew-resize border-2 border-white shadow-lg hover:scale-110 transition-transform" 
                    style={{ 
                        left: `${(baselineDistribution.max / 100) * 100}%`, 
                        top: '-8px',
                        transform: 'translateX(-50%)'
                    }}
                    title={`Baseline Max: ${baselineDistribution.max}`}
                    onMouseDown={(e) => {
                        e.preventDefault();
                        console.log('Clicked baseline max');
                    }}
                />
                
                {/* Treatment points */}
                <div 
                    className="absolute w-4 h-4 bg-green-500 rounded-full cursor-ew-resize border-2 border-white shadow-lg hover:scale-110 transition-transform" 
                    style={{ 
                        left: `${(treatmentDistribution.min / 100) * 100}%`, 
                        top: '8px',
                        transform: 'translateX(-50%)'
                    }}
                    title={`Treatment Min: ${treatmentDistribution.min}`}
                    onMouseDown={(e) => {
                        e.preventDefault();
                        console.log('Clicked treatment min');
                    }}
                />
                <div 
                    className="absolute w-4 h-4 bg-green-500 rounded-full cursor-ew-resize border-2 border-white shadow-lg hover:scale-110 transition-transform" 
                    style={{ 
                        left: `${(treatmentDistribution.mode / 100) * 100}%`, 
                        top: '8px',
                        transform: 'translateX(-50%)'
                    }}
                    title={`Treatment Mode: ${treatmentDistribution.mode}`}
                    onMouseDown={(e) => {
                        e.preventDefault();
                        console.log('Clicked treatment mode');
                    }}
                />
                <div 
                    className="absolute w-4 h-4 bg-green-500 rounded-full cursor-ew-resize border-2 border-white shadow-lg hover:scale-110 transition-transform" 
                    style={{ 
                        left: `${(treatmentDistribution.max / 100) * 100}%`, 
                        top: '8px',
                        transform: 'translateX(-50%)'
                    }}
                    title={`Treatment Max: ${treatmentDistribution.max}`}
                    onMouseDown={(e) => {
                        e.preventDefault();
                        console.log('Clicked treatment max');
                    }}
                />
                
                {/* Labels */}
                <div className="absolute -top-6 left-0 text-xs text-blue-600 font-semibold">Baseline</div>
                <div className="absolute top-6 left-0 text-xs text-green-600 font-semibold">Treatment</div>
            </div>
            </div>
        </div>
    );
};

const CustomLayer = ({ baseline, treatment, onDrag, xAxisMap, yAxisMap, height }: any) => {
    console.log('CustomLayer render:', { baseline, treatment, xAxisMap: !!xAxisMap, yAxisMap: !!yAxisMap });
    
    if (!xAxisMap || Object.keys(xAxisMap).length === 0 || !yAxisMap || Object.keys(yAxisMap).length === 0) {
        console.log('Missing axis maps');
        return null;
    }

    const xAxis = Object.values(xAxisMap)[0] as any;
    const yAxis = Object.values(yAxisMap)[0] as any;
    
    if (!xAxis || !xAxis.scale || !yAxis || !yAxis.scale) {
        console.log('Missing axis scales');
        return null;
    }
    
    const xScale = xAxis.scale;
    const yScale = yAxis.scale;

    // Position points at the x-axis (bottom of chart)
    const pointYPosition = yScale(0);
    
    // Add offset so treatment points don't overlap with baseline points
    const baselineY = pointYPosition;
    const treatmentY = pointYPosition + 20; // Offset treatment points below baseline points
    
    console.log('CustomLayer positions:', { baselineY, treatmentY, baseline, treatment });

    return (
        <g>
            {/* Baseline Draggable Points */}
            <DraggablePoint cx={xScale(baseline.min)} cy={baselineY} onDrag={(v) => onDrag('baseline', 'min', v)} xScale={xScale} color="#3b82f6"/>
            <DraggablePoint cx={xScale(baseline.max)} cy={baselineY} onDrag={(v) => onDrag('baseline', 'max', v)} xScale={xScale} color="#3b82f6"/>
            <DraggablePoint cx={xScale(baseline.mode)} cy={baselineY} onDrag={(v) => onDrag('baseline', 'mode', v)} xScale={xScale} color="#3b82f6"/>
            
            {/* Treatment Draggable Points */}
            <DraggablePoint cx={xScale(treatment.min)} cy={treatmentY} onDrag={(v) => onDrag('treatment', 'min', v)} xScale={xScale} color="#22c55e"/>
            <DraggablePoint cx={xScale(treatment.max)} cy={treatmentY} onDrag={(v) => onDrag('treatment', 'max', v)} xScale={xScale} color="#22c55e"/>
            <DraggablePoint cx={xScale(treatment.mode)} cy={treatmentY} onDrag={(v) => onDrag('treatment', 'mode', v)} xScale={xScale} color="#22c55e"/>
            
            {/* Add labels to distinguish the points */}
            {baseline.min !== undefined && (
                <text x={xScale(baseline.min)} y={baselineY - 15} textAnchor="middle" fontSize="10" fill="#3b82f6">min</text>
            )}
            {baseline.mode !== undefined && (
                <text x={xScale(baseline.mode)} y={baselineY - 15} textAnchor="middle" fontSize="10" fill="#3b82f6">mode</text>
            )}
            {baseline.max !== undefined && (
                <text x={xScale(baseline.max)} y={baselineY - 15} textAnchor="middle" fontSize="10" fill="#3b82f6">max</text>
            )}
            
            {treatment.min !== undefined && (
                <text x={xScale(treatment.min)} y={treatmentY + 25} textAnchor="middle" fontSize="10" fill="#22c55e">min</text>
            )}
            {treatment.mode !== undefined && (
                <text x={xScale(treatment.mode)} y={treatmentY + 25} textAnchor="middle" fontSize="10" fill="#22c55e">mode</text>
            )}
            {treatment.max !== undefined && (
                <text x={xScale(treatment.max)} y={treatmentY + 25} textAnchor="middle" fontSize="10" fill="#22c55e">max</text>
            )}
        </g>
    );
};