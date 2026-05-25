'use client';

import React from 'react';
import { useAppContext } from '@/context/AppContext';
import { calculatePileGsb, calculateCombinedGsb } from '@/utils/volumetrics';
import { Layers } from 'lucide-react';

export default function AggregateGsb() {
    const { state, updateVolumetrics } = useAppContext();
    const { volumetrics, piles, proportions } = state;

    const handleUpdate = (pileId: string, field: 'gc' | 'gf' | 'pc' | 'pf', value: number) => {
        updateVolumetrics((prev) => {
            const newPileVolumetrics = prev.pileVolumetrics.map(pv => {
                if (pv.pileId === pileId) {
                    const updated = { ...pv, [field]: value };
                    
                    // Auto-balance pc and pf if one is changed
                    if (field === 'pc') updated.pf = 100 - value;
                    if (field === 'pf') updated.pc = 100 - value;
                    
                    updated.gSb = calculatePileGsb(updated.pc, updated.pf, updated.gc, updated.gf);
                    return updated;
                }
                return pv;
            });
            return { ...prev, pileVolumetrics: newPileVolumetrics };
        });
    };

    // Make sure we only show piles that actually exist in the blending state
    const activePileVolumetrics = volumetrics.pileVolumetrics.filter(pv => 
        piles.some(p => p.id === pv.pileId)
    );

    const combinedGsb = calculateCombinedGsb(activePileVolumetrics, proportions);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-amber-500" />
                    <h2 className="text-lg font-semibold text-slate-800">Aggregate Specific Gravity (Gsb)</h2>
                </div>
                {combinedGsb && (
                    <div className="bg-amber-50 border border-amber-200 px-4 py-1.5 rounded-lg flex items-center gap-3">
                        <span className="text-sm font-medium text-amber-800">Combined Gsb:</span>
                        <span className="text-lg font-bold text-amber-900">{combinedGsb.toFixed(3)}</span>
                    </div>
                )}
            </div>

            <div className="p-6 overflow-x-auto">
                <table className="min-w-full text-sm text-left text-slate-600">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                        <tr>
                            <th className="px-4 py-3 font-medium">Pile</th>
                            <th className="px-4 py-3 font-medium text-center">Blend %</th>
                            <th className="px-4 py-3 font-medium text-center">Coarse % (Pc)</th>
                            <th className="px-4 py-3 font-medium text-center">Fine % (Pf)</th>
                            <th className="px-4 py-3 font-medium text-center">Coarse SG (Gc)</th>
                            <th className="px-4 py-3 font-medium text-center">Fine SG (Gf)</th>
                            <th className="px-4 py-3 font-medium text-right text-indigo-600">Pile Gsb</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {activePileVolumetrics.map((pv, idx) => {
                            const pileName = piles.find(p => p.id === pv.pileId)?.name || 'Unknown';
                            const blendPercent = proportions[idx] !== undefined ? (proportions[idx] * 100).toFixed(1) : '0.0';
                            
                            return (
                                <tr key={pv.pileId} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                                        {pileName}
                                    </td>
                                    <td className="px-4 py-3 text-center bg-slate-50/50">
                                        {blendPercent}%
                                    </td>
                                    <td className="px-4 py-3">
                                        <input
                                            type="number"
                                            value={pv.pc}
                                            onChange={(e) => handleUpdate(pv.pileId, 'pc', parseFloat(e.target.value) || 0)}
                                            className="w-16 mx-auto block px-2 py-1 border border-slate-300 rounded text-center text-sm focus:ring-amber-500 focus:border-amber-500"
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <input
                                            type="number"
                                            value={pv.pf}
                                            onChange={(e) => handleUpdate(pv.pileId, 'pf', parseFloat(e.target.value) || 0)}
                                            className="w-16 mx-auto block px-2 py-1 border border-slate-300 rounded text-center text-sm focus:ring-amber-500 focus:border-amber-500"
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={pv.gc}
                                            onChange={(e) => handleUpdate(pv.pileId, 'gc', parseFloat(e.target.value) || 0)}
                                            className="w-20 mx-auto block px-2 py-1 border border-slate-300 rounded text-center text-sm focus:ring-amber-500 focus:border-amber-500"
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={pv.gf}
                                            onChange={(e) => handleUpdate(pv.pileId, 'gf', parseFloat(e.target.value) || 0)}
                                            className="w-20 mx-auto block px-2 py-1 border border-slate-300 rounded text-center text-sm focus:ring-amber-500 focus:border-amber-500"
                                        />
                                    </td>
                                    <td className="px-4 py-3 text-right font-bold text-indigo-700 bg-indigo-50/30">
                                        {pv.gSb ? pv.gSb.toFixed(3) : '-'}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
