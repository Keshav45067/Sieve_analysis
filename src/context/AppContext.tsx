'use client';

import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { AppState, Sieve, PileData, Envelope, ValidationState, VolumetricState, PileVolumetricData } from '@/types';
import { STANDARD_SIEVES } from '@/utils/constants';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { computeAndValidatePile } from '@/utils/calculations';

interface AppContextType {
    state: AppState;
    validationState: ValidationState;
    updateSieves: (sieves: Sieve[]) => void;
    addPile: () => void;
    removePile: (id: string) => void;
    updatePile: (id: string, updates: Partial<PileData>) => void;
    updateProportions: (proportions: number[]) => void;
    togglePileLock: (idx: number) => void;
    setSelectedEnvelopeId: (id: string | null) => void;
    setUseCustomEnvelope: (use: boolean) => void;
    updateTotalAggregateMass: (mass: number, unit: Unit) => void;
    updateVolumetrics: (updates: Partial<VolumetricState> | ((prev: VolumetricState) => VolumetricState)) => void;
    resetState: () => void;
    isClient: boolean;
}

const defaultState: AppState = {
    sieves: STANDARD_SIEVES,
    piles: [
        {
            id: 'pile-1',
            name: 'Pile 1',
            totalWeight: 1000,
            unit: 'g',
            inputMode: 'percent_passing',
            data: new Array(STANDARD_SIEVES.length).fill(100),
            locked: false,
        },
    ],
    proportions: [1],
    selectedEnvelopeId: null,
    customEnvelope: null,
    useCustomEnvelope: false,
    totalAggregateMass: 1000,
    totalAggregateMassUnit: 'g',
    volumetrics: {
        isSetupComplete: false,
        gb: 1.02,
        loadFactor: 5.66,
        targetVa: 4.0,
        gmmCalculationMethod: 'practical',
        waterAbsorption: 0,
        bitumenAbsorptionFraction: 60,
        binders: [
            {
                id: 'binder-1',
                pb: 4.5,
                gmbSamples: [
                    { id: 's1-1', w1: 0, w2: 0, w3: 0, diameter: 101.6, height: 63.5, provingRingReading: 0, flow: 0, gmb: null, stability: null },
                    { id: 's1-2', w1: 0, w2: 0, w3: 0, diameter: 101.6, height: 63.5, provingRingReading: 0, flow: 0, gmb: null, stability: null },
                    { id: 's1-3', w1: 0, w2: 0, w3: 0, diameter: 101.6, height: 63.5, provingRingReading: 0, flow: 0, gmb: null, stability: null },
                ],
                avgGmb: null
            },
            {
                id: 'binder-2',
                pb: 5.0,
                gmbSamples: [
                    { id: 's2-1', w1: 0, w2: 0, w3: 0, diameter: 101.6, height: 63.5, provingRingReading: 0, flow: 0, gmb: null, stability: null },
                    { id: 's2-2', w1: 0, w2: 0, w3: 0, diameter: 101.6, height: 63.5, provingRingReading: 0, flow: 0, gmb: null, stability: null },
                    { id: 's2-3', w1: 0, w2: 0, w3: 0, diameter: 101.6, height: 63.5, provingRingReading: 0, flow: 0, gmb: null, stability: null },
                ],
                avgGmb: null
            },
            {
                id: 'binder-3',
                pb: 5.5,
                gmbSamples: [
                    { id: 's3-1', w1: 0, w2: 0, w3: 0, diameter: 101.6, height: 63.5, provingRingReading: 0, flow: 0, gmb: null, stability: null },
                    { id: 's3-2', w1: 0, w2: 0, w3: 0, diameter: 101.6, height: 63.5, provingRingReading: 0, flow: 0, gmb: null, stability: null },
                    { id: 's3-3', w1: 0, w2: 0, w3: 0, diameter: 101.6, height: 63.5, provingRingReading: 0, flow: 0, gmb: null, stability: null },
                ],
                avgGmb: null
            }
        ],
        pileVolumetrics: [
            { pileId: 'pile-1', gc: 2.65, gf: 2.62, pc: 50, pf: 50, gSb: null }
        ],
        gmmBinderId: 'binder-2',
        gmmSamples: [
            { id: 'gmm-1', a: 0, b: 0, c: 0, d: 0, gmm: null },
            { id: 'gmm-2', a: 0, b: 0, c: 0, d: 0, gmm: null }
        ],
        avgExperimentalGmm: null,
        gSe: null,
    }
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
    const [state, setState, isClient] = useLocalStorage<AppState>('sieve-app-state-v3', defaultState);

    // Compute validation state dynamically instead of storing it
    const validationState = useMemo<ValidationState>(() => {
        if (!state) return { isValid: true, pileValidations: {}, globalErrors: [] };

        let isValid = true;
        const pileValidations: ValidationState['pileValidations'] = {};
        const globalErrors: string[] = [];

        state.piles.forEach((pile) => {
            const result = computeAndValidatePile(pile);
            pileValidations[pile.id] = result.validation;
            if (!result.validation.isValid) {
                isValid = false;
                result.validation.errors.forEach(err => {
                    globalErrors.push(`${pile.name}: ${err}`);
                });
            }
        });

        return { isValid, pileValidations, globalErrors };
    }, [state]);

    const updateSieves = (sieves: Sieve[]) => {
        setState((prev: AppState) => {
            const newPiles = prev.piles.map(pile => {
                let newData = [...pile.data];
                if (newData.length < sieves.length) {
                    newData = [...newData, ...new Array(sieves.length - newData.length).fill(pile.inputMode === 'percent_passing' ? 0 : 0)];
                } else if (newData.length > sieves.length) {
                    newData = newData.slice(0, sieves.length);
                }
                return { ...pile, data: newData };
            });
            return { ...prev, sieves, piles: newPiles };
        });
    };

    const addPile = () => {
        setState((prev: AppState) => {
            const newPileId = `pile-${Date.now()}`;
            const newPile: PileData = {
                id: newPileId,
                name: `Pile ${prev.piles.length + 1}`,
                totalWeight: 1000,
                unit: 'g',
                inputMode: 'percent_passing',
                data: new Array(prev.sieves.length).fill(100),
                locked: false,
            };
            const newProportions = [...prev.proportions, 0];
            
            const newPileVolumetric: PileVolumetricData = {
                pileId: newPileId,
                gc: 2.65,
                gf: 2.62,
                pc: 50,
                pf: 50,
                gSb: null
            };

            // Auto-normalize proportions with locks
            const lockedIdx = prev.piles.reduce((acc, p, idx) => p.locked ? [...acc, idx] : acc, [] as number[]);
            const lockedSum = lockedIdx.reduce((sum, idx) => sum + newProportions[idx], 0);
            const remaining = 1 - lockedSum;

            const unlockedCount = newProportions.length - lockedIdx.length;
            const normalizedProportions = newProportions.map((p, idx) => {
                if (lockedIdx.includes(idx)) return p;
                return unlockedCount > 0 ? remaining / unlockedCount : 0;
            });

            return {
                ...prev,
                piles: [...prev.piles, newPile],
                proportions: normalizedProportions,
                volumetrics: {
                    ...prev.volumetrics,
                    pileVolumetrics: [...prev.volumetrics.pileVolumetrics, newPileVolumetric]
                }
            };
        });
    };

    const removePile = (id: string) => {
        setState((prev: AppState) => {
            if (prev.piles.length <= 1) return prev;

            const indexToRemove = prev.piles.findIndex(p => p.id === id);
            if (indexToRemove === -1) return prev;

            const newPiles = prev.piles.filter(p => p.id !== id);
            const newProportions = prev.proportions.filter((_, idx) => idx !== indexToRemove);
            
            const newPileVolumetrics = prev.volumetrics.pileVolumetrics.filter(pv => pv.pileId !== id);

            // Re-normalize unlocked
            const lockedIdx = newPiles.reduce((acc, p, idx) => p.locked ? [...acc, idx] : acc, [] as number[]);
            const lockedSum = lockedIdx.reduce((sum, idx) => sum + newProportions[idx], 0);
            const remaining = Math.max(0, 1 - lockedSum);

            const unlockedCount = newProportions.length - lockedIdx.length;

            const normalizedProportions = newProportions.map((p, idx) => {
                if (lockedIdx.includes(idx)) return p;
                if (unlockedCount === 0) return 0;

                // Try to keep relative ratios of unlocked if possible, otherwise distribute evenly
                const unlockedSum = newProportions.reduce((sum, val, i) => lockedIdx.includes(i) ? sum : sum + val, 0);
                return unlockedSum > 0 ? (p / unlockedSum) * remaining : remaining / unlockedCount;
            });

            return {
                ...prev,
                piles: newPiles,
                proportions: normalizedProportions,
                volumetrics: {
                    ...prev.volumetrics,
                    pileVolumetrics: newPileVolumetrics
                }
            };
        });
    };

    const updatePile = (id: string, updates: Partial<PileData>) => {
        setState((prev: AppState) => ({
            ...prev,
            piles: prev.piles.map(pile => (pile.id === id ? { ...pile, ...updates } : pile)),
        }));
    };

    const updateProportions = (proportions: number[]) => {
        setState((prev: AppState) => ({ ...prev, proportions }));
    };

    const togglePileLock = (idx: number) => {
        setState((prev: AppState) => {
            const newPiles = [...prev.piles];
            newPiles[idx] = { ...newPiles[idx], locked: !newPiles[idx].locked };
            return { ...prev, piles: newPiles };
        });
    };

    const setSelectedEnvelopeId = (id: string | null) => {
        setState((prev: AppState) => ({ ...prev, selectedEnvelopeId: id }));
    };

    const setCustomEnvelope = (envelope: Envelope | null) => {
        setState((prev: AppState) => ({ ...prev, customEnvelope: envelope }));
    };

    const setUseCustomEnvelope = (use: boolean) => {
        setState((prev: AppState) => ({ ...prev, useCustomEnvelope: use }));
    };
    
    const updateTotalAggregateMass = (mass: number, unit: Unit) => {
        setState((prev: AppState) => ({ ...prev, totalAggregateMass: mass, totalAggregateMassUnit: unit }));
    };

    const updateVolumetrics = (updates: Partial<VolumetricState> | ((prev: VolumetricState) => VolumetricState)) => {
        setState((prev: AppState) => {
            const newVolumetrics = typeof updates === 'function' 
                ? updates(prev.volumetrics) 
                : { ...prev.volumetrics, ...updates };
            return { ...prev, volumetrics: newVolumetrics };
        });
    };

    const resetState = () => {
        setState(defaultState);
    };

    const value = useMemo(
        () => ({
            state,
            validationState,
            updateSieves,
            addPile,
            removePile,
            updatePile,
            updateProportions,
            togglePileLock,
            setSelectedEnvelopeId,
            setCustomEnvelope,
            setUseCustomEnvelope,
            updateTotalAggregateMass,
            updateVolumetrics,
            resetState,
            isClient
        }),
        [state, validationState, isClient]
    );

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};
