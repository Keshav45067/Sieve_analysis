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
    totalAggregateMass: number;
    totalAggregateMassUnit: Unit;
    volumetrics: VolumetricState;
}

// ==========================================
// SURFACE AREA TYPES
// ==========================================
export type SurfaceAreaFraction = {
    upperSieve: number;
    lowerSieve: number;
    retainedPercent: number;
    mass: number;
    meanDiameter: number;
    contribution: number;
};

// ==========================================
// VOLUMETRIC ANALYSIS (MARSHALL) TYPES
// ==========================================

export type GmbSample = {
    id: string;
    w1: number; // weight in air
    w2: number; // weight in water
    w3: number; // SSD weight
    diameter?: number; // informational
    height?: number; // informational
    provingRingReading: number; // for stability
    flow: number; // in mm
    gmb: number | null; // computed
    stability: number | null; // computed
};

export type GmmSample = {
    id: string;
    a: number; // wt pycnometer
    b: number; // wt pycnometer + sample
    c: number; // wt pyc + sample + water
    d: number; // wt pyc + water
    gmm: number | null; // computed
};

export type BinderData = {
    id: string;
    pb: number; // percentage of binder
    gmbSamples: GmbSample[];
    avgGmb: number | null; // mean of gmbSamples
};

export type PileVolumetricData = {
    pileId: string;
    gc: number; // Coarse SG
    gf: number; // Fine SG
    pc: number; // Coarse %
    pf: number; // Fine %
    gSb: number | null; // Calculated Pile Gsb
};

export type VolumetricState = {
    isSetupComplete: boolean;
    gb: number; // specific gravity of bitumen
    loadFactor: number; // proving ring load factor (default 5.66)
    targetVa: number; // target Air Voids for optimal binder interpolation (default 4.0)
    binders: BinderData[];
    pileVolumetrics: PileVolumetricData[];
    
    // Gmm Calculation properties
    gmmCalculationMethod?: 'practical' | 'theoretical';
    waterAbsorption?: number;
    bitumenAbsorptionFraction?: number;
    
    gmmBinderId: string | null; // ID of the binder where Gmm is tested
    gmmSamples: GmmSample[];
    avgExperimentalGmm: number | null;
    gSe: number | null; // Effective SG calculated from avg Gmm or theoretically
};

export type BinderResult = {
    pb: number;
    avgGmb: number | null;
    gmm: number | null;
    va: number | null;
    vma: number | null;
    vfb: number | null;
    avgStability: number | null;
    avgFlow: number | null;
    filmThickness: number | null;
};
