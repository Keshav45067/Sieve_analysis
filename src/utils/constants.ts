import { Envelope, Sieve } from '@/types';

// IS 2720 standard sieves
export const STANDARD_SIEVES: Sieve[] = [
    { size_mm: 80 },
    { size_mm: 40 },
    { size_mm: 20 },
    { size_mm: 10 },
    { size_mm: 4.75 },
    { size_mm: 2 },
    { size_mm: 0.425 },
    { size_mm: 0.075 }
];

export const MORTH_ENVELOPES: Envelope[] = [
    {
        id: 'gsb-1',
        name: 'GSB Grading I',
        limits: [
            { size_mm: 75, lower: 100, upper: 100 },
            { size_mm: 53, lower: 80, upper: 100 },
            { size_mm: 26.5, lower: 55, upper: 90 },
            { size_mm: 9.5, lower: 35, upper: 65 },
            { size_mm: 4.75, lower: 25, upper: 55 },
            { size_mm: 2.36, lower: 20, upper: 40 },
            { size_mm: 0.425, lower: 10, upper: 25 },
            { size_mm: 0.075, lower: 3, upper: 10 }
        ]
    },
    {
        id: 'gsb-2',
        name: 'GSB Grading II',
        limits: [
            { size_mm: 53, lower: 100, upper: 100 },
            { size_mm: 26.5, lower: 70, upper: 100 },
            { size_mm: 9.5, lower: 50, upper: 80 },
            { size_mm: 4.75, lower: 40, upper: 65 },
            { size_mm: 2.36, lower: 30, upper: 50 },
            { size_mm: 0.425, lower: 15, upper: 25 },
            { size_mm: 0.075, lower: 3, upper: 10 }
        ]
    },
    {
        id: 'gsb-3',
        name: 'GSB Grading III',
        limits: [
            { size_mm: 26.5, lower: 100, upper: 100 },
            { size_mm: 9.5, lower: 65, upper: 95 },
            { size_mm: 4.75, lower: 50, upper: 80 },
            { size_mm: 2.36, lower: 40, upper: 65 },
            { size_mm: 0.425, lower: 20, upper: 35 },
            { size_mm: 0.075, lower: 3, upper: 10 }
        ]
    },
    {
        id: 'wmm',
        name: 'WMM',
        limits: [
            { size_mm: 53, lower: 100, upper: 100 },
            { size_mm: 45, lower: 95, upper: 100 },
            { size_mm: 22.4, lower: 60, upper: 80 },
            { size_mm: 11.2, lower: 40, upper: 60 },
            { size_mm: 4.75, lower: 25, upper: 40 },
            { size_mm: 2.36, lower: 15, upper: 30 },
            { size_mm: 0.6, lower: 8, upper: 22 },
            { size_mm: 0.075, lower: 0, upper: 8 }
        ]
    }
];
