'use client';

import React from 'react';
import { useAppContext } from '@/context/AppContext';
import { MORTH_ENVELOPES } from '@/utils/constants';
import { Layers, Settings2 } from 'lucide-react';
import { Envelope } from '@/types';

export default function EnvelopeOverlay() {
    const { state, setSelectedEnvelopeId, setUseCustomEnvelope, setCustomEnvelope } = useAppContext();

    const handleCustomLimitChange = (size_mm: number, field: 'lower' | 'upper', value: string) => {
        const numVal = parseFloat(value);
        if (isNaN(numVal)) return;

        let currentEnv = state.customEnvelope;
        if (!currentEnv) {
            // Initialize custom envelope with default 0s based on current sieves
            currentEnv = {
                id: 'custom',
                name: 'Custom Envelope',
                limits: state.sieves.map(s => ({ size_mm: s.size_mm, lower: 0, upper: 100 }))
            };
        }

        const newLimits = [...currentEnv.limits];
        const limitIdx = newLimits.findIndex(l => l.size_mm === size_mm);

        if (limitIdx >= 0) {
            newLimits[limitIdx] = { ...newLimits[limitIdx], [field]: numVal };
        } else {
            // If sieve doesn't exist in custom env yet (e.g. they added a new sieve)
            newLimits.push({ size_mm, lower: field === 'lower' ? numVal : 0, upper: field === 'upper' ? numVal : 100 });
            newLimits.sort((a, b) => b.size_mm - a.size_mm);
        }

        setCustomEnvelope({ ...currentEnv, limits: newLimits });
    };

    // Ensure custom envelope has all current sieves
    const customLimits = state.sieves.map(sieve => {
        const existing = state.customEnvelope?.limits.find(l => l.size_mm === sieve.size_mm);
        return existing || { size_mm: sieve.size_mm, lower: 0, upper: 100 };
    });

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mt-6">
            <div className="flex items-center mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-800">
                    <Layers className="w-5 h-5 text-indigo-500" />
                    Specification Envelope
                </h2>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-lg mb-4">
                <button
                    type="button"
                    onClick={() => setUseCustomEnvelope(false)}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${!state.useCustomEnvelope ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Standard (MoRTH)
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setUseCustomEnvelope(true);
                        setSelectedEnvelopeId(null);
                    }}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${state.useCustomEnvelope ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Custom
                </button>
            </div>

            {!state.useCustomEnvelope ? (
                <div className="space-y-4">
                    <label className="block text-sm font-medium text-slate-700">Select MoRTH Grading</label>
                    <select
                        value={state.selectedEnvelopeId || ''}
                        onChange={(e) => setSelectedEnvelopeId(e.target.value === '' ? null : e.target.value)}
                        className="w-full text-slate-900 border border-slate-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="">None</option>
                        {MORTH_ENVELOPES.map(env => (
                            <option key={env.id} value={env.id}>{env.name}</option>
                        ))}
                    </select>

                    {state.selectedEnvelopeId && (
                        <div className="mt-4 p-3 bg-slate-50 rounded-md border border-slate-200 text-sm">
                            <h4 className="font-medium text-slate-700 mb-2">Limits Preview:</h4>
                            <div className="max-h-40 overflow-y-auto">
                                <table className="w-full text-left text-slate-900">
                                    <thead>
                                        <tr className="text-slate-500 text-xs">
                                            <th className="pb-1">Sieve (mm)</th>
                                            <th className="pb-1">Lower (%)</th>
                                            <th className="pb-1">Upper (%)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-slate-900">
                                        {MORTH_ENVELOPES.find(e => e.id === state.selectedEnvelopeId)?.limits.map(l => (
                                            <tr key={l.size_mm} className="border-t border-slate-100">
                                                <td className="py-1">{l.size_mm}</td>
                                                <td className="py-1">{l.lower}</td>
                                                <td className="py-1">{l.upper}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    <label className="block text-sm font-medium text-slate-700">Define Custom Envelope Limits</label>
                    <div className="max-h-[300px] overflow-y-auto pr-2">
                        <table className="w-full text-left text-slate-900 text-sm">
                            <thead>
                                <tr className="text-slate-500 text-xs sticky top-0 bg-white">
                                    <th className="pb-2">Sieve (mm)</th>
                                    <th className="pb-2">Lower (%)</th>
                                    <th className="pb-2">Upper (%)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {customLimits.map((limit, idx) => (
                                    <tr key={limit.size_mm} className="border-t border-slate-100">
                                        <td className="py-2 font-medium text-slate-700">{limit.size_mm}</td>
                                        <td className="py-2 pr-2">
                                            <input
                                                type="number"
                                                min="0" max="100"
                                                value={limit.lower}
                                                onChange={(e) => handleCustomLimitChange(limit.size_mm, 'lower', e.target.value)}
                                                className={`w-full px-2 py-1 text-slate-900 border rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 ${limit.lower > limit.upper ? 'border-red-500 bg-red-50' : 'border-slate-300'}`}
                                            />
                                        </td>
                                        <td className="py-2">
                                            <input
                                                type="number"
                                                min="0" max="100"
                                                value={limit.upper}
                                                onChange={(e) => handleCustomLimitChange(limit.size_mm, 'upper', e.target.value)}
                                                className={`w-full px-2 py-1 text-slate-900 border rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 ${limit.lower > limit.upper ? 'border-red-500 bg-red-50' : 'border-slate-300'}`}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
