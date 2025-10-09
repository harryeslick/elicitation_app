import * as d3 from 'd3';
import React, { useCallback, useEffect, useRef } from 'react';
import { getBetaPdfPoints } from '../services/betaUtils';
import { Distribution, ElicitationData, ScenarioDistribution } from '../types';

interface D3DistributionChartProps {
    scenarioId: string;
    allData: ElicitationData;
    selectedDistribution?: ScenarioDistribution;
    onDistributionChange: (scenarioId: string, type: 'baseline' | 'treatment', newDistribution: Distribution) => void;
}

const defaultDistribution: Distribution = { min: 0, max: 100, mode: 50, confidence: 50 };
const defaultScenarioDist: ScenarioDistribution = { baseline: defaultDistribution, treatment: defaultDistribution };

export const D3DistributionChart: React.FC<D3DistributionChartProps> = ({ 
    scenarioId, 
    allData, 
    selectedDistribution, 
    onDistributionChange 
}) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    const { baseline, treatment } = selectedDistribution || defaultScenarioDist;
    const baselineDistribution = baseline || defaultDistribution;
    const treatmentDistribution = treatment || defaultDistribution;

    const handleDrag = useCallback((type: 'baseline' | 'treatment', parameter: 'min' | 'mode' | 'max', newValue: number) => {
        console.log(`handleDrag called: type=${type}, parameter=${parameter}, newValue=${newValue}, isNaN=${isNaN(newValue)}`);
        
        // Safety check for invalid values
        if (isNaN(newValue) || !isFinite(newValue)) {
            console.warn('Invalid newValue received in handleDrag:', newValue);
            return;
        }
        
        const current = type === 'baseline' ? baselineDistribution : treatmentDistribution;
        let { min, max, mode, confidence } = { ...current };
        
        const clampedValue = Math.round(Math.max(0, Math.min(100, newValue)));
        console.log(`Current values: min=${min}, max=${max}, mode=${mode}, clampedValue=${clampedValue}`);
        
        switch (parameter) {
            case 'min':
                min = clampedValue;
                // Only adjust mode if it would become invalid
                if (min > mode) mode = min;
                // Only adjust max if it would become invalid  
                if (min > max) max = min;
                break;
            case 'max':
                max = clampedValue;
                // Only adjust mode if it would become invalid
                if (max < mode) mode = max;
                // Only adjust min if it would become invalid
                if (max < min) min = max;
                break;
            case 'mode':
                // Mode must be between min and max
                mode = Math.max(min, Math.min(clampedValue, max));
                break;
        }
        
        console.log(`New values: min=${min}, max=${max}, mode=${mode}`);
        onDistributionChange(scenarioId, type, { min, max, mode, confidence });
    }, [baselineDistribution, treatmentDistribution, scenarioId, onDistributionChange]);

    useEffect(() => {
        if (!svgRef.current) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        // Get responsive dimensions from the container
        const containerRect = containerRef.current?.getBoundingClientRect();
        const containerWidth = containerRect ? containerRect.width - 40 : 800; // Subtract padding
        const containerHeight = Math.min(containerWidth * 0.6, 500); // Maintain aspect ratio but cap height

        // Chart dimensions
        const margin = { top: 40, right: 30, bottom: 80, left: 60 };
        const width = Math.max(400, containerWidth - margin.left - margin.right);
        const height = Math.max(300, containerHeight - margin.top - margin.bottom);

        // Update SVG size
        svg.attr("width", containerWidth).attr("height", containerHeight + margin.top + margin.bottom);

        // Create main group
        const g = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Calculate data for dynamic Y scaling
        const baselinePdfData = getBetaPdfPoints(baselineDistribution.min, baselineDistribution.max, baselineDistribution.mode, baselineDistribution.confidence);
        const treatmentPdfData = getBetaPdfPoints(treatmentDistribution.min, treatmentDistribution.max, treatmentDistribution.mode, treatmentDistribution.confidence);
        
        // Find the maximum Y value in the current data to set proper scale
        const allCurrentData = [...baselinePdfData, ...treatmentPdfData];
        const maxY = d3.max(allCurrentData, d => d.y) || 0.1;
        const yDomainMax = Math.max(0.1, maxY * 1.1); // Add 10% padding above the max

        // Scales
        const xScale = d3.scaleLinear()
            .domain([0, 100])
            .range([0, width]);

        const yScale = d3.scaleLinear()
            .domain([0, yDomainMax])
            .range([height, 0]);

        // Debug: Log scale setup
        console.log('Scale setup:', {
            containerWidth,
            containerHeight,
            margin,
            chartWidth: width,
            chartHeight: height,
            xScaleDomain: xScale.domain(),
            xScaleRange: xScale.range()
        });

        // Line generator
        const line = d3.line<{x: number, y: number}>()
            .x(d => xScale(d.x))
            .y(d => yScale(d.y))
            .curve(d3.curveCardinal);

        // Add axes
        g.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(xScale))
            .append("text")
            .attr("x", width / 2)
            .attr("y", 40)
            .attr("fill", "black")
            .style("text-anchor", "middle")
            .text("Outcome Value");

        g.append("g")
            .call(d3.axisLeft(yScale))
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", -40)
            .attr("x", -height / 2)
            .attr("fill", "black")
            .style("text-anchor", "middle")
            .text("Probability Density");

        // Add grid
        g.append("g")
            .attr("class", "grid")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(xScale)
                .tickSize(-height)
                .tickFormat(() => "")
            )
            .style("stroke-dasharray", "3,3")
            .style("opacity", 0.3);

        g.append("g")
            .attr("class", "grid")
            .call(d3.axisLeft(yScale)
                .tickSize(-width)
                .tickFormat(() => "")
            )
            .style("stroke-dasharray", "3,3")
            .style("opacity", 0.3);

        // Draw background curves (other scenarios)
        Object.entries(allData)
            .filter(([id]) => id !== scenarioId)
            .forEach(([_, dist]) => {
                const scenarioDist = dist as ScenarioDistribution;
                
                // Baseline background
                const baselineBg = getBetaPdfPoints(scenarioDist.baseline.min, scenarioDist.baseline.max, scenarioDist.baseline.mode, scenarioDist.baseline.confidence);
                g.append("path")
                    .datum(baselineBg)
                    .attr("fill", "none")
                    .attr("stroke", "#3b82f6")
                    .attr("stroke-width", 2)
                    .attr("stroke-opacity", 0.15)
                    .attr("d", line);

                // Treatment background
                const treatmentBg = getBetaPdfPoints(scenarioDist.treatment.min, scenarioDist.treatment.max, scenarioDist.treatment.mode, scenarioDist.treatment.confidence);
                g.append("path")
                    .datum(treatmentBg)
                    .attr("fill", "none")
                    .attr("stroke", "#22c55e")
                    .attr("stroke-width", 2)
                    .attr("stroke-opacity", 0.15)
                    .attr("d", line);
            });

        // Draw main curves (using the already calculated data)

        g.append("path")
            .datum(baselinePdfData)
            .attr("fill", "none")
            .attr("stroke", "#3b82f6")
            .attr("stroke-width", 3)
            .attr("d", line);

        g.append("path")
            .datum(treatmentPdfData)
            .attr("fill", "none")
            .attr("stroke", "#22c55e")
            .attr("stroke-width", 3)
            .attr("d", line);

        // Add legend
        const legend = g.append("g")
            .attr("transform", `translate(${width - 100}, 20)`);

        legend.append("line")
            .attr("x1", 0).attr("x2", 20)
            .attr("y1", 0).attr("y2", 0)
            .attr("stroke", "#3b82f6")
            .attr("stroke-width", 3);

        legend.append("text")
            .attr("x", 25)
            .attr("y", 0)
            .attr("dy", "0.35em")
            .text("Baseline");

        legend.append("line")
            .attr("x1", 0).attr("x2", 20)
            .attr("y1", 20).attr("y2", 20)
            .attr("stroke", "#22c55e")
            .attr("stroke-width", 3);

        legend.append("text")
            .attr("x", 25)
            .attr("y", 20)
            .attr("dy", "0.35em")
            .text("Treatment");

        // Control points data
        const controlPoints = [
            { x: baselineDistribution.min, type: 'baseline', parameter: 'min', label: 'min' },
            { x: baselineDistribution.mode, type: 'baseline', parameter: 'mode', label: 'mode' },
            { x: baselineDistribution.max, type: 'baseline', parameter: 'max', label: 'max' },
            { x: treatmentDistribution.min, type: 'treatment', parameter: 'min', label: 'min' },
            { x: treatmentDistribution.mode, type: 'treatment', parameter: 'mode', label: 'mode' },
            { x: treatmentDistribution.max, type: 'treatment', parameter: 'max', label: 'max' },
        ];

        // Add draggable control points
        const pointsGroup = g.append("g").attr("class", "control-points");

        controlPoints.forEach((point, i) => {
            const isBaseline = point.type === 'baseline';
            const yPos = height + (isBaseline ? 20 : 40);
            const color = isBaseline ? "#3b82f6" : "#22c55e";

            const pointGroup = pointsGroup.append("g")
                .attr("class", `point-${i}`)
                .style("cursor", "ew-resize");

            // Add larger invisible circle for easier clicking
            pointGroup.append("circle")
                .attr("cx", xScale(point.x))
                .attr("cy", yPos)
                .attr("r", 15)
                .attr("fill", "transparent");

            // Add visible circle
            const circle = pointGroup.append("circle")
                .attr("cx", xScale(point.x))
                .attr("cy", yPos)
                .attr("r", 8)
                .attr("fill", color)
                .attr("stroke", "white")
                .attr("stroke-width", 2);

            // Add label
            pointGroup.append("text")
                .attr("x", xScale(point.x))
                .attr("y", yPos + (isBaseline ? -15 : 25))
                .attr("text-anchor", "middle")
                .attr("font-size", "10px")
                .attr("fill", color)
                .text(point.label);

            // Add drag behavior
            pointGroup.call(
                d3.drag<SVGGElement, unknown>()
                    .on("start", function() {
                        circle.attr("r", 10);
                        console.log(`Started dragging ${point.label} ${point.type}`, { currentValue: point.x });
                    })
                    .on("drag", function(event) {
                        // Get mouse position relative to the SVG element and adjust for margin
                        const mousePosScg = d3.pointer(event, svg.node());
                        const x = mousePosScg[0] - margin.left; // Subtract left margin to get chart-relative position
                        
                        // Convert pixel position to data value
                        const rawValue = xScale.invert(x);
                        
                        console.log(`Dragging ${point.parameter}:`, {
                            mouseX: x,
                            mousePosScg: mousePosScg,
                            adjustedX: x,
                            rawValue: rawValue,
                            chartWidth: width,
                            marginLeft: margin.left,
                            xScaleDomain: xScale.domain(),
                            xScaleRange: xScale.range()
                        });
                        
                        handleDrag(point.type as 'baseline' | 'treatment', point.parameter as 'min' | 'mode' | 'max', rawValue);
                    })
                    .on("end", function() {
                        circle.attr("r", 8);
                        console.log(`Ended dragging ${point.label} ${point.type}`);
                    })
            );
        });

        // Add title
        svg.append("text")
            .attr("x", width / 2 + margin.left)
            .attr("y", 20)
            .attr("text-anchor", "middle")
            .attr("font-size", "16px")
            .attr("font-weight", "bold")
            .text(`Outcome Distribution for Scenario ${scenarioId.split('_')[1]}`);

    }, [baselineDistribution, treatmentDistribution, allData, scenarioId, handleDrag]);

    return (
        <div ref={containerRef} className="bg-white p-4 sm:p-6 rounded-lg shadow-md border border-gray-200">
            <svg
                ref={svgRef}
                className="w-full h-auto"
                style={{ minHeight: '400px' }}
            />
        </div>
    );
};