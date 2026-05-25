'use client';

import React from 'react';
import { useAppContext } from '@/context/AppContext';
import { calculateExperimentalGmm, calculateGse, calculateCombinedGsb } from '@/utils/volumetrics';
import { Beaker } from 'lucide-react';

export default function GmmCalculations() {
    const { state, updateVolumetrics } = useAppContext();
    const { volumetrics, proportions } = state;

    if (!volumetrics.isSetupComplete) return null;

    const method = volumetrics.gmmCalculationMethod || 'practical';

    const handleMethodToggle = (newMethod: 'practical' | 'theoretical') => {
        updateVolumetrics(prev => {
            let gSe = prev.gSe;
            if (newMethod === 'practical') {
                if (prev.avgExperimentalGmm) {
                    const activeBinder = prev.binders.find(b => b.id === prev.gmmBinderId);
                    if (activeBinder) {
                        gSe = calculateGse(activeBinder.pb, prev.avgExperimentalGmm, prev.gb);
                    }
                }
            }
            return { ...prev, gmmCalculationMethod: newMethod, gSe };
        });
    };

    const handleUpdateSample = (sampleId: string, field: 'a' | 'b' | 'c' | 'd', value: number) => {
        updateVolumetrics((prev) => {
            const newSamples = prev.gmmSamples.map(s => {
                if (s.id !== sampleId) return s;
                const updated = { ...s, [field]: value };
                updated.gmm = calculateExperimentalGmm(updated.a, updated.b, updated.c, updated.d);
                return updated;
            });

            const validGmms = newSamples.map(s => s.gmm).filter((val): val is number => val !== null);
            let avgExperimentalGmm = null;
            let gSe = prev.gSe;
            
            if (validGmms.length > 0) {
                avgExperimentalGmm = validGmms.reduce((sum, val) => sum + val, 0) / validGmms.length;
                
                if (prev.gmmCalculationMethod === 'practical') {
                    const activeBinder = prev.binders.find(b => b.id === prev.gmmBinderId);
                    if (activeBinder) {
                        gSe = calculateGse(activeBinder.pb, avgExperimentalGmm, prev.gb);
                    }
                }
            }

            return { ...prev, gmmSamples: newSamples, avgExperimentalGmm, gSe };
        });
    };

    const handleBinderSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newBinderId = e.target.value;
        updateVolumetrics((prev) => {
            let gSe = prev.gSe;
            if (prev.gmmCalculationMethod === 'practical' && prev.avgExperimentalGmm) {
                const activeBinder = prev.binders.find(b => b.id === newBinderId);
                if (activeBinder) {
                    gSe = calculateGse(activeBinder.pb, prev.avgExperimentalGmm, prev.gb);
                }
            }
            return { ...prev, gmmBinderId: newBinderId, gSe };
        });
    };

    const handleTheoreticalParamChange = (field: 'waterAbsorption' | 'bitumenAbsorptionFraction', value: number) => {
        updateVolumetrics(prev => {
            const nextState = { ...prev, [field]: value };
            return nextState;
        });
    };

    let theoreticalGse: number | null = null;
    if (method === 'theoretical') {
        const wa = volumetrics.waterAbsorption || 0;
        const frac = volumetrics.bitumenAbsorptionFraction ?? 60;
        const pba = wa * (frac / 100);
        const combinedGsb = calculateCombinedGsb(volumetrics.pileVolumetrics, proportions);
        
        if (combinedGsb && combinedGsb > 0) {
            if (pba === 0) {
                theoreticalGse = combinedGsb;
            } else {
                const denom = (1 / combinedGsb) - (pba / (100 * volumetrics.gb));
                if (denom > 0) {
                    theoreticalGse = 1 / denom;
                }
            }
        }
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <Beaker className="w-5 h-5 text-purple-500" />
                    <h2 className="text-lg font-semibold text-slate-800">Maximum Theoretical Density (Gmm) & Gse</h2>
                </div>
                
                <div className="flex items-center bg-slate-200/50 p-1 rounded-lg">
                    <button
                        onClick={() => handleMethodToggle('practical')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${method === 'practical' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        Practical
                    </button>
                    <button
                        onClick={() => handleMethodToggle('theoretical')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${method === 'theoretical' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        Theoretical
                    </button>
                </div>
            </div>
            
            <div className="p-6">
                {method === 'practical' ? (
                    <>
                        <div className="flex flex-col md:flex-row gap-6 mb-6">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Select Tested Binder Content
                                </label>
                                <select
                                    value={volumetrics.gmmBinderId || ''}
                                    onChange={handleBinderSelect}
                                    className="w-full max-w-xs px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                                >
                                    {volumetrics.binders.map(b => (
                                        <option key={b.id} value={b.id}>{b.pb.toFixed(1)}%</option>
                                    ))}
                                </select>
                                <p className="mt-2 text-xs text-slate-500 max-w-sm">
                                    Experimental Gmm is typically measured for one binder content to determine the Effective Specific Gravity (Gse).
                                </p>
                            </div>

                            <div className="flex gap-4">
                                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 flex flex-col justify-center min-w-[140px]">
                                    <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Avg Gmm</span>
                                    <span className="text-2xl font-bold text-purple-900">
                                        {volumetrics.avgExperimentalGmm ? volumetrics.avgExperimentalGmm.toFixed(3) : '-'}
                                    </span>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col justify-center min-w-[140px]">
                                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Calculated Gse</span>
                                    <span className="text-2xl font-bold text-slate-800">
                                        {volumetrics.gSe ? volumetrics.gSe.toFixed(3) : '-'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto border border-slate-200 rounded-lg">
                            <table className="min-w-full text-sm text-left text-slate-600">
                                <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">Sample</th>
                                        <th className="px-4 py-3 font-medium text-center">Wt. Pycnometer (A)</th>
                                        <th className="px-4 py-3 font-medium text-center">Wt. Pyc + Sample (B)</th>
                                        <th className="px-4 py-3 font-medium text-center">Wt. Pyc + Sample + Water (C)</th>
                                        <th className="px-4 py-3 font-medium text-center">Wt. Pyc + Water (D)</th>
                                        <th className="px-4 py-3 font-medium text-right text-purple-600">Sample Gmm</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {volumetrics.gmmSamples.map((sample, idx) => (
                                        <tr key={sample.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-3 font-medium text-slate-900">Sample {idx + 1}</td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="number"
                                                    value={sample.a || ''}
                                                    onChange={(e) => handleUpdateSample(sample.id, 'a', parseFloat(e.target.value) || 0)}
                                                    className="w-20 mx-auto block px-2 py-1 border border-slate-300 rounded text-center focus:ring-purple-500 focus:border-purple-500"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="number"
                                                    value={sample.b || ''}
                                                    onChange={(e) => handleUpdateSample(sample.id, 'b', parseFloat(e.target.value) || 0)}
                                                    className="w-20 mx-auto block px-2 py-1 border border-slate-300 rounded text-center focus:ring-purple-500 focus:border-purple-500"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="number"
                                                    value={sample.c || ''}
                                                    onChange={(e) => handleUpdateSample(sample.id, 'c', parseFloat(e.target.value) || 0)}
                                                    className="w-20 mx-auto block px-2 py-1 border border-slate-300 rounded text-center focus:ring-purple-500 focus:border-purple-500"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="number"
                                                    value={sample.d || ''}
                                                    onChange={(e) => handleUpdateSample(sample.id, 'd', parseFloat(e.target.value) || 0)}
                                                    className="w-20 mx-auto block px-2 py-1 border border-slate-300 rounded text-center focus:ring-purple-500 focus:border-purple-500"
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-slate-700">
                                                {sample.gmm ? sample.gmm.toFixed(3) : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col md:flex-row gap-8">
                        <div className="flex-1 space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Water Absorption of Aggregates (%)
                                </label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={volumetrics.waterAbsorption || ''}
                                    onChange={(e) => handleTheoreticalParamChange('waterAbsorption', parseFloat(e.target.value) || 0)}
                                    className="w-full max-w-xs px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Fraction of Bitumen Absorption (%)
                                </label>
                                <input
                                    type="number"
                                    step="1"
                                    value={volumetrics.bitumenAbsorptionFraction ?? 60}
                                    onChange={(e) => handleTheoreticalParamChange('bitumenAbsorptionFraction', parseFloat(e.target.value) || 0)}
                                    className="w-full max-w-xs px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                                />
                                <p className="mt-1 text-xs text-slate-500 max-w-xs">
                                    Default is 60%. Represents the percentage of water voids filled by bitumen.
                                </p>
                            </div>
                        </div>

                        <div className="flex-1">
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 space-y-4">
                                <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide border-b border-slate-200 pb-2">
                                    Theoretical Results
                                </h3>
                                
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-600">Combined Gsb:</span>
                                    <span className="text-base font-bold text-slate-800">
                                        {calculateCombinedGsb(volumetrics.pileVolumetrics, proportions)?.toFixed(3) || '-'}
                                    </span>
                                </div>
                                
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-600">Bitumen Absorption (Pba):</span>
                                    <span className="text-base font-bold text-slate-800">
                                        {((volumetrics.waterAbsorption || 0) * ((volumetrics.bitumenAbsorptionFraction ?? 60) / 100)).toFixed(2)}%
                                    </span>
                                </div>

                                <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                                    <span className="text-sm font-semibold text-purple-700">Calculated Gse:</span>
                                    <span className="text-xl font-bold text-purple-900">
                                        {theoreticalGse ? theoreticalGse.toFixed(3) : '-'}
                                    </span>
                                </div>

                                {theoreticalGse !== null && volumetrics.binders.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-slate-200">
                                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                                            Theoretical Gmm per Binder
                                        </h4>
                                        <div className="space-y-2">
                                            {volumetrics.binders.map(b => {
                                                const denom = ((100 - b.pb) / theoreticalGse!) + (b.pb / volumetrics.gb);
                                                const gmmVal = denom > 0 ? 100 / denom : null;
                                                return (
                                                    <div key={b.id} className="flex justify-between items-center text-sm">
                                                        <span className="text-slate-600">{b.pb.toFixed(1)}% Binder</span>
                                                        <span className="font-medium text-slate-800">
                                                            {gmmVal ? gmmVal.toFixed(3) : '-'}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
