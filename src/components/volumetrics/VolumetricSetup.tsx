'use client';

import React, { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Settings, Plus, Trash2 } from 'lucide-react';
import { BinderData, GmbSample } from '@/types';

export default function VolumetricSetup() {
    const { state, updateVolumetrics } = useAppContext();
    const { volumetrics } = state;
    
    // Local state for editing before applying
    const [localGb, setLocalGb] = useState(volumetrics.gb ?? 1.02);
    const [localLoadFactor, setLocalLoadFactor] = useState(volumetrics.loadFactor ?? 5.66);
    const [localTargetVa, setLocalTargetVa] = useState(volumetrics.targetVa ?? 4.0);
    const [localBinders, setLocalBinders] = useState<{ id: string, pb: number, numSamples: number }[]>(
        volumetrics.binders.map(b => ({
            id: b.id,
            pb: b.pb,
            numSamples: b.gmbSamples.length
        }))
    );

    const handleAddBinder = () => {
        const lastPb = localBinders.length > 0 ? localBinders[localBinders.length - 1].pb : 4.0;
        setLocalBinders([
            ...localBinders,
            { id: `binder-${Date.now()}`, pb: lastPb + 0.5, numSamples: 3 }
        ]);
    };

    const handleRemoveBinder = (id: string) => {
        if (localBinders.length <= 1) return;
        setLocalBinders(localBinders.filter(b => b.id !== id));
    };

    const handleUpdateBinder = (id: string, field: 'pb' | 'numSamples', value: number) => {
        setLocalBinders(localBinders.map(b => b.id === id ? { ...b, [field]: value } : b));
    };

    const applySetup = () => {
        // Map local setup to full BinderData
        const newBinders: BinderData[] = localBinders.map(lb => {
            const existingBinder = volumetrics.binders.find(b => b.id === lb.id);
            let samples: GmbSample[] = [];
            
            if (existingBinder) {
                // keep existing samples, add or remove as needed
                samples = [...existingBinder.gmbSamples];
                if (samples.length < lb.numSamples) {
                    const toAdd = lb.numSamples - samples.length;
                    for (let i = 0; i < lb.numSamples; i++) {
                        samples.push({ id: `s-${lb.id}-${Date.now()}-${i}`, w1: 0, w2: 0, w3: 0, diameter: 101.6, height: 63.5, provingRingReading: 0, flow: 0, gmb: null, stability: null });
                    }
                } else if (samples.length > lb.numSamples) {
                    samples = samples.slice(0, lb.numSamples);
                }
            } else {
                // create new samples
                for (let i = 0; i < lb.numSamples; i++) {
                    samples.push({ id: `s-${lb.id}-${Date.now()}-${i}`, w1: 0, w2: 0, w3: 0, diameter: 101.6, height: 63.5, provingRingReading: 0, flow: 0, gmb: null, stability: null });
                }
            }

            return {
                id: lb.id,
                pb: lb.pb,
                gmbSamples: samples,
                avgGmb: existingBinder ? existingBinder.avgGmb : null
            };
        });

        updateVolumetrics({
            gb: localGb,
            loadFactor: localLoadFactor,
            targetVa: localTargetVa,
            binders: newBinders,
            isSetupComplete: true,
            // If the active Gmm binder was removed, default to the first one
            gmmBinderId: newBinders.find(b => b.id === volumetrics.gmmBinderId) 
                ? volumetrics.gmmBinderId 
                : newBinders[0]?.id || null
        });
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center gap-2">
                <Settings className="w-5 h-5 text-slate-500" />
                <h2 className="text-lg font-semibold text-slate-800">Marshall Mix Design Setup</h2>
            </div>
            
            <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Bitumen Specific Gravity (Gb)
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            value={localGb}
                            onChange={(e) => setLocalGb(parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Load Factor (Default: 5.66)
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            value={localLoadFactor}
                            onChange={(e) => setLocalLoadFactor(parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Target Air Voids (%)
                        </label>
                        <input
                            type="number"
                            step="0.1"
                            value={localTargetVa}
                            onChange={(e) => setLocalTargetVa(parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-sm font-medium text-slate-700">Binder Contents & Specimens</h3>
                        <button 
                            onClick={handleAddBinder}
                            className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                            <Plus className="w-4 h-4" /> Add Binder Content
                        </button>
                    </div>
                    
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {localBinders.map((binder, index) => (
                            <div key={binder.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50 relative group">
                                {localBinders.length > 1 && (
                                    <button 
                                        onClick={() => handleRemoveBinder(binder.id)}
                                        className="absolute top-2 right-2 text-slate-400 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                                <div className="mb-3">
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Binder Content (Pb %)</label>
                                    <div className="flex items-center">
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={binder.pb}
                                            onChange={(e) => handleUpdateBinder(binder.id, 'pb', parseFloat(e.target.value) || 0)}
                                            className="w-full px-2 py-1.5 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        />
                                        <span className="ml-2 text-slate-500">%</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Number of Specimens</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="10"
                                        step="1"
                                        value={binder.numSamples}
                                        onChange={(e) => handleUpdateBinder(binder.id, 'numSamples', parseInt(e.target.value) || 1)}
                                        className="w-full px-2 py-1.5 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        onClick={applySetup}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-md font-medium text-sm hover:bg-indigo-700 transition-colors"
                    >
                        Apply Configuration
                    </button>
                </div>
            </div>
        </div>
    );
}
