'use client';

import React, { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { STANDARD_SIEVES } from '@/utils/constants';
import { Sieve } from '@/types';
import { Settings2, Plus, Trash2, RotateCcw } from 'lucide-react';

export default function SieveSelector() {
    const { state, updateSieves } = useAppContext();
    const [isCustom, setIsCustom] = useState(false);
    const [customSieves, setCustomSieves] = useState<Sieve[]>(state.sieves);
    const [newSieveSize, setNewSieveSize] = useState<string>('');

    const handleToggle = () => {
        if (isCustom) {
            // Revert to standard
            setIsCustom(false);
            updateSieves(STANDARD_SIEVES);
        } else {
            setIsCustom(true);
            setCustomSieves(STANDARD_SIEVES.map(s => ({ ...s })));
        }
    };

    const handleAddSieve = () => {
        const size = parseFloat(newSieveSize);
        if (!isNaN(size) && size > 0 && !customSieves.find(s => s.size_mm === size)) {
            const updatedSieves = [...customSieves, { size_mm: size }].sort((a, b) => b.size_mm - a.size_mm);
            setCustomSieves(updatedSieves);
            updateSieves(updatedSieves);
            setNewSieveSize('');
        }
    };

    const handleRemoveSieve = (size: number) => {
        const updatedSieves = customSieves.filter(s => s.size_mm !== size);
        setCustomSieves(updatedSieves);
        updateSieves(updatedSieves);
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-800">
                    <Settings2 className="w-5 h-5 text-indigo-500" />
                    Sieve Configuration
                </h2>
                <div className="flex items-center gap-2 text-sm">
                    <span className={!isCustom ? 'font-medium text-indigo-600' : 'text-slate-500'}>Standard (IS 2720)</span>
                    <button
                        onClick={handleToggle}
                        className={`w-12 h-6 rounded-full p-1 transition-colors ${isCustom ? 'bg-indigo-500' : 'bg-slate-300'}`}
                    >
                        <div className={`w-4 h-4 rounded-full bg-white transition-transform ${isCustom ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                    <span className={isCustom ? 'font-medium text-indigo-600' : 'text-slate-500'}>Custom</span>
                </div>
            </div>

            {isCustom && (
                <div className="mb-4 flex gap-2">
                    <input
                        type="number"
                        step="0.001"
                        value={newSieveSize}
                        onChange={(e) => setNewSieveSize(e.target.value)}
                        placeholder="Sieve size (mm)"
                        className="flex-1 px-3 py-2 text-slate-900 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddSieve()}
                    />
                    <button
                        onClick={handleAddSieve}
                        className="px-4 py-2 bg-indigo-50 text-indigo-600 font-medium rounded-md hover:bg-indigo-100 flex items-center gap-1 transition-colors"
                    >
                        <Plus className="w-4 h-4" /> Add
                    </button>
                </div>
            )}

            <div className="flex flex-wrap gap-2 mt-4">
                {state.sieves.map((sieve, idx) => (
                    <div
                        key={`${sieve.size_mm}-${idx}`}
                        className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200 text-sm font-medium text-slate-700"
                    >
                        {sieve.size_mm} mm
                        {isCustom && (
                            <button
                                onClick={() => handleRemoveSieve(sieve.size_mm)}
                                className="text-slate-400 hover:text-red-500 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
