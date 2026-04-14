import { Unit } from '@/types';

export const toGrams = (weight: number, unit: Unit): number => {
    switch (unit) {
        case 'kg':
            return weight * 1000;
        case 'tonnes':
            return weight * 1000000;
        case 'g':
        default:
            return weight;
    }
};

export const formatWeight = (weightInGrams: number, targetUnit: Unit): number => {
    switch (targetUnit) {
        case 'kg':
            return weightInGrams / 1000;
        case 'tonnes':
            return weightInGrams / 1000000;
        case 'g':
        default:
            return weightInGrams;
    }
};
