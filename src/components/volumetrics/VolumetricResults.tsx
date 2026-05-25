'use client';

import React from 'react';
import { useAppContext } from '@/context/AppContext';
import { computeVolumetricResults, findOptimalBinder, calculateCombinedGsb, calculateSurfaceArea } from '@/utils/volumetrics';
import { computeAndValidatePile, computeBlend } from '@/utils/calculations';
import { CheckCircle2, AlertTriangle, FileSpreadsheet, Target } from 'lucide-react';

export default function VolumetricResults() {
    const { state } = useAppContext();
    const { volumetrics, proportions } = state;
    const { validationState } = useAppContext();

    if (!volumetrics.isSetupComplete) return null;

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

    // Simple visual indicators based on general MoRTH/Marshall limits
    const checkVa = (va: number | null) => {
        if (va === null) return { status: 'unknown', text: '-' };
        if (va >= 3 && va <= 5) return { status: 'ok', text: 'OK' };
        if (va < 3) return { status: 'low', text: 'Low' };
        return { status: 'high', text: 'High' };
    };

    const checkVma = (vma: number | null) => {
        if (vma === null) return { status: 'unknown', text: '-' };
        if (vma >= 13) return { status: 'ok', text: 'OK' };
        return { status: 'low', text: 'Low' };
    };

    const checkVfb = (vfb: number | null) => {
        if (vfb === null) return { status: 'unknown', text: '-' };
        if (vfb >= 65 && vfb <= 75) return { status: 'ok', text: 'OK' };
        if (vfb < 65) return { status: 'low', text: 'Low' };
        return { status: 'high', text: 'High' };
    };

    const checkFilmThickness = (ft: number | null) => {
        if (ft === null) return { status: 'unknown', text: '-' };
        if (ft < 6) return { status: 'low', text: 'Dry' };
        if (ft <= 8) return { status: 'ok', text: 'Acceptable' };
        if (ft <= 10) return { status: 'optimal', text: 'Optimal' };
        return { status: 'high', text: 'Rich' };
    };

    const StatusBadge = ({ type, text }: { type: string, text?: string }) => {
        if (type === 'ok') return <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded"><CheckCircle2 className="w-3 h-3"/> {text || 'OK'}</span>;
        if (type === 'optimal') return <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200"><CheckCircle2 className="w-3 h-3"/> {text || 'Optimal'}</span>;
        if (type === 'low') return <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded"><AlertTriangle className="w-3 h-3"/> {text || 'Low'}</span>;
        if (type === 'high') return <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded"><AlertTriangle className="w-3 h-3"/> {text || 'High'}</span>;
        return <span className="text-slate-400">-</span>;
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
            {totalSurfaceArea <= 0 && (
                <div className="bg-amber-50 border-b border-amber-200 p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                        <h3 className="font-semibold text-amber-800">Aggregate Surface Area Missing</h3>
                        <p className="text-sm text-amber-700 mt-1">
                            Film thickness cannot be calculated. Please complete the Surface Area Analysis section in the Blending module (requires valid Aggregate Blending and Combined Gsb).
                        </p>
                    </div>
                </div>
            )}
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
                    <h2 className="text-lg font-semibold text-slate-800">Volumetric Properties & Stability</h2>
                </div>
            </div>
            
            <div className="p-6 overflow-x-auto">
                <table className="min-w-full text-sm text-left text-slate-600 border-collapse mb-8">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                        <tr>
                            <th className="px-3 py-3 font-medium border-b border-slate-200">Binder (Pb)</th>
                            <th className="px-3 py-3 font-medium text-center border-b border-slate-200">Avg Gmb</th>
                            <th className="px-3 py-3 font-medium text-center border-b border-slate-200">Gmm</th>
                            <th className="px-3 py-3 font-medium text-center border-b border-slate-200">Air Voids (Va)</th>
                            <th className="px-3 py-3 font-medium text-center border-b border-slate-200">VMA</th>
                            <th className="px-3 py-3 font-medium text-center border-b border-slate-200">VFB</th>
                            <th className="px-3 py-3 font-medium text-center border-b border-slate-200 text-amber-600">Stability (kN)</th>
                            <th className="px-3 py-3 font-medium text-center border-b border-slate-200 text-blue-600">Flow (mm)</th>
                            <th className="px-3 py-3 font-medium text-center border-b border-slate-200 text-teal-600">Film Thickness (microns)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {results.map((r, idx) => {
                            const vaStatus = checkVa(r.va);
                            const vmaStatus = checkVma(r.vma);
                            const vfbStatus = checkVfb(r.vfb);

                            return (
                                <tr key={idx} className="hover:bg-slate-50">
                                    <td className="px-3 py-3 font-bold text-slate-900">{r.pb.toFixed(1)}%</td>
                                    <td className="px-3 py-3 text-center text-slate-700">{r.avgGmb ? r.avgGmb.toFixed(3) : '-'}</td>
                                    <td className="px-3 py-3 text-center text-slate-700">{r.gmm ? r.gmm.toFixed(3) : '-'}</td>
                                    <td className="px-3 py-3 text-center">
                                        <div className="flex flex-col items-center justify-center gap-1">
                                            <span className="font-semibold text-slate-800">{r.va ? r.va.toFixed(1) + '%' : '-'}</span>
                                            {r.va !== null && <StatusBadge type={vaStatus.status} text={vaStatus.text} />}
                                        </div>
                                    </td>
                                    <td className="px-3 py-3 text-center">
                                        <div className="flex flex-col items-center justify-center gap-1">
                                            <span className="font-semibold text-slate-800">{r.vma ? r.vma.toFixed(1) + '%' : '-'}</span>
                                            {r.vma !== null && <StatusBadge type={vmaStatus.status} text={vmaStatus.text} />}
                                        </div>
                                    </td>
                                    <td className="px-3 py-3 text-center">
                                        <div className="flex flex-col items-center justify-center gap-1">
                                            <span className="font-semibold text-slate-800">{r.vfb ? r.vfb.toFixed(1) + '%' : '-'}</span>
                                            {r.vfb !== null && <StatusBadge type={vfbStatus.status} text={vfbStatus.text} />}
                                        </div>
                                    </td>
                                    <td className="px-3 py-3 text-center font-bold text-amber-700">
                                        {r.avgStability ? r.avgStability.toFixed(1) : '-'}
                                    </td>
                                    <td className="px-3 py-3 text-center font-bold text-blue-700">
                                        {r.avgFlow ? r.avgFlow.toFixed(1) : '-'}
                                    </td>
                                    <td className="px-3 py-3 text-center">
                                        <div className="flex flex-col items-center justify-center gap-1">
                                            <span className="font-semibold text-teal-700">{r.filmThickness ? r.filmThickness.toFixed(1) : '-'}</span>
                                            {r.filmThickness !== null && <StatusBadge type={checkFilmThickness(r.filmThickness).status} text={checkFilmThickness(r.filmThickness).text} />}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {/* Optimal Binder Section */}
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Target className="w-5 h-5 text-indigo-600" />
                        <h3 className="text-md font-bold text-slate-800">Optimal Mix Design</h3>
                        <span className="text-sm text-slate-500 ml-2">
                            (Interpolated at {targetVa.toFixed(1)}% Air Voids)
                        </span>
                    </div>

                    {optimalBinder ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                            <div className="bg-indigo-600 rounded-lg p-3 text-white col-span-2 md:col-span-1 shadow-md">
                                <div className="text-xs text-indigo-200 font-medium mb-1">Optimum Binder (Pb)</div>
                                <div className="text-2xl font-bold">{optimalBinder.pb.toFixed(2)}%</div>
                            </div>
                            <div className="bg-white border border-slate-200 rounded-lg p-3">
                                <div className="text-xs text-slate-500 font-medium mb-1">Gmb</div>
                                <div className="text-lg font-bold text-slate-800">{optimalBinder.avgGmb?.toFixed(3)}</div>
                            </div>
                            <div className="bg-white border border-slate-200 rounded-lg p-3">
                                <div className="text-xs text-slate-500 font-medium mb-1">VMA</div>
                                <div className="text-lg font-bold text-slate-800">{optimalBinder.vma?.toFixed(1)}%</div>
                            </div>
                            <div className="bg-white border border-slate-200 rounded-lg p-3">
                                <div className="text-xs text-slate-500 font-medium mb-1">VFB</div>
                                <div className="text-lg font-bold text-slate-800">{optimalBinder.vfb?.toFixed(1)}%</div>
                            </div>
                            <div className="bg-white border border-slate-200 rounded-lg p-3">
                                <div className="text-xs text-amber-500 font-medium mb-1">Stability</div>
                                <div className="text-lg font-bold text-amber-700">{optimalBinder.avgStability?.toFixed(1)} kN</div>
                            </div>
                            <div className="bg-white border border-slate-200 rounded-lg p-3">
                                <div className="text-xs text-blue-500 font-medium mb-1">Flow</div>
                                <div className="text-lg font-bold text-blue-700">{optimalBinder.avgFlow?.toFixed(1)} mm</div>
                            </div>
                            <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 col-span-2 md:col-span-1">
                                <div className="text-xs text-teal-700 font-medium mb-1 flex items-center justify-between">
                                    Film Thickness
                                    {optimalBinder.filmThickness !== null && <StatusBadge type={checkFilmThickness(optimalBinder.filmThickness).status} text={checkFilmThickness(optimalBinder.filmThickness).text} />}
                                </div>
                                <div className="text-lg font-bold text-teal-800">{optimalBinder.filmThickness?.toFixed(1)} µm</div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-sm text-slate-500 italic">
                            Cannot determine optimal binder content. Please ensure enough valid data points exist to bracket the target Air Voids of {targetVa.toFixed(1)}%.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
