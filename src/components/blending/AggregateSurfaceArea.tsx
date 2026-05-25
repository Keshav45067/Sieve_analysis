import React, { useState } from 'react';
import { Layers, ChevronDown, ChevronUp, Droplets, Info } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { computeAndValidatePile, computeBlend } from '@/utils/calculations';
import { calculateCombinedGsb, calculateSurfaceArea } from '@/utils/volumetrics';
import { Unit } from '@/types';

export default function AggregateSurfaceArea() {
    const { state, validationState, updateTotalAggregateMass } = useAppContext();
    const [isExpanded, setIsExpanded] = useState(true);

    const pilesPercentPassing = state.piles.map(p => 
        validationState.pileValidations[p.id]?.isValid 
            ? computeAndValidatePile(p).computed.percentPassing 
            : new Array(state.sieves.length).fill(0)
    );
    const combinedPassing = computeBlend(pilesPercentPassing, state.proportions);
    const combinedGsb = calculateCombinedGsb(state.volumetrics.pileVolumetrics, state.proportions);

    let massGrams = state.totalAggregateMass ?? 1000;
    const massUnit = state.totalAggregateMassUnit ?? 'g';
    
    if (massUnit === 'kg') {
        massGrams = massGrams * 1000;
    } else if (massUnit === 'tonnes') {
        massGrams = massGrams * 1000000;
    }

    const { fractions, totalSurfaceArea } = calculateSurfaceArea(
        state.sieves,
        combinedPassing,
        massGrams,
        combinedGsb
    );

    const handleMassChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateTotalAggregateMass(parseFloat(e.target.value) || 0, massUnit);
    };

    const handleUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        updateTotalAggregateMass(state.totalAggregateMass ?? 1000, e.target.value as Unit);
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div 
                className="bg-indigo-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between cursor-pointer hover:bg-indigo-100 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2">
                    <Droplets className="w-5 h-5 text-indigo-600" />
                    <h2 className="text-sm font-semibold text-slate-800">Aggregate Surface Area Analysis</h2>
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
            </div>

            {isExpanded && (
                <div className="p-4 space-y-4">
                    {!combinedGsb && (
                        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-2 rounded-lg flex gap-2">
                            <Info className="w-4 h-4 shrink-0" />
                            <p>Surface Area calculation requires Combined Gsb. Please configure Pile Specific Gravities in the Volumetric Analysis tab.</p>
                        </div>
                    )}

                    <div className="flex items-end gap-3">
                        <div className="flex-1">
                            <label className="block text-xs font-medium text-slate-700 mb-1">Total Aggregate Mass</label>
                            <input 
                                type="number" 
                                min="0" 
                                step="1"
                                className="w-full text-sm rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                value={state.totalAggregateMass ?? 1000}
                                onChange={handleMassChange}
                            />
                        </div>
                        <div className="w-24">
                            <select 
                                className="w-full text-sm rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                value={massUnit}
                                onChange={handleUnitChange}
                            >
                                <option value="g">g</option>
                                <option value="kg">kg</option>
                            </select>
                        </div>
                    </div>

                    <div className="bg-slate-800 rounded-lg p-4 text-center shadow-inner">
                        <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold mb-1">Total Surface Area</p>
                        <p className="text-3xl font-bold text-white">
                            {combinedGsb ? totalSurfaceArea.toFixed(4) : '-'} <span className="text-base font-normal text-slate-400">m²/kg</span>
                        </p>
                    </div>

                    {combinedGsb && fractions.length > 0 && (
                        <div className="overflow-x-auto rounded-lg border border-slate-200">
                            <table className="w-full text-xs text-left text-slate-600">
                                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                                    <tr>
                                        <th className="px-3 py-2">Fraction (mm)</th>
                                        <th className="px-3 py-2">% Retained</th>
                                        <th className="px-3 py-2">Mass (g)</th>
                                        <th className="px-3 py-2">Mean Dia (mm)</th>
                                        <th className="px-3 py-2">SA (mm²)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {fractions.map((f, i) => (
                                        <tr key={i} className="hover:bg-slate-50">
                                            <td className="px-3 py-1.5 whitespace-nowrap">
                                                {f.upperSieve.toFixed(2)} - {f.lowerSieve.toFixed(3)}
                                            </td>
                                            <td className="px-3 py-1.5">{f.retainedPercent.toFixed(1)}%</td>
                                            <td className="px-3 py-1.5">{f.mass.toFixed(1)}</td>
                                            <td className="px-3 py-1.5 text-indigo-600 font-medium">{f.meanDiameter.toFixed(3)}</td>
                                            <td className="px-3 py-1.5">{f.contribution.toFixed(0)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
