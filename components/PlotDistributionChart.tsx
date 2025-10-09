import * as Plot from '@observablehq/plot';
import * as d3 from 'd3';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { getBetaPdfPoints } from '../services/betaUtils';
import { Distribution, ElicitationData, ScenarioDistribution } from '../types';

interface PlotDistributionChartProps {
    scenarioId: string;
    allData: ElicitationData;
    selectedDistribution?: ScenarioDistribution;
    onDistributionChange: (scenarioId: string, type: 'baseline' | 'treatment', newDistribution: Distribution) => void;
}

const defaultDistribution: Distribution = { min: 0, max: 100, mode: 50, confidence: 50 };
const defaultScenarioDist: ScenarioDistribution = { baseline: defaultDistribution, treatment: defaultDistribution };

export const PlotDistributionChart: React.FC<PlotDistributionChartProps> = ({ 
    scenarioId, 
    allData, 
    selectedDistribution, 
    onDistributionChange 
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement | null>(null);
    
    const { baseline, treatment } = selectedDistribution || defaultScenarioDist;
    const baselineDistribution = baseline || defaultDistribution;
    const treatmentDistribution = treatment || defaultDistribution;

    // Generate PDF data
    const chartData = useMemo(() => {
        const baselinePdf = getBetaPdfPoints(baselineDistribution.min, baselineDistribution.max, baselineDistribution.mode, baselineDistribution.confidence)
            .map(d => ({ ...d, type: 'baseline', opacity: 1 }));
        
        const treatmentPdf = getBetaPdfPoints(treatmentDistribution.min, treatmentDistribution.max, treatmentDistribution.mode, treatmentDistribution.confidence)
            .map(d => ({ ...d, type: 'treatment', opacity: 1 }));

        // Add other scenarios as background
        const otherPdfs = Object.entries(allData)
            .filter(([id]) => id !== scenarioId)
            .flatMap(([_, dist]) => {
                const scenarioDist = dist as ScenarioDistribution;
                const baselineBg = getBetaPdfPoints(scenarioDist.baseline.min, scenarioDist.baseline.max, scenarioDist.baseline.mode, scenarioDist.baseline.confidence)
                    .map(d => ({ ...d, type: 'baseline', opacity: 0.15 }));
                const treatmentBg = getBetaPdfPoints(scenarioDist.treatment.min, scenarioDist.treatment.max, scenarioDist.treatment.mode, scenarioDist.treatment.confidence)
                    .map(d => ({ ...d, type: 'treatment', opacity: 0.15 }));
                return [...baselineBg, ...treatmentBg];
            });

        return [...otherPdfs, ...baselinePdf, ...treatmentPdf];
    }, [baselineDistribution, treatmentDistribution, allData, scenarioId]);

    // Control points data
    const controlPoints = useMemo(() => [
        { x: baselineDistribution.min, type: 'baseline', parameter: 'min', y: 0 },
        { x: baselineDistribution.mode, type: 'baseline', parameter: 'mode', y: 0 },
        { x: baselineDistribution.max, type: 'baseline', parameter: 'max', y: 0 },
        { x: treatmentDistribution.min, type: 'treatment', parameter: 'min', y: -0.02 },
        { x: treatmentDistribution.mode, type: 'treatment', parameter: 'mode', y: -0.02 },
        { x: treatmentDistribution.max, type: 'treatment', parameter: 'max', y: -0.02 },
    ], [baselineDistribution, treatmentDistribution]);

    const handleDrag = useCallback((type: 'baseline' | 'treatment', parameter: 'min' | 'mode' | 'max', newValue: number) => {
        const current = type === 'baseline' ? baselineDistribution : treatmentDistribution;
        let { min, max, mode, confidence } = { ...current };
        
        const clampedValue = Math.max(0, Math.min(100, newValue));
        
        switch (parameter) {
            case 'min':
                min = clampedValue;
                if (min > mode) mode = min;
                if (min > max) { max = min; mode = min; }
                break;
            case 'max':
                max = clampedValue;
                if (max < mode) mode = max;
                if (max < min) { min = max; mode = max; }
                break;
            case 'mode':
                mode = Math.max(min, Math.min(clampedValue, max));
                break;
        }
        
        onDistributionChange(scenarioId, type, { min, max, mode, confidence });
    }, [baselineDistribution, treatmentDistribution, scenarioId, onDistributionChange]);

    useEffect(() => {
        if (!containerRef.current) return;

        // Clear previous chart
        d3.select(containerRef.current).selectAll("*").remove();

        // Create the plot
        const plot = Plot.plot({
            title: `Outcome Distribution for Scenario ${scenarioId.split('_')[1]}`,
            width: 800,
            height: 500,
            marginBottom: 80,
            x: {
                domain: [0, 100],
                label: "Outcome Value"
            },
            y: {
                domain: [0, 0.4],
                label: "Probability Density"
            },
            color: {
                domain: ["baseline", "treatment"],
                range: ["#3b82f6", "#22c55e"]
            },
            marks: [
                // Grid
                Plot.gridX({ strokeOpacity: 0.2 }),
                Plot.gridY({ strokeOpacity: 0.2 }),
                
                // PDF curves
                Plot.line(chartData, {
                    x: "x", 
                    y: "y", 
                    stroke: "type",
                    strokeWidth: d => d.opacity === 1 ? 3 : 2,
                    strokeOpacity: "opacity"
                }),
                
                // Control points
                Plot.dot(controlPoints, {
                    x: "x",
                    y: "y", 
                    fill: "type",
                    r: 8,
                    stroke: "white",
                    strokeWidth: 2
                }),
                
                // Labels for control points
                Plot.text(controlPoints, {
                    x: "x",
                    y: d => d.y - 0.05,
                    text: "parameter",
                    fill: "type",
                    fontSize: 10,
                    textAnchor: "middle"
                })
            ]
        });

        containerRef.current.appendChild(plot);
        svgRef.current = plot.querySelector('svg');

        // Add drag behavior to control points
        if (svgRef.current) {
            const svg = d3.select(svgRef.current);
            const circles = svg.selectAll('circle').filter(function() {
                return d3.select(this).attr('cursor') === 'ew-resize';
            });

            circles.call(
                d3.drag<SVGCircleElement, any>()
                    .on('start', function(event) {
                        d3.select(this).attr('r', 10);
                    })
                    .on('drag', function(event, d) {
                        const [x] = d3.pointer(event, this);
                        const xScale = svg.select('.plot-x').node() as any; // Get x scale
                        // Simple approximation - you'd want to get the actual scale
                        const newValue = (x / 800) * 100; // Approximate conversion
                        
                        // Find which point this is
                        const pointIndex = Array.from(circles.nodes()).indexOf(this);
                        const point = controlPoints[pointIndex];
                        
                        if (point) {
                            handleDrag(point.type as 'baseline' | 'treatment', point.parameter as 'min' | 'mode' | 'max', newValue);
                        }
                    })
                    .on('end', function() {
                        d3.select(this).attr('r', 8);
                    })
            );
        }

        return () => {
            if (plot && plot.parentNode) {
                plot.remove();
            }
        };
    }, [chartData, controlPoints, handleDrag, scenarioId]);

    return (
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md border border-gray-200">
            <div ref={containerRef} className="w-full" />
        </div>
    );
};