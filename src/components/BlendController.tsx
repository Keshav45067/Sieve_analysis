'use client';

import React from 'react';
import { useAppContext } from '@/context/AppContext';
import { SlidersHorizontal, Lock, Unlock } from 'lucide-react';

export default function BlendController() {
    const { state, updateProportions, togglePileLock } = useAppContext();

    const handleSliderChange = (idx: number, value: number) => {
        let newProps = [...state.proportions];
        const newTarget = value / 100;

        // Cannot move locked sliders
        if (state.piles[idx].locked) return;

        newProps[idx] = newTarget;

        const lockedIdx = state.piles.reduce((acc, p, i) => p.locked && i !== idx ? [...acc, i] : acc, [] as number[]);
        const lockedSum = lockedIdx.reduce((sum, i) => sum + newProps[i], 0);

        if (lockedSum + newTarget > 1) {
            // Prevent slider from exceeding available unlocked proportion
            newProps[idx] = 1 - lockedSum;
        }

        const remainingToDistribute = Math.max(0, 1 - lockedSum - newProps[idx]);
        const unlockedIdxToAdjust = state.piles.reduce((acc, p, i) => !p.locked && i !== idx ? [...acc, i] : acc, [] as number[]);

        if (unlockedIdxToAdjust.length > 0) {
            const currentUnlockedSum = unlockedIdxToAdjust.reduce((sum, i) => sum + newProps[i], 0);

            unlockedIdxToAdjust.forEach(i => {
                if (currentUnlockedSum === 0) {
                    newProps[i] = remainingToDistribute / unlockedIdxToAdjust.length;
                } else {
                    newProps[i] = (newProps[i] / currentUnlockedSum) * remainingToDistribute;
                }
            });
        }

        // Fix floating point issues
        newProps = newProps.map(p => Math.max(0, Math.min(1, p)));

        updateProportions(newProps);
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mt-6">
            <div className="flex items-center mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-800">
                    <SlidersHorizontal className="w-5 h-5 text-indigo-500" />
                    Blend Proportions
                </h2>
            </div>

            <div className="space-y-6">
                {state.piles.map((pile, idx) => {
                    const propPercent = (state.proportions[idx] * 100) || 0;
                    return (
                        <div key={pile.id} className="flex flex-col gap-2">
                            <div className="flex justify-between items-center text-sm font-medium">
                                <div className="flex items-center gap-2 text-slate-700">
                                    <span>{pile.name}</span>
                                    {state.piles.length > 1 && (
                                        <button
                                            onClick={() => togglePileLock(idx)}
                                            className={`p-1 rounded-md transition-colors ${pile.locked ? 'text-amber-600 bg-amber-50 hover:bg-amber-100' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                                            title={pile.locked ? "Unlock proportion" : "Lock proportion"}
                                        >
                                            {pile.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                                        </button>
                                    )}
                                </div>
                                <span className={`px-2 py-0.5 rounded-md ${pile.locked ? 'text-amber-700 bg-amber-50' : 'text-indigo-600 bg-indigo-50'}`}>
                                    {propPercent.toFixed(1)}%
                                </span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                step="0.1"
                                value={propPercent}
                                onChange={(e) => handleSliderChange(idx, parseFloat(e.target.value))}
                                className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${pile.locked ? 'bg-amber-200 accent-amber-600 cursor-not-allowed' : 'bg-slate-200 accent-indigo-600'}`}
                                disabled={state.piles.length === 1 || pile.locked}
                            />
                        </div>
                    );
                })}
            </div>

            {/* Total verification */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center text-sm">
                <span className="font-medium text-slate-600">Total Blend</span>
                <span className="font-bold text-slate-800">
                    {(state.proportions.reduce((s, p) => s + p, 0) * 100).toFixed(1)}%
                </span>
            </div>
        </div>
    );
}
