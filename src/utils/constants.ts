import { Envelope, Sieve } from '@/types';

// IS 2720 standard sieves - Defaulting to BC Grading 2
export const STANDARD_SIEVES: Sieve[] = [
    { size_mm: 19 },
    { size_mm: 13.2 },
    { size_mm: 9.5 },
    { size_mm: 4.75 },
    { size_mm: 2.36 },
    { size_mm: 1.18 },
    { size_mm: 0.6 },
    { size_mm: 0.3 },
    { size_mm: 0.15 },
    { size_mm: 0.075 }
];

export const MORTH_ENVELOPES: Envelope[] = [
    {
        id: 'sma-13',
        name: 'SMA 13 mm (Wearing course)',
        limits: [
            { size_mm: 19, lower: 100, upper: 100 },
            { size_mm: 13.2, lower: 90, upper: 100 },
            { size_mm: 9.5, lower: 50, upper: 75 },
            { size_mm: 4.75, lower: 20, upper: 28 },
            { size_mm: 2.36, lower: 16, upper: 24 },
            { size_mm: 1.18, lower: 13, upper: 21 },
            { size_mm: 0.600, lower: 12, upper: 18 },
            { size_mm: 0.300, lower: 10, upper: 20 },
            { size_mm: 0.075, lower: 8, upper: 12 }
        ]
    },
    {
        id: 'sma-19',
        name: 'SMA 19 mm (Binder course)',
        limits: [
            { size_mm: 26.5, lower: 100, upper: 100 },
            { size_mm: 19, lower: 90, upper: 100 },
            { size_mm: 13.2, lower: 45, upper: 70 },
            { size_mm: 9.5, lower: 25, upper: 60 },
            { size_mm: 4.75, lower: 20, upper: 28 },
            { size_mm: 2.36, lower: 16, upper: 24 },
            { size_mm: 1.18, lower: 13, upper: 21 },
            { size_mm: 0.600, lower: 12, upper: 18 },
            { size_mm: 0.300, lower: 10, upper: 20 },
            { size_mm: 0.075, lower: 8, upper: 12 }
        ]
    },
    {
        id: 'dlc',
        name: 'Dry Lean Concrete (DLC)',
        limits: [
            { size_mm: 26.5, lower: 100, upper: 100 },
            { size_mm: 19.0, lower: 75, upper: 95 },
            { size_mm: 9.50, lower: 50, upper: 70 },
            { size_mm: 4.75, lower: 30, upper: 55 },
            { size_mm: 2.36, lower: 17, upper: 42 },
            { size_mm: 0.600, lower: 8, upper: 22 },
            { size_mm: 0.300, lower: 7, upper: 17 },
            { size_mm: 0.150, lower: 2, upper: 12 },
            { size_mm: 0.075, lower: 0, upper: 10 }
        ]
    },
    {
        id: 'gsb-1',
        name: 'GSB Grading I',
        limits: [
            { size_mm: 75.0, lower: 100, upper: 100 },
            { size_mm: 53.0, lower: 80, upper: 100 },
            { size_mm: 26.5, lower: 55, upper: 90 },
            { size_mm: 9.50, lower: 35, upper: 65 },
            { size_mm: 4.75, lower: 25, upper: 55 },
            { size_mm: 2.36, lower: 20, upper: 40 },
            { size_mm: 0.425, lower: 10, upper: 15 },
            { size_mm: 0.075, lower: 0, upper: 5 }
        ]
    },
    {
        id: 'gsb-2',
        name: 'GSB Grading II',
        limits: [
            { size_mm: 53.0, lower: 100, upper: 100 },
            { size_mm: 26.5, lower: 70, upper: 100 },
            { size_mm: 9.50, lower: 50, upper: 80 },
            { size_mm: 4.75, lower: 40, upper: 65 },
            { size_mm: 2.36, lower: 30, upper: 50 },
            { size_mm: 0.425, lower: 10, upper: 15 },
            { size_mm: 0.075, lower: 0, upper: 5 }
        ]
    },
    {
        id: 'gsb-3',
        name: 'GSB Grading III',
        limits: [
            { size_mm: 53.0, lower: 100, upper: 100 },
            { size_mm: 26.5, lower: 55, upper: 75 },
            { size_mm: 4.75, lower: 10, upper: 30 },
            { size_mm: 0.075, lower: 0, upper: 5 }
        ]
    },
    {
        id: 'gsb-4',
        name: 'GSB Grading IV',
        limits: [
            { size_mm: 53.0, lower: 100, upper: 100 },
            { size_mm: 26.5, lower: 50, upper: 80 },
            { size_mm: 4.75, lower: 15, upper: 35 },
            { size_mm: 0.075, lower: 0, upper: 5 }
        ]
    },
    {
        id: 'gsb-5',
        name: 'GSB Grading V',
        limits: [
            { size_mm: 75.0, lower: 100, upper: 100 },
            { size_mm: 53.0, lower: 80, upper: 100 },
            { size_mm: 26.5, lower: 55, upper: 90 },
            { size_mm: 9.50, lower: 35, upper: 65 },
            { size_mm: 4.75, lower: 25, upper: 50 },
            { size_mm: 2.36, lower: 10, upper: 20 },
            { size_mm: 0.85, lower: 2, upper: 10 },
            { size_mm: 0.425, lower: 0, upper: 5 }
        ]
    },
    {
        id: 'gsb-6',
        name: 'GSB Grading VI',
        limits: [
            { size_mm: 53.0, lower: 100, upper: 100 },
            { size_mm: 26.5, lower: 75, upper: 100 },
            { size_mm: 9.50, lower: 55, upper: 75 },
            { size_mm: 4.75, lower: 30, upper: 55 },
            { size_mm: 2.36, lower: 10, upper: 25 },
            { size_mm: 0.425, lower: 0, upper: 8 },
            { size_mm: 0.075, lower: 0, upper: 3 }
        ]
    },
    {
        id: 'bc-1',
        name: 'BC Grading 1 (19 mm)',
        limits: [
            { size_mm: 26.5, lower: 100, upper: 100 },
            { size_mm: 19, lower: 90, upper: 100 },
            { size_mm: 13.2, lower: 59, upper: 79 },
            { size_mm: 9.5, lower: 52, upper: 72 },
            { size_mm: 4.75, lower: 35, upper: 55 },
            { size_mm: 2.36, lower: 28, upper: 44 },
            { size_mm: 1.18, lower: 20, upper: 34 },
            { size_mm: 0.6, lower: 15, upper: 27 },
            { size_mm: 0.3, lower: 10, upper: 20 },
            { size_mm: 0.15, lower: 5, upper: 13 },
            { size_mm: 0.075, lower: 2, upper: 8 }
        ]
    },
    {
        id: 'bc-2',
        name: 'BC Grading 2 (13.2 mm)',
        limits: [
            { size_mm: 19, lower: 100, upper: 100 },
            { size_mm: 13.2, lower: 90, upper: 100 },
            { size_mm: 9.5, lower: 70, upper: 88 },
            { size_mm: 4.75, lower: 53, upper: 71 },
            { size_mm: 2.36, lower: 42, upper: 58 },
            { size_mm: 1.18, lower: 34, upper: 48 },
            { size_mm: 0.6, lower: 26, upper: 38 },
            { size_mm: 0.3, lower: 18, upper: 28 },
            { size_mm: 0.15, lower: 12, upper: 20 },
            { size_mm: 0.075, lower: 4, upper: 10 }
        ]
    },
    {
        id: 'dbm-1',
        name: 'DBM Grading 1 (37.5 mm)',
        limits: [
            { size_mm: 45, lower: 100, upper: 100 },
            { size_mm: 37.5, lower: 95, upper: 100 },
            { size_mm: 26.5, lower: 63, upper: 93 },
            { size_mm: 13.2, lower: 55, upper: 75 },
            { size_mm: 4.75, lower: 38, upper: 54 },
            { size_mm: 2.36, lower: 28, upper: 42 },
            { size_mm: 0.3, lower: 7, upper: 21 },
            { size_mm: 0.075, lower: 2, upper: 8 }
        ]
    },
    {
        id: 'dbm-2',
        name: 'DBM Grading 2 (26.5 mm)',
        limits: [
            { size_mm: 37.5, lower: 100, upper: 100 },
            { size_mm: 26.5, lower: 90, upper: 100 },
            { size_mm: 19, lower: 71, upper: 95 },
            { size_mm: 13.2, lower: 56, upper: 80 },
            { size_mm: 4.75, lower: 38, upper: 54 },
            { size_mm: 2.36, lower: 28, upper: 42 },
            { size_mm: 0.3, lower: 7, upper: 21 },
            { size_mm: 0.075, lower: 2, upper: 8 }
        ]
    }
];
