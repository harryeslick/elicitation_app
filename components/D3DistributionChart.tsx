import * as d3 from 'd3';
import React, { useCallback, useEffect, useRef } from 'react';
import { getBetaPdfPoints } from '../services/betaUtils';
import { Distribution, ElicitationData, Scenario, ScenarioDistribution } from '../types';

interface D3DistributionChartProps {
    scenarioId: string;
    allData: ElicitationData;
    selectedDistribution?: ScenarioDistribution;
    currentScenario?: Scenario;
    onDistributionChange: (scenarioId: string, type: 'baseline' | 'treatment', newDistribution: Distribution) => void;
}

const defaultBaselineDistribution: Distribution = { min: 20, max: 80, mode: 40, confidence: 50 };
const defaultTreatmentDistribution: Distribution = { min: 0, max: 60, mode: 30, confidence: 50 };
const defaultScenarioDist: ScenarioDistribution = { baseline: defaultBaselineDistribution, treatment: defaultTreatmentDistribution };

export const D3DistributionChart: React.FC<D3DistributionChartProps> = ({ 
    scenarioId, 
    allData, 
    selectedDistribution, 
    currentScenario,
    onDistributionChange 
}) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    const { baseline, treatment } = selectedDistribution || defaultScenarioDist;
    const baselineDistribution = baseline || defaultBaselineDistribution;
    const treatmentDistribution = treatment || defaultTreatmentDistribution;

        const handleDrag = useCallback((type: 'baseline' | 'treatment', parameter: 'min' | 'mode' | 'max', newValue: number) => {
        if (isNaN(newValue)) {
            return;
        }

        let clampedValue = Math.round(Math.max(0, Math.min(100, newValue)));
        
        // For treatment, enforce that values cannot exceed corresponding baseline values
        if (type === 'treatment') {
            switch (parameter) {
                case 'min':
                    clampedValue = Math.min(clampedValue, baselineDistribution.min);
                    break;
                case 'max':
                    clampedValue = Math.min(clampedValue, baselineDistribution.max);
                    break;
                case 'mode':
                    clampedValue = Math.min(clampedValue, baselineDistribution.mode);
                    break;
            }
        }
        
        const currentDistribution = type === 'baseline' ? baselineDistribution : treatmentDistribution;
        let { min, max, mode, confidence } = currentDistribution;
        
        switch (parameter) {
            case 'min':
                min = clampedValue;
                // Ensure max is at least min, and mode is at least min
                max = Math.max(clampedValue, max);
                mode = Math.max(clampedValue, mode);
                break;
            case 'max':
                max = clampedValue;
                // Ensure min is at most max, and mode is at most max
                min = Math.min(clampedValue, min);
                mode = Math.min(clampedValue, mode);
                break;
            case 'mode':
                // Mode must be between min and max
                mode = Math.max(min, Math.min(clampedValue, max));
                break;
        }

        // If this is a baseline change, we need to also adjust treatment to maintain the constraint
        const updatedDistribution = { min, max, mode, confidence };
        onDistributionChange(scenarioId, type, updatedDistribution);

        // If baseline was changed, enforce treatment constraints
        if (type === 'baseline') {
            const treatmentNeedsUpdate = 
                treatmentDistribution.min > min ||
                treatmentDistribution.max > max ||
                treatmentDistribution.mode > mode;

            if (treatmentNeedsUpdate) {
                const adjustedTreatment = {
                    min: Math.min(treatmentDistribution.min, min),
                    max: Math.min(treatmentDistribution.max, max),
                    mode: Math.min(treatmentDistribution.mode, mode),
                    confidence: treatmentDistribution.confidence
                };
                onDistributionChange(scenarioId, 'treatment', adjustedTreatment);
            }
        }
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

        // Remove any existing tooltips first
        d3.selectAll(".chart-tooltip").remove();

        // Create tooltip element
        const tooltip = d3.select("body").append("div")
            .attr("class", "chart-tooltip")
            .style("position", "absolute")
            .style("background", "rgba(0, 0, 0, 0.8)")
            .style("color", "white")
            .style("padding", "8px 12px")
            .style("border-radius", "4px")
            .style("font-size", "12px")
            .style("font-family", "sans-serif")
            .style("pointer-events", "none")
            .style("opacity", 0)
            .style("z-index", "1000");

        controlPoints.forEach((point, i) => {
            const isBaseline = point.type === 'baseline';
            const yPos = height + (isBaseline ? 45 : 65); // Moved further down to avoid label overlap
            const color = isBaseline ? "#3b82f6" : "#22c55e";

            // Helper function to calculate tonnage and format tooltip
            const formatTooltip = (value: number) => {
                const percentage = Math.round(value * 10) / 10;
                let tonnage = "N/A";
                if (currentScenario && currentScenario["Yield (t)"]) {
                    const baselineYield = currentScenario["Yield (t)"] as number;
                    // Calculate remaining yield after loss: baselineYield * (1 - lossPercentage / 100)
                    tonnage = (baselineYield * (1 - percentage / 100)).toFixed(2);
                }
                return `${percentage}% (${tonnage} t)`;
            };

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
            let isDragging = false;
            pointGroup.call(
                d3.drag<SVGGElement, unknown>()
                    .on("start", function(event) {
                        isDragging = true;
                        circle.attr("r", 10);
                        // Show tooltip during drag - no transition to avoid flickering
                        tooltip.style("opacity", 0.9)
                            .html(formatTooltip(point.x))
                            .style("left", (event.sourceEvent.pageX + 10) + "px")
                            .style("top", (event.sourceEvent.pageY - 28) + "px");
                    })
                    .on("drag", function(event) {
                        // Get mouse position relative to the SVG element and adjust for margin
                        const mousePosScg = d3.pointer(event, svg.node());
                        const x = mousePosScg[0] - margin.left; // Subtract left margin to get chart-relative position
                        
                        // Convert pixel position to data value
                        const rawValue = xScale.invert(x);
                        
                        // Update tooltip with current drag value - no transition for smooth updates
                        const clampedValue = Math.max(0, Math.min(100, rawValue));
                        tooltip.html(formatTooltip(clampedValue))
                            .style("left", (event.sourceEvent.pageX + 10) + "px")
                            .style("top", (event.sourceEvent.pageY - 28) + "px");

                        handleDrag(point.type as 'baseline' | 'treatment', point.parameter as 'min' | 'mode' | 'max', rawValue);
                    })
                    .on("end", function() {
                        isDragging = false;
                        circle.attr("r", 8);
                        // Hide tooltip after drag ends with transition
                        tooltip.transition()
                            .duration(300)
                            .style("opacity", 0);
                    })
            );

            // Update hover events to respect dragging state
            pointGroup
                .on("mouseenter", function(event) {
                    if (!isDragging) {
                        tooltip.transition()
                            .duration(200)
                            .style("opacity", 0.9);
                        tooltip.html(formatTooltip(point.x))
                            .style("left", (event.pageX + 10) + "px")
                            .style("top", (event.pageY - 28) + "px");
                    }
                })
                .on("mouseleave", function() {
                    if (!isDragging) {
                        tooltip.transition()
                            .duration(500)
                            .style("opacity", 0);
                    }
                });
        });

        // Add title
        svg.append("text")
            .attr("x", width / 2 + margin.left)
            .attr("y", 20)
            .attr("text-anchor", "middle")
            .attr("font-size", "16px")
            .attr("font-weight", "bold")
            .text(`Outcome Distribution for Scenario ${scenarioId.split('_')[1]}`);

        // Cleanup function to remove tooltip on component unmount
        return () => {
            d3.selectAll(".chart-tooltip").remove();
        };

    }, [baselineDistribution, treatmentDistribution, allData, scenarioId, currentScenario, handleDrag]);

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