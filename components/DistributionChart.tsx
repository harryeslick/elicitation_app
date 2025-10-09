import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Customized } from 'recharts';
import { Distribution, ElicitationData, ScenarioDistribution } from '../types';
import { getBetaPdfPoints } from '../services/betaUtils';

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
        setIsDragging(true);
    }, []);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleMouseMove = useCallback((event: MouseEvent) => {
        if (isDragging && pointRef.current) {
            const svg = pointRef.current.ownerSVGElement;
            if (svg) {
                const pt = svg.createSVGPoint();
                pt.x = event.clientX;
                pt.y = event.clientY;
                const { x } = pt.matrixTransform(svg.getScreenCTM()?.inverse());
                const dataX = xScale.invert(x);
                onDrag(dataX);
            }
        }
    }, [isDragging, onDrag, xScale]);

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        } else {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, handleMouseMove, handleMouseUp]);
    
    // Render only if cx and cy are valid numbers
    if (isNaN(cx) || isNaN(cy)) {
        return null;
    }

    return (
        <g>
            <circle ref={pointRef} cx={cx} cy={cy} r={8} fill={color} stroke="white" strokeWidth={2} cursor="ew-resize" onMouseDown={handleMouseDown} style={{ zIndex: 100 }} />
            <circle cx={cx} cy={cy} r={12} fill={color} opacity={0.3} cursor="ew-resize" onMouseDown={handleMouseDown}/>
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

    const handleDrag = (type: 'baseline' | 'treatment', point: 'min' | 'max' | 'mode', value: number) => {
        const current = type === 'baseline' ? baseline : treatment;
        let { min, max, mode, confidence } = { ...current };
    
        switch (point) {
            case 'min':
                min = Math.max(0, Math.min(value, max));
                mode = Math.max(min, mode);
                break;
            case 'max':
                max = Math.min(100, Math.max(value, min));
                mode = Math.min(max, mode);
                break;
            case 'mode':
                mode = Math.max(min, Math.min(value, max));
                break;
        }
        onDistributionChange(scenarioId, type, { min, max, mode, confidence });
    };

    const baselinePdf = useMemo(() => getBetaPdfPoints(baseline.min, baseline.max, baseline.mode, baseline.confidence), [baseline]);
    const treatmentPdf = useMemo(() => getBetaPdfPoints(treatment.min, treatment.max, treatment.mode, treatment.confidence), [treatment]);

    const otherScenariosPdfs = useMemo(() => {
        return Object.entries(allData)
            .filter(([id]) => id !== scenarioId)
            .flatMap(([_, dist]) => [
                { type: 'baseline', data: getBetaPdfPoints(dist.baseline.min, dist.baseline.max, dist.baseline.mode, dist.baseline.confidence)},
                { type: 'treatment', data: getBetaPdfPoints(dist.treatment.min, dist.treatment.max, dist.treatment.mode, dist.treatment.confidence)}
            ]);
    }, [allData, scenarioId]);

    const fixedMaxY = 0.4;

    return (
        <div className="h-full flex flex-col">
            <h3 className="text-lg font-semibold text-center mb-4">Outcome Distribution for Scenario {scenarioId.split('_')[1]}</h3>
            <div className="flex-grow">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart margin={{ top: 5, right: 20, left: -10, bottom: 20 }}>
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
                        component={(chartProps: any) =>
                            <CustomLayer
                                {...chartProps}
                                baseline={baseline}
                                treatment={treatment}
                                onDrag={handleDrag}
                            />
                        }
                    />

                </LineChart>
            </ResponsiveContainer>
            </div>
        </div>
    );
};

const CustomLayer = ({ baseline, treatment, onDrag, xAxisMap, yAxisMap }: any) => {
    if (!xAxisMap || Object.keys(xAxisMap).length === 0 || !yAxisMap || Object.keys(yAxisMap).length === 0) {
        return null;
    }

    const xAxis = Object.values(xAxisMap)[0] as any;
    const yAxis = Object.values(yAxisMap)[0] as any;
    
    if (!xAxis || !xAxis.scale || !yAxis || !yAxis.scale) {
        return null;
    }
    
    const xScale = xAxis.scale;
    const yScale = yAxis.scale;

    // Use the y-axis scale to find the pixel coordinate for the value 0.
    // This is the position of the x-axis.
    const pointYPosition = yScale(0);

    return (
        <g>
            {/* Baseline Draggable Points */}
            <DraggablePoint cx={xScale(baseline.min)} cy={pointYPosition} onDrag={(v) => onDrag('baseline', 'min', v)} xScale={xScale} color="#3b82f6"/>
            <DraggablePoint cx={xScale(baseline.max)} cy={pointYPosition} onDrag={(v) => onDrag('baseline', 'max', v)} xScale={xScale} color="#3b82f6"/>
            <DraggablePoint cx={xScale(baseline.mode)} cy={pointYPosition} onDrag={(v) => onDrag('baseline', 'mode', v)} xScale={xScale} color="#3b82f6"/>
            
            {/* Treatment Draggable Points */}
            <DraggablePoint cx={xScale(treatment.min)} cy={pointYPosition} onDrag={(v) => onDrag('treatment', 'min', v)} xScale={xScale} color="#22c55e"/>
            <DraggablePoint cx={xScale(treatment.max)} cy={pointYPosition} onDrag={(v) => onDrag('treatment', 'max', v)} xScale={xScale} color="#22c55e"/>
            <DraggablePoint cx={xScale(treatment.mode)} cy={pointYPosition} onDrag={(v) => onDrag('treatment', 'mode', v)} xScale={xScale} color="#22c55e"/>
        </g>
    );
};