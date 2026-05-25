'use client';

import React, { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { calculateGmb, calculateVolumeCc, calculateStability, getVolumeCorrectionFactor } from '@/utils/volumetrics';
import { Scale, ChevronDown, ChevronRight, Info, Table2 } from 'lucide-react';

export default function GmbCalculations() {
    const { state, updateVolumetrics } = useAppContext();
    const { volumetrics } = state;
    const loadFactor = volumetrics.loadFactor ?? 5.66;
    
    // State to toggle binder sections
    const [expandedBinders, setExpandedBinders] = useState<Record<string, boolean>>(
        volumetrics.binders.reduce((acc, b) => ({ ...acc, [b.id]: true }), {})
    );
    
    const [showCorrectionTable, setShowCorrectionTable] = useState(false);

    const toggleBinder = (id: string) => {
        setExpandedBinders(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleUpdateSample = (binderId: string, sampleId: string, field: 'w1' | 'w2' | 'w3' | 'provingRingReading' | 'flow' | 'diameter' | 'height', value: number) => {
        updateVolumetrics((prev) => {
            const newBinders = prev.binders.map(b => {
                if (b.id !== binderId) return b;
                
                const newSamples = b.gmbSamples.map(s => {
                    if (s.id !== sampleId) return s;
                    const updated = { ...s, [field]: value };
                    
                    updated.gmb = calculateGmb(updated.w1, updated.w2, updated.w3);
                    
                    // Fallback to defaults if undefined from older localStorage state
                    const d = updated.diameter ?? 101.6;
                    const h = updated.height ?? 63.5;
                    
                    const volCc = calculateVolumeCc(updated.w2, updated.w3, d, h);
                    updated.stability = calculateStability(updated.provingRingReading, loadFactor, volCc);
                    
                    return updated;
                });
                
                // Recalculate average Gmb
                const validGmbs = newSamples.map(s => s.gmb).filter((val): val is number => val !== null);
                const avgGmb = validGmbs.length > 0 ? validGmbs.reduce((sum, val) => sum + val, 0) / validGmbs.length : null;
                
                return { ...b, gmbSamples: newSamples, avgGmb };
            });
            return { ...prev, binders: newBinders };
        });
    };

    if (!volumetrics.isSetupComplete) return null;

    const CORRECTION_TABLE = [
        { min: 457, max: 470, factor: 1.19 },
        { min: 471, max: 482, factor: 1.14 },
        { min: 483, max: 495, factor: 1.09 },
        { min: 496, max: 508, factor: 1.04 },
        { min: 509, max: 522, factor: 1.00 },
        { min: 523, max: 535, factor: 0.96 },
        { min: 536, max: 546, factor: 0.93 },
        { min: 547, max: 559, factor: 0.89 },
        { min: 560, max: 573, factor: 0.86 },
    ];

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <Scale className="w-5 h-5 text-indigo-500" />
                    <h2 className="text-lg font-semibold text-slate-800">Density (Gmb) & Stability-Flow</h2>
                </div>
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setShowCorrectionTable(!showCorrectionTable)}
                        className="flex items-center gap-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 px-3 py-1.5 rounded-md hover:bg-slate-50 transition-colors"
                    >
                        <Table2 className="w-4 h-4" />
                        {showCorrectionTable ? 'Hide Reference Table' : 'Show Correction Table'}
                    </button>
                    <div className="flex items-center gap-1 text-sm font-medium text-slate-700 bg-slate-200/50 px-3 py-1.5 rounded-md">
                        <Info className="w-4 h-4 text-indigo-600" />
                        <span>Load Factor: {loadFactor} kg/div</span>
                    </div>
                </div>
            </div>

            {showCorrectionTable && (
                <div className="bg-slate-50 p-6 border-b border-slate-200">
                    <h3 className="text-sm font-semibold text-slate-800 mb-3">Volume Correction Factor Reference</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                        {CORRECTION_TABLE.map((row, i) => (
                            <div key={i} className="bg-white border border-slate-200 rounded p-2 text-center shadow-sm">
                                <div className="text-xs text-slate-500 mb-1">{row.min} - {row.max} cc</div>
                                <div className="text-sm font-bold text-indigo-700">{row.factor.toFixed(2)}</div>
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-slate-500 mt-3 italic">
                        * Volumes below 457 use 1.19, and volumes above 573 use 0.86.
                    </p>
                </div>
            )}
            
            <div className="p-6 space-y-6">
                {volumetrics.binders.map(binder => {
                    // Compute averages locally for the header display
                    const validStabs = binder.gmbSamples.map(s => s.stability).filter((val): val is number => val !== null);
                    const avgStab = validStabs.length > 0 ? validStabs.reduce((sum, val) => sum + val, 0) / validStabs.length : null;

                    const validFlows = binder.gmbSamples.map(s => s.flow).filter(val => val > 0);
                    const avgFlow = validFlows.length > 0 ? validFlows.reduce((sum, val) => sum + val, 0) / validFlows.length : null;

                    return (
                        <div key={binder.id} className="border border-slate-200 rounded-lg overflow-hidden">
                            {/* Header */}
                            <div 
                                className="bg-slate-50 px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
                                onClick={() => toggleBinder(binder.id)}
                            >
                                <div className="flex items-center gap-2">
                                    {expandedBinders[binder.id] ? (
                                        <ChevronDown className="w-5 h-5 text-slate-400" />
                                    ) : (
                                        <ChevronRight className="w-5 h-5 text-slate-400" />
                                    )}
                                    <span className="font-semibold text-slate-800">Binder {binder.pb.toFixed(1)}%</span>
                                </div>
                                <div className="flex gap-2">
                                    {binder.avgGmb !== null && (
                                        <div className="bg-indigo-50 border border-indigo-200 px-3 py-1 rounded text-xs font-semibold text-indigo-800">
                                            Gmb: {binder.avgGmb.toFixed(3)}
                                        </div>
                                    )}
                                    {avgStab !== null && (
                                        <div className="bg-amber-50 border border-amber-200 px-3 py-1 rounded text-xs font-semibold text-amber-800">
                                            Stab: {avgStab.toFixed(1)} kN
                                        </div>
                                    )}
                                    {avgFlow !== null && (
                                        <div className="bg-blue-50 border border-blue-200 px-3 py-1 rounded text-xs font-semibold text-blue-800">
                                            Flow: {avgFlow.toFixed(1)} mm
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* Samples Table */}
                            {expandedBinders[binder.id] && (
                                <div className="p-4 overflow-x-auto bg-white border-t border-slate-200">
                                    <table className="min-w-full text-sm text-left text-slate-600">
                                        <thead className="text-[10px] text-slate-500 uppercase bg-slate-50">
                                            <tr>
                                                <th className="px-2 py-2 font-medium">Specimen</th>
                                                <th className="px-2 py-2 font-medium text-center border-r border-slate-100">Dia. (mm)</th>
                                                <th className="px-2 py-2 font-medium text-center border-r border-slate-200">Ht. (mm)</th>
                                                <th className="px-2 py-2 font-medium text-center">Air Wt. (g)</th>
                                                <th className="px-2 py-2 font-medium text-center">Water Wt. (g)</th>
                                                <th className="px-2 py-2 font-medium text-center">SSD Wt. (g)</th>
                                                <th className="px-2 py-2 font-medium text-center">Sample Gmb</th>
                                                <th className="px-2 py-2 font-medium text-center border-l border-slate-200 bg-amber-50/50">Prov. Ring</th>
                                                <th className="px-2 py-2 font-medium text-center bg-amber-50/50">Flow (mm)</th>
                                                <th className="px-2 py-2 font-medium text-center border-l border-slate-100">Vol (cc)</th>
                                                <th className="px-2 py-2 font-medium text-center">Corr. F.</th>
                                                <th className="px-2 py-2 font-medium text-right text-amber-600">Stability (kN)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {binder.gmbSamples.map((sample, idx) => {
                                                const d = sample.diameter ?? 101.6;
                                                const h = sample.height ?? 63.5;
                                                const volCc = calculateVolumeCc(sample.w2, sample.w3, d, h);
                                                const corrFactor = volCc ? getVolumeCorrectionFactor(volCc) : null;

                                                return (
                                                    <tr key={sample.id} className="hover:bg-slate-50">
                                                        <td className="px-2 py-2 font-medium text-slate-900">S {idx + 1}</td>
                                                        <td className="px-2 py-2 border-r border-slate-100">
                                                            <input
                                                                type="number"
                                                                step="0.1"
                                                                value={sample.diameter ?? 101.6}
                                                                onChange={(e) => handleUpdateSample(binder.id, sample.id, 'diameter', parseFloat(e.target.value) || 0)}
                                                                className="w-14 mx-auto block px-1 py-1 border border-slate-300 rounded text-center focus:ring-indigo-500 focus:border-indigo-500 text-xs"
                                                            />
                                                        </td>
                                                        <td className="px-2 py-2 border-r border-slate-200">
                                                            <input
                                                                type="number"
                                                                step="0.1"
                                                                value={sample.height ?? 63.5}
                                                                onChange={(e) => handleUpdateSample(binder.id, sample.id, 'height', parseFloat(e.target.value) || 0)}
                                                                className="w-14 mx-auto block px-1 py-1 border border-slate-300 rounded text-center focus:ring-indigo-500 focus:border-indigo-500 text-xs"
                                                            />
                                                        </td>
                                                        <td className="px-2 py-2">
                                                            <input
                                                                type="number"
                                                                value={sample.w1 || ''}
                                                                onChange={(e) => handleUpdateSample(binder.id, sample.id, 'w1', parseFloat(e.target.value) || 0)}
                                                                className="w-16 mx-auto block px-1 py-1 border border-slate-300 rounded text-center focus:ring-indigo-500 focus:border-indigo-500 text-xs"
                                                            />
                                                        </td>
                                                        <td className="px-2 py-2">
                                                            <input
                                                                type="number"
                                                                value={sample.w2 || ''}
                                                                onChange={(e) => handleUpdateSample(binder.id, sample.id, 'w2', parseFloat(e.target.value) || 0)}
                                                                className="w-16 mx-auto block px-1 py-1 border border-slate-300 rounded text-center focus:ring-indigo-500 focus:border-indigo-500 text-xs"
                                                            />
                                                        </td>
                                                        <td className="px-2 py-2">
                                                            <input
                                                                type="number"
                                                                value={sample.w3 || ''}
                                                                onChange={(e) => handleUpdateSample(binder.id, sample.id, 'w3', parseFloat(e.target.value) || 0)}
                                                                className="w-16 mx-auto block px-1 py-1 border border-slate-300 rounded text-center focus:ring-indigo-500 focus:border-indigo-500 text-xs"
                                                            />
                                                        </td>
                                                        <td className="px-2 py-2 text-center font-bold text-indigo-600 bg-indigo-50/30">
                                                            {sample.gmb ? sample.gmb.toFixed(3) : '-'}
                                                        </td>
                                                        <td className="px-2 py-2 border-l border-slate-200 bg-amber-50/20">
                                                            <input
                                                                type="number"
                                                                value={sample.provingRingReading || ''}
                                                                onChange={(e) => handleUpdateSample(binder.id, sample.id, 'provingRingReading', parseFloat(e.target.value) || 0)}
                                                                className="w-16 mx-auto block px-1 py-1 border border-slate-300 rounded text-center focus:ring-amber-500 focus:border-amber-500 text-xs"
                                                            />
                                                        </td>
                                                        <td className="px-2 py-2 bg-amber-50/20">
                                                            <input
                                                                type="number"
                                                                step="0.1"
                                                                value={sample.flow || ''}
                                                                onChange={(e) => handleUpdateSample(binder.id, sample.id, 'flow', parseFloat(e.target.value) || 0)}
                                                                className="w-16 mx-auto block px-1 py-1 border border-slate-300 rounded text-center focus:ring-blue-500 focus:border-blue-500 text-xs"
                                                            />
                                                        </td>
                                                        <td className="px-2 py-2 text-center font-medium text-slate-500 border-l border-slate-100">
                                                            {volCc ? volCc.toFixed(1) : '-'}
                                                        </td>
                                                        <td className="px-2 py-2 text-center font-medium text-slate-500">
                                                            {corrFactor ? corrFactor.toFixed(2) : '-'}
                                                        </td>
                                                        <td className="px-2 py-2 text-right font-bold text-amber-700 bg-amber-50/50">
                                                            {sample.stability ? sample.stability.toFixed(2) : '-'}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
