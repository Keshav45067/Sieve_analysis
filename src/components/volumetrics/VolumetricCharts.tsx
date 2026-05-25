'use client';

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useAppContext } from '@/context/AppContext';
import { computeVolumetricResults, findOptimalBinder, fitPolynomial, calculateCombinedGsb, calculateSurfaceArea } from '@/utils/volumetrics';
import { computeAndValidatePile, computeBlend } from '@/utils/calculations';
import { useResizeObserver } from '@/hooks/useResizeObserver';
import { LineChart } from 'lucide-react';

export default function VolumetricCharts() {
    const containerRef = useRef<HTMLDivElement>(null);
    const dimensions = useResizeObserver(containerRef);
    const { state } = useAppContext();
    const { volumetrics, proportions } = state;
    const { validationState } = useAppContext();

    const pilesPercentPassing = state.piles.map(p => 
        validationState.pileValidations[p.id]?.isValid 
            ? computeAndValidatePile(p).computed.percentPassing 
            : new Array(state.sieves.length).fill(0)
    );
    const combinedPassing = computeBlend(pilesPercentPassing, state.proportions);
    const combinedGsb = calculateCombinedGsb(state.volumetrics.pileVolumetrics, state.proportions);
    
    let massGrams = state.totalAggregateMass;
    if (state.totalAggregateMassUnit === 'kg') massGrams *= 1000;
    else if (state.totalAggregateMassUnit === 'tonnes') massGrams *= 1000000;
    
    const { totalSurfaceArea } = calculateSurfaceArea(state.sieves, combinedPassing, massGrams, combinedGsb);

    const results = computeVolumetricResults(volumetrics, proportions, totalSurfaceArea);
    const targetVa = volumetrics.targetVa ?? 4.0;
    const optimalBinder = findOptimalBinder(results, targetVa);

    useEffect(() => {
        if (!containerRef.current || dimensions.width === 0 || results.length < 2) return;

        // Render 6 charts: Va, VMA, VFB, Gmb, Stability, Flow
        const chartsToRender = [
            { key: 'va', title: 'Air Voids (Va) vs Binder', color: '#ef4444', yLabel: 'Air Voids (%)' },
            { key: 'vma', title: 'VMA vs Binder', color: '#f59e0b', yLabel: 'VMA (%)' },
            { key: 'vfb', title: 'VFB vs Binder', color: '#3b82f6', yLabel: 'VFB (%)' },
            { key: 'avgGmb', title: 'Density (Gmb) vs Binder', color: '#8b5cf6', yLabel: 'Density (g/cc)' },
            { key: 'avgStability', title: 'Stability vs Binder', color: '#d97706', yLabel: 'Stability (kN)' },
            { key: 'avgFlow', title: 'Flow vs Binder', color: '#2563eb', yLabel: 'Flow (mm)' },
            { key: 'filmThickness', title: 'Film Thickness vs Binder', color: '#0f766e', yLabel: 'Film Thickness (µm)' }
        ];

        const width = dimensions.width / 2 > 300 ? dimensions.width / 2 - 20 : dimensions.width - 20; // 2 cols if wide enough
        const height = 280;
        const margin = { top: 30, right: 20, bottom: 40, left: 50 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        // Clear existing SVGs
        const container = d3.select(containerRef.current);
        container.selectAll('svg').remove();

        const xDomain = d3.extent(results, d => d.pb) as [number, number];
        
        // Add padding to X axis
        const xRange = xDomain[1] - xDomain[0];
        xDomain[0] -= xRange * 0.1;
        xDomain[1] += xRange * 0.1;

        chartsToRender.forEach(chartConfig => {
            // Filter out nulls for this specific chart
            const validData = results.filter(r => r[chartConfig.key as keyof typeof r] !== null);
            if (validData.length < 2) return; // Need at least 2 points

            const yData = validData.map(r => r[chartConfig.key as keyof typeof r] as number);
            const yDomain = d3.extent(yData) as [number, number];
            
            // Add padding to Y axis
            const yRange = yDomain[1] - yDomain[0] === 0 ? 1 : yDomain[1] - yDomain[0];
            yDomain[0] -= yRange * 0.1;
            yDomain[1] += yRange * 0.1;

            const xScale = d3.scaleLinear().domain(xDomain).range([0, innerWidth]);
            const yScale = d3.scaleLinear().domain(yDomain).range([innerHeight, 0]);

            const svg = container.append('svg')
                .attr('width', width)
                .attr('height', height)
                .attr('class', 'mb-6 md:inline-block'); // inline block for grid

            const g = svg.append('g')
                .attr('transform', `translate(${margin.left},${margin.top})`);

            // Grid lines
            g.append('g')
                .attr('class', 'grid stroke-slate-200 stroke-[0.5] stroke-dasharray-[2,2]')
                .attr('transform', `translate(0,${innerHeight})`)
                .call(d3.axisBottom(xScale).tickSize(-innerHeight).tickFormat(() => ''))
                .call(g => g.select(".domain").remove());

            g.append('g')
                .attr('class', 'grid stroke-slate-200 stroke-[0.5] stroke-dasharray-[2,2]')
                .call(d3.axisLeft(yScale).tickSize(-innerWidth).tickFormat(() => ''))
                .call(g => g.select(".domain").remove());

            // Optional: Optimal Durability Zone for Film Thickness
            if (chartConfig.key === 'filmThickness') {
                const rawYTop = yScale(10);
                const rawYBottom = yScale(8);
                const yTop = Math.max(0, Math.min(innerHeight, rawYTop));
                const yBottom = Math.max(0, Math.min(innerHeight, rawYBottom));
                const rectHeight = yBottom - yTop;
                
                if (rectHeight > 0) {
                    g.append('rect')
                        .attr('x', 0)
                        .attr('y', yTop)
                        .attr('width', innerWidth)
                        .attr('height', rectHeight)
                        .attr('fill', '#4ade80') // green-400
                        .attr('opacity', 0.2);
                        
                    if (yTop > 10) {
                        g.append('text')
                            .attr('x', innerWidth - 5)
                            .attr('y', yTop + 12)
                            .attr('text-anchor', 'end')
                            .style('font-size', '10px')
                            .style('fill', '#166534')
                            .style('font-weight', '600')
                            .text('Durability Zone (8-10µm)');
                    }
                }
            }

            // Axes
            g.append('g')
                .attr('transform', `translate(0,${innerHeight})`)
                .call(d3.axisBottom(xScale).ticks(5))
                .call(g => g.selectAll(".domain, line").style("stroke", "#94a3b8"));

            g.append('g')
                .call(d3.axisLeft(yScale).ticks(5))
                .call(g => g.selectAll(".domain, line").style("stroke", "#94a3b8"));

            // Title
            svg.append('text')
                .attr('x', width / 2)
                .attr('y', 15)
                .attr('text-anchor', 'middle')
                .style('font-size', '12px')
                .style('font-weight', '600')
                .style('fill', '#334155')
                .text(chartConfig.title);

            // X Axis Label
            svg.append('text')
                .attr('x', width / 2)
                .attr('y', height - 5)
                .attr('text-anchor', 'middle')
                .style('font-size', '11px')
                .style('fill', '#64748b')
                .text('Binder Content (Pb %)');

            // Y Axis Label
            svg.append('text')
                .attr('transform', 'rotate(-90)')
                .attr('y', 15)
                .attr('x', -height / 2)
                .attr('text-anchor', 'middle')
                .style('font-size', '11px')
                .style('fill', '#64748b')
                .text(chartConfig.yLabel);

            // Optimal Binder dashed line
            if (optimalBinder) {
                const optX = xScale(optimalBinder.pb);
                if (optX >= 0 && optX <= innerWidth) {
                    g.append('line')
                        .attr('x1', optX)
                        .attr('x2', optX)
                        .attr('y1', 0)
                        .attr('y2', innerHeight)
                        .attr('stroke', '#6366f1') // indigo-500
                        .attr('stroke-width', 1.5)
                        .attr('stroke-dasharray', '4,4');
                }
            }

            // Polynomial Curve Generation
            const pointsForPoly = validData.map(d => ({ x: d.pb, y: d[chartConfig.key as keyof typeof d] as number }));
            const poly = fitPolynomial(pointsForPoly);
            
            if (poly) {
                const curveData = [];
                const steps = 50;
                // Extend the curve slightly beyond the first and last points visually
                const minX = Math.min(...pointsForPoly.map(p => p.x));
                const maxX = Math.max(...pointsForPoly.map(p => p.x));
                const pad = (maxX - minX) * 0.05;
                const plotMin = Math.max(xDomain[0], minX - pad);
                const plotMax = Math.min(xDomain[1], maxX + pad);
                
                const stepSize = (plotMax - plotMin) / steps;
                
                for (let i = 0; i <= steps; i++) {
                    const x = plotMin + i * stepSize;
                    const y = poly.a * x * x + poly.b * x + poly.c;
                    curveData.push({x, y});
                }
                
                const line = d3.line<{x: number, y: number}>()
                    .x(d => xScale(d.x))
                    .y(d => yScale(d.y))
                    .curve(d3.curveMonotoneX);

                g.append('path')
                    .datum(curveData)
                    .attr('fill', 'none')
                    .attr('stroke', chartConfig.color)
                    .attr('stroke-width', 2.5)
                    .attr('d', line);
            } else {
                // Fallback to strict lines if polynomial fails
                const line = d3.line<any>()
                    .x(d => xScale(d.pb))
                    .y(d => yScale(d[chartConfig.key]))
                    .curve(d3.curveLinear);
                g.append('path')
                    .datum(validData)
                    .attr('fill', 'none')
                    .attr('stroke', chartConfig.color)
                    .attr('stroke-width', 2.5)
                    .attr('d', line);
            }

            // Points
            g.selectAll('circle')
                .data(validData)
                .enter().append('circle')
                .attr('cx', d => xScale(d.pb))
                .attr('cy', d => yScale(d[chartConfig.key as keyof typeof d] as number))
                .attr('r', 4)
                .attr('fill', '#fff')
                .attr('stroke', chartConfig.color)
                .attr('stroke-width', 2);
        });
    }, [results, dimensions, optimalBinder]);

    if (!volumetrics.isSetupComplete || results.length < 2) return null;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <LineChart className="w-5 h-5 text-blue-500" />
                    <h2 className="text-lg font-semibold text-slate-800">Volumetric & Stability Trends</h2>
                </div>
                {optimalBinder && (
                    <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded">
                        <div className="w-3 h-0.5 bg-indigo-500 border-t border-dashed border-indigo-500"></div>
                        Optimum Binder Content
                    </div>
                )}
            </div>
            <div className="p-6">
                <div 
                    ref={containerRef} 
                    className="w-full flex flex-wrap justify-between items-center gap-y-6"
                />
            </div>
        </div>
    );
}
