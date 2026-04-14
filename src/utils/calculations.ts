import { ComputedPileData, InputMode, PileValidation, PileData, Unit } from '@/types';
import { toGrams } from './unitConversion';

/**
 * Validates a pile's data and computes its analysis including Pan fraction.
 */
export const computeAndValidatePile = (
    pile: PileData
): { computed: ComputedPileData; validation: PileValidation } => {
    const { data: inputData, inputMode, totalWeight, unit } = pile;
    const totalGrams = toGrams(totalWeight, unit);
    const n = inputData.length;

    let percentRetained: number[] = new Array(n).fill(0);
    let cumulativeRetained: number[] = new Array(n).fill(0);
    let percentPassing: number[] = new Array(n).fill(0);

    let panWeightGrams = 0;
    let panPercentPassing = 0;

    const validation: PileValidation = {
        isValid: true,
        errors: [],
        sieveErrors: new Array(n).fill(false)
    };

    if (totalGrams <= 0) {
        validation.isValid = false;
        validation.errors.push("Total weight must be greater than 0");
        return {
            computed: { percentRetained, cumulativeRetained, percentPassing, panWeightGrams, panPercentPassing },
            validation
        };
    }

    if (inputMode === 'weight_retained') {
        let sumRetainedGrams = 0;

        // First pass to check total sum
        for (let i = 0; i < n; i++) {
            const retainedGrams = toGrams(inputData[i] || 0, unit);
            if (retainedGrams < 0) {
                validation.isValid = false;
                validation.errors.push("Weight retained cannot be negative");
                validation.sieveErrors[i] = true;
            }
            sumRetainedGrams += Math.max(0, retainedGrams);
        }

        if (sumRetainedGrams > totalGrams + 0.0001) { // Floating point tolerance
            validation.isValid = false;
            validation.errors.push(`Total retained weight (${(sumRetainedGrams).toFixed(2)}g) exceeds total sample weight (${totalGrams}g)`);
            // Highlight all inputs that contribute to the error, or just general error. We'll mark the last entered maybe, or all.
            validation.sieveErrors = validation.sieveErrors.map(() => true);
        }

        // Calculations
        let runningSum = 0;
        for (let i = 0; i < n; i++) {
            const retainedWeightGrams = toGrams(inputData[i] || 0, unit);
            const pRetained = (retainedWeightGrams / totalGrams) * 100;
            percentRetained[i] = pRetained;

            runningSum += pRetained;
            cumulativeRetained[i] = runningSum;

            let pPassing = 100 - runningSum;
            percentPassing[i] = Math.max(0, pPassing);
        }

        panWeightGrams = Math.max(0, totalGrams - sumRetainedGrams);
        panPercentPassing = (panWeightGrams / totalGrams) * 100;

    } else if (inputMode === 'percent_passing') {
        for (let i = 0; i < n; i++) {
            let currentPassing = inputData[i] !== undefined ? inputData[i] : 100;

            if (currentPassing < 0 || currentPassing > 100) {
                validation.isValid = false;
                if (!validation.errors.includes("% passing must be between 0 and 100")) {
                    validation.errors.push("% passing must be between 0 and 100");
                }
                validation.sieveErrors[i] = true;
            }

            if (i > 0 && currentPassing > percentPassing[i - 1]) {
                validation.isValid = false;
                if (!validation.errors.includes("% passing must decrease with sieve size")) {
                    validation.errors.push("% passing must decrease with sieve size");
                }
                validation.sieveErrors[i] = true;
            }

            percentPassing[i] = currentPassing;
            cumulativeRetained[i] = 100 - currentPassing;

            if (i === 0) {
                percentRetained[i] = cumulativeRetained[i];
            } else {
                percentRetained[i] = Math.max(0, cumulativeRetained[i] - cumulativeRetained[i - 1]);
            }
        }

        panPercentPassing = n > 0 ? percentPassing[n - 1] : 0;
        panWeightGrams = (panPercentPassing / 100) * totalGrams;
    }

    return {
        computed: { percentRetained, cumulativeRetained, percentPassing, panWeightGrams, panPercentPassing },
        validation
    };
};

/**
 * Blends multiple piles given their proportions to calculate a combined percent passing.
 */
export const computeBlend = (
    pilesPercentPassing: number[][],
    proportions: number[] // must sum to 1
): number[] => {
    if (pilesPercentPassing.length === 0 || proportions.length === 0) return [];

    const numSieves = pilesPercentPassing[0].length;
    const combined: number[] = new Array(numSieves).fill(0);

    for (let i = 0; i < numSieves; i++) {
        for (let p = 0; p < pilesPercentPassing.length; p++) {
            combined[i] += (pilesPercentPassing[p][i] || 0) * (proportions[p] || 0);
        }
    }

    return combined;
};
