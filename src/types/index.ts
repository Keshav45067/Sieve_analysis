export type Unit = 'g' | 'kg' | 'tonnes';

export type Sieve = {
    size_mm: number;
};

export type InputMode = 'percent_passing' | 'weight_retained';

export type PileData = {
    id: string;
    name: string;
    totalWeight: number;
    unit: Unit;
    inputMode: InputMode;
    data: number[]; // represents either weight retained or percent passing depending on inputMode
    locked?: boolean; // For blending slider lock
};

export type PileValidation = {
    isValid: boolean;
    errors: string[];
    sieveErrors: boolean[]; // true if specific sieve index has error (e.g. not monotonically decreasing)
};

export type ComputedPileData = {
    percentRetained: number[];
    cumulativeRetained: number[];
    percentPassing: number[];
    panWeightGrams: number;
    panPercentPassing: number;
};

export type EnvelopeLimit = {
    size_mm: number;
    lower: number;
    upper: number;
};

export type Envelope = {
    id: string;
    name: string;
    limits: EnvelopeLimit[];
};

export type ValidationState = {
    isValid: boolean;
    pileValidations: Record<string, PileValidation>;
    globalErrors: string[];
};

export type AppState = {
    sieves: Sieve[];
    piles: PileData[];
    proportions: number[]; // parallel array to piles
    selectedEnvelopeId: string | null;
    customEnvelope: Envelope | null;
    useCustomEnvelope: boolean;
};
