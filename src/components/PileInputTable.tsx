'use client';

import React from 'react';
import { useAppContext } from '@/context/AppContext';
import { InputMode, Unit } from '@/types';
import { Plus, Trash2, Calculator, AlertCircle } from 'lucide-react';
import { computeAndValidatePile } from '@/utils/calculations';

export default function PileInputTable() {
    const { state, validationState, addPile, removePile, updatePile } = useAppContext();

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mt-6 overflow-x-auto">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-800">
                    <Calculator className="w-5 h-5 text-indigo-500" />
                    Pile Data Input
                </h2>
                <button
                    onClick={addPile}
                    className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 flex items-center gap-1 transition-colors text-sm shadow-sm"
                >
                    <Plus className="w-4 h-4" /> Add Pile
                </button>
            </div>

            <div className="min-w-max">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr>
                            <th className="p-3 border-b border-slate-200 bg-slate-50 w-32 font-medium text-slate-600">Sieve Size</th>
                            {state.piles.map(pile => {
                                const pileVal = validationState.pileValidations[pile.id];
                                const hasError = pileVal && !pileVal.isValid;

                                return (
                                    <th key={pile.id} className="p-3 border-b border-slate-200 bg-slate-50 min-w-[200px] align-top">
                                        <div className="flex flex-col gap-2">
                                            <div className="flex justify-between items-center">
                                                <input
                                                    type="text"
                                                    value={pile.name}
                                                    onChange={(e) => updatePile(pile.id, { name: e.target.value })}
                                                    className="font-semibold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none px-1 py-0.5 w-32"
                                                />
                                                {state.piles.length > 1 && (
                                                    <button onClick={() => removePile(pile.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-1">
                                                <input
                                                    type="number"
                                                    value={pile.totalWeight}
                                                    onChange={(e) => updatePile(pile.id, { totalWeight: parseFloat(e.target.value) || 0 })}
                                                    className={`w-20 px-2 py-1 text-sm text-slate-900 border rounded focus:ring-1 focus:outline-none ${hasError && pileVal.errors.some(e => e.includes('Total weight')) ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-indigo-500'}`}
                                                />
                                                <select
                                                    value={pile.unit}
                                                    onChange={(e) => updatePile(pile.id, { unit: e.target.value as Unit })}
                                                    className="text-sm text-slate-900 border border-slate-300 rounded px-1 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                >
                                                    <option value="g">g</option>
                                                    <option value="kg">kg</option>
                                                    <option value="tonnes">t</option>
                                                </select>
                                            </div>

                                            <select
                                                value={pile.inputMode}
                                                onChange={(e) => {
                                                    const newMode = e.target.value as InputMode;
                                                    updatePile(pile.id, { inputMode: newMode });
                                                }}
                                                className="text-sm text-slate-900 border border-slate-300 rounded px-2 py-1 bg-white w-full focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                            >
                                                <option value="percent_passing">% Passing</option>
                                                <option value="weight_retained">Weight Retained</option>
                                            </select>

                                            {hasError && (
                                                <div className="mt-1 flex flex-col gap-1">
                                                    {pileVal.errors.map((err, i) => (
                                                        <div key={i} className="flex items-start gap-1 text-[10px] text-red-600 bg-red-50 p-1 rounded border border-red-100 leading-tight">
                                                            <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                                                            <span>{err}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </th>
                                )
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {state.sieves.map((sieve, sIdx) => (
                            <tr key={sieve.size_mm} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                <td className="p-3 font-medium text-slate-700">{sieve.size_mm} mm</td>
                                {state.piles.map(pile => {
                                    const val = pile.data[sIdx];
                                    const { computed, validation } = computeAndValidatePile(pile);
                                    const passing = computed.percentPassing[sIdx];
                                    const hasError = validation.sieveErrors[sIdx];

                                    return (
                                        <td key={`${pile.id}-${sieve.size_mm}`} className="p-3 align-top">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        value={val === undefined || isNaN(val) ? '' : val}
                                                        onChange={(e) => {
                                                            const newData = [...pile.data];
                                                            newData[sIdx] = parseFloat(e.target.value);
                                                            updatePile(pile.id, { data: newData });
                                                        }}
                                                        className={`w-full text-slate-900 px-2 py-1 border rounded focus:ring-1 focus:outline-none ${hasError ? 'border-red-500 focus:ring-red-500 bg-red-50' : 'border-slate-300 focus:ring-indigo-500'}`}
                                                        placeholder="0"
                                                    />
                                                    <span className="text-xs text-slate-400 w-8 whitespace-nowrap">
                                                        {pile.inputMode === 'percent_passing' ? '%' : pile.unit}
                                                    </span>
                                                </div>
                                                {pile.inputMode === 'weight_retained' && (
                                                    <div className="text-[10px] text-slate-500 ml-1">
                                                        Passing: {passing.toFixed(1)}%
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}

                        {/* Pan Row */}
                        <tr className="bg-slate-50/80 border-t-2 border-slate-200">
                            <td className="p-3 font-semibold text-slate-700">Pan (&lt;75 µm)</td>
                            {state.piles.map(pile => {
                                const { computed } = computeAndValidatePile(pile);

                                return (
                                    <td key={`pan-${pile.id}`} className="p-3">
                                        <div className="flex flex-col gap-1 p-2 bg-white rounded border border-slate-200 shadow-sm">
                                            <div className="text-sm font-medium text-slate-800">
                                                {pile.inputMode === 'weight_retained'
                                                    ? `${computed.panWeightGrams.toFixed(1)} g`
                                                    : `${computed.panPercentPassing.toFixed(1)}%`}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {pile.inputMode === 'weight_retained'
                                                    ? `${computed.panPercentPassing.toFixed(1)}% passing`
                                                    : `${computed.panWeightGrams.toFixed(1)} g`}
                                            </div>
                                        </div>
                                    </td>
                                );
                            })}
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
