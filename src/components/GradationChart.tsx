'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useAppContext } from '@/context/AppContext';
import { computeAndValidatePile, computeBlend } from '@/utils/calculations';
import { MORTH_ENVELOPES } from '@/utils/constants';
import { useResizeObserver } from '@/hooks/useResizeObserver';
import { EnvelopeLimit } from '@/types';

export default function GradationChart() {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const dimensions = useResizeObserver(containerRef);
    const { state } = useAppContext();
    const [tooltipContent, setTooltipContent] = useState<React.ReactNode | null>(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const [showTooltip, setShowTooltip] = useState(false);

    useEffect(() => {
        if (!svgRef.current || !containerRef.current || dimensions.width === 0) return;

        // Dimensions
        const width = dimensions.width;
        const height = 400;
        const margin = { top: 20, right: 30, bottom: 40, left: 50 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        // Clear previous SVG contents
        d3.select(svgRef.current).selectAll('*').remove();

        const svg = d3.select(svgRef.current)
            .attr('width', width)
            .attr('height', height)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Prepare data
        const pilesPassing = state.piles.map(pile =>
            computeAndValidatePile(pile).computed.percentPassing
        );

        const combinedPassing = computeBlend(pilesPassing, state.proportions);

        // X Axis domain
        const sizes = state.sieves.map(s => s.size_mm);
        if (sizes.length === 0) return;

        const minSize = Math.max(0.01, Math.min(...sizes));
        const maxSize = Math.max(...sizes);

        const xScale = d3.scaleLog()
            .domain([minSize, maxSize])
            .range([0, innerWidth]);

        const yScale = d3.scaleLinear()
            .domain([0, 100])
            .range([innerHeight, 0]);

        // Gridlines
        const xAxisGrid = d3.axisBottom(xScale).tickSize(-innerHeight).tickFormat(() => '').ticks(10);
        const yAxisGrid = d3.axisLeft(yScale).tickSize(-innerWidth).tickFormat(() => '').ticks(10);

        svg.append('g')
            .attr('class', 'grid stroke-slate-200 stroke-[0.5] stroke-dasharray-[2,2]')
            .attr('transform', `translate(0,${innerHeight})`)
            .call(xAxisGrid)
            .call(g => g.select(".domain").remove());

        svg.append('g')
            .attr('class', 'grid stroke-slate-200 stroke-[0.5] stroke-dasharray-[2,2]')
            .call(yAxisGrid)
            .call(g => g.select(".domain").remove());

        // Axes
        const xAxis = d3.axisBottom(xScale).ticks(5, "~s");
        const yAxis = d3.axisLeft(yScale);

        svg.append('g')
            .attr('transform', `translate(0,${innerHeight})`)
            .call(xAxis)
            .call(g => g.selectAll(".domain").style("stroke", "#64748b"))
            .call(g => g.selectAll("line").style("stroke", "#64748b"))
            .selectAll("text")
            .style("text-anchor", "middle")
            .style("fill", "#334155");

        svg.append('text')
            .attr('x', innerWidth / 2)
            .attr('y', innerHeight + 35)
            .style('text-anchor', 'middle')
            .attr('class', 'text-xs')
            .style('fill', '#64748b')
            .text('Sieve Size (mm) [Log Scale]');

        svg.append('g')
            .call(yAxis)
            .call(g => g.selectAll(".domain").style("stroke", "#64748b"))
            .call(g => g.selectAll("line").style("stroke", "#64748b"))
            .selectAll("text")
            .style("fill", "#334155");

        svg.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', -35)
            .attr('x', -innerHeight / 2)
            .style('text-anchor', 'middle')
            .attr('class', 'text-xs')
            .style('fill', '#64748b')
            .text('Percent Passing (%)');

        // Envelope determination
        let activeEnvelope: { name: string, limits: EnvelopeLimit[], isCustom: boolean } | null = null;

        if (state.useCustomEnvelope) {
            const limits = state.customEnvelope?.limits || state.sieves.map(s => ({ size_mm: s.size_mm, lower: 0, upper: 100 }));
            activeEnvelope = { name: 'Custom Envelope', limits, isCustom: true };
        } else if (!state.useCustomEnvelope && state.selectedEnvelopeId) {
            const env = MORTH_ENVELOPES.find(e => e.id === state.selectedEnvelopeId);
            if (env) {
                activeEnvelope = { ...env, isCustom: false };
            }
        }

        // Draw Envelope
        if (activeEnvelope) {
            const sortedLimits = [...activeEnvelope.limits].sort((a, b) => a.size_mm - b.size_mm);

            const area = d3.area<any>()
                .x(d => xScale(Math.max(minSize, d.size_mm)))
                .y0(d => yScale(d.lower))
                .y1(d => yScale(d.upper))
                .curve(d3.curveMonotoneX);

            const fillColor = activeEnvelope.isCustom ? 'rgba(168, 85, 247, 0.15)' : 'rgba(59, 130, 246, 0.15)'; // Purple vs Blue
            const strokeColor = activeEnvelope.isCustom ? 'rgba(168, 85, 247, 0.4)' : 'rgba(59, 130, 246, 0.4)';

            svg.append('path')
                .datum(sortedLimits)
                .attr('fill', fillColor)
                .attr('stroke', strokeColor)
                .attr('stroke-width', 1)
                .attr('d', area);
        }

        // Line generator
        const line = d3.line<{ size: number, passing: number }>()
            .x(d => xScale(Math.max(minSize, d.size)))
            .y(d => yScale(d.passing))
            .curve(d3.curveMonotoneX);

        // Prepare combined data
        const combinedData = sizes.map((size, i) => ({ size, passing: combinedPassing[i], isViolating: false })).sort((a, b) => a.size - b.size);

        // Validation against envelope
        let hasGlobalViolation = false;

        if (activeEnvelope) {
            combinedData.forEach(d => {
                const limit = activeEnvelope!.limits.find(l => l.size_mm === d.size);
                if (limit) {
                    if (d.passing < limit.lower || d.passing > limit.upper) {
                        d.isViolating = true;
                        hasGlobalViolation = true;
                    }
                }
            });
        }

        const curveColor = activeEnvelope
            ? (hasGlobalViolation ? '#ef4444' : '#10b981') // red if violating anywhere, green if fully compliant
            : '#4f46e5'; // indigo by default

        svg.append('path')
            .datum(combinedData)
            .attr('fill', 'none')
            .attr('stroke', curveColor)
            .attr('stroke-width', 3)
            .attr('d', line);

        // Draw points with hover tooltips
        svg.selectAll('.combined-dot')
            .data(combinedData)
            .enter().append('circle')
            .attr('class', 'combined-dot')
            .attr('cx', d => xScale(Math.max(minSize, d.size)))
            .attr('cy', d => yScale(d.passing))
            .attr('r', 5)
            .attr('fill', d => d.isViolating ? '#fee2e2' : '#fff')
            .attr('stroke', d => d.isViolating ? '#ef4444' : curveColor)
            .attr('stroke-width', 2)
            .style('cursor', 'pointer')
            .on('mouseover', (event, d) => {
                const limit = activeEnvelope?.limits.find(l => l.size_mm === d.size);

                setTooltipContent(
                    <div className="text-xs">
                        <div className="font-semibold mb-1 border-b pb-1">Sieve: {d.size} mm</div>
                        <div className="flex justify-between gap-4">
                            <span className="text-slate-500">Passing:</span>
                            <span className="font-medium">{d.passing.toFixed(1)}%</span>
                        </div>
                        {limit && (
                            <div className="flex justify-between gap-4 mt-1">
                                <span className="text-slate-500">Limit:</span>
                                <span className="font-medium text-slate-600">{limit.lower} - {limit.upper}%</span>
                            </div>
                        )}
                        {limit && (
                            <div className={`mt-1 font-semibold ${d.isViolating ? 'text-red-500' : 'text-emerald-500'}`}>
                                Status: {d.isViolating ? '❌ Out of spec' : '✅ Compliant'}
                            </div>
                        )}
                    </div>
                );

                // Position tooltip
                const containerRect = containerRef.current!.getBoundingClientRect();
                setTooltipPos({
                    x: event.clientX - containerRect.left,
                    y: event.clientY - containerRect.top - 10
                });
                setShowTooltip(true);
            })
            .on('mousemove', (event) => {
                const containerRect = containerRef.current!.getBoundingClientRect();
                setTooltipPos({
                    x: event.clientX - containerRect.left,
                    y: event.clientY - containerRect.top - 10
                });
            })
            .on('mouseout', () => {
                setShowTooltip(false);
            });

    }, [state, dimensions, containerRef]);

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mt-6 relative" ref={containerRef}>
            <h2 className="text-lg font-semibold mb-4 text-slate-800">Gradation Curve</h2>

            <div className="w-full h-[400px]">
                <svg ref={svgRef} className="w-full h-full text-slate-900"></svg>
            </div>

            {/* Custom Tooltip */}
            {showTooltip && (
                <div
                    className="absolute bg-white p-2 rounded shadow-lg border border-slate-200 pointer-events-none z-10 transform -translate-x-1/2 -translate-y-full"
                    style={{ left: tooltipPos.x, top: tooltipPos.y }}
                >
                    {tooltipContent}
                </div>
            )}

            <div className="flex flex-wrap gap-4 mt-4 text-sm justify-center text-slate-900">
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                    <span>Combined Blend</span>
                </div>

                {(state.selectedEnvelopeId || state.useCustomEnvelope) && (
                    <>
                        <div className="flex items-center gap-1">
                            <div className={`w-3 h-3 border ${state.useCustomEnvelope ? 'bg-purple-100 border-purple-300' : 'bg-blue-100 border-blue-300'}`}></div>
                            <span>{state.useCustomEnvelope ? 'Custom Limits' : 'Standard Limits'}</span>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                            <span>Compliant</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <span>Violating</span>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
