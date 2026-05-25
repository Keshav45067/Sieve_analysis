import { BinderData, BinderResult, GmbSample, GmmSample, PileVolumetricData, Sieve, SurfaceAreaFraction, VolumetricState } from '../types';

// ==========================================
// CORE CALCULATIONS
// ==========================================

export const calculateGmb = (w1: number, w2: number, w3: number): number | null => {
    if (w3 <= w2 || w1 <= 0) return null;
    return w1 / (w3 - w2);
};

export const calculateVolumeCc = (w2: number, w3: number, diameter?: number, height?: number): number | null => {
    // Priority 1: Geometric Volume (if dimensions are explicitly provided and > 0)
    if (diameter && height && diameter > 0 && height > 0) {
        // V = π * r² * h. Convert mm to cm by dividing by 10
        const r_cm = (diameter / 2) / 10;
        const h_cm = height / 10;
        return Math.PI * Math.pow(r_cm, 2) * h_cm;
    }
    // Priority 2: Water displacement volume
    if (w3 > w2 && w2 > 0) return w3 - w2;
    return null;
};

export const getVolumeCorrectionFactor = (volumeCc: number): number => {
    if (volumeCc < 471) return 1.19; // < 457 handled as 1.19
    if (volumeCc <= 482) return 1.14;
    if (volumeCc <= 495) return 1.09;
    if (volumeCc <= 508) return 1.04;
    if (volumeCc <= 522) return 1.00;
    if (volumeCc <= 535) return 0.96;
    if (volumeCc <= 546) return 0.93;
    if (volumeCc <= 559) return 0.89;
    return 0.86; // > 559
};

export const calculateStability = (provingRingReading: number, loadFactor: number, volumeCc: number | null): number | null => {
    if (provingRingReading <= 0 || !volumeCc) return null;
    const correctionFactor = getVolumeCorrectionFactor(volumeCc);
    return (provingRingReading * loadFactor * correctionFactor) / 101.91;
};

export const calculatePileGsb = (pc: number, pf: number, gc: number, gf: number): number | null => {
    if (gc <= 0 || gf <= 0 || (pc === 0 && pf === 0)) return null;
    return 100 / ((pc / gc) + (pf / gf));
};

export const calculateCombinedGsb = (pileVolumetrics: PileVolumetricData[], proportions: number[]): number | null => {
    let totalWeight = 0;
    let sumWeighted = 0;
    
    for (let i = 0; i < pileVolumetrics.length; i++) {
        const pv = pileVolumetrics[i];
        const prop = proportions[i];
        if (pv.gSb && prop > 0) {
            sumWeighted += prop / pv.gSb;
            totalWeight += prop;
        }
    }
    
    if (totalWeight <= 0 || sumWeighted <= 0) return null;
    return totalWeight / sumWeighted;
};

export const calculateExperimentalGmm = (a: number, b: number, c: number, d: number): number | null => {
    const denom = (b - a) - (c - d);
    if (denom <= 0) return null;
    return (b - a) / denom;
};

export const calculateGse = (pb: number, experimentalGmm: number, gb: number): number | null => {
    if (experimentalGmm <= 0 || gb <= 0) return null;
    const denom = (100 / experimentalGmm) - (pb / gb);
    if (denom <= 0) return null;
    return (100 - pb) / denom;
};

export const calculateTheoreticalGmm = (pb: number, gse: number, gb: number): number | null => {
    if (gse <= 0 || gb <= 0) return null;
    const denom = ((100 - pb) / gse) + (pb / gb);
    if (denom <= 0) return null;
    return 100 / denom;
};

export const calculateVa = (gmm: number, gmb: number): number | null => {
    if (gmm <= 0) return null;
    return 100 * (gmm - gmb) / gmm;
};

export const calculateVma = (gmb: number, pb: number, gsb: number): number | null => {
    if (gsb <= 0) return null;
    return 100 - (gmb * (100 - pb) / gsb);
};

export const calculateVfb = (vma: number, va: number): number | null => {
    if (vma <= 0) return null;
    return 100 * (vma - va) / vma;
};

// ==========================================
// SURFACE AREA & FILM THICKNESS
// ==========================================

export const calculateSurfaceArea = (
    sieves: Sieve[],
    combinedPercentPassing: number[],
    totalAggregateMassGrams: number,
    combinedGsb: number | null
): { fractions: SurfaceAreaFraction[], totalSurfaceArea: number } => {
    if (!combinedGsb || totalAggregateMassGrams <= 0 || sieves.length === 0 || sieves.length !== combinedPercentPassing.length) {
        return { fractions: [], totalSurfaceArea: 0 };
    }

    const fractions: SurfaceAreaFraction[] = [];
    let totalSA = 0;

    for (let i = 0; i < sieves.length; i++) {
        const upperSieve = i === 0 ? sieves[0].size_mm * 1.5 : sieves[i-1].size_mm; 
        const lowerSieve = sieves[i].size_mm;
        
        let retainedPercent = 0;
        if (i === 0) {
            retainedPercent = 100 - combinedPercentPassing[0];
        } else {
            retainedPercent = combinedPercentPassing[i-1] - combinedPercentPassing[i];
        }

        if (retainedPercent < 0.001) continue;

        const mass = (retainedPercent / 100) * totalAggregateMassGrams;
        const meanDiameter = (upperSieve + lowerSieve) / 2;

        const contribution = (6 * mass) / (combinedGsb * meanDiameter);

        fractions.push({
            upperSieve,
            lowerSieve,
            retainedPercent,
            mass,
            meanDiameter,
            contribution
        });
        
        totalSA += contribution;
    }

    if (sieves.length > 0) {
        const panRetainedPercent = combinedPercentPassing[sieves.length - 1];
        if (panRetainedPercent >= 0.001) {
            const lastSieveSize = sieves[sieves.length - 1].size_mm;
            const panMass = (panRetainedPercent / 100) * totalAggregateMassGrams;
            const panMeanDiameter = lastSieveSize / 2;
            const panContribution = (6 * panMass) / (combinedGsb * panMeanDiameter);

            fractions.push({
                upperSieve: lastSieveSize,
                lowerSieve: 0,
                retainedPercent: panRetainedPercent,
                mass: panMass,
                meanDiameter: panMeanDiameter,
                contribution: panContribution
            });
            
            totalSA += panContribution;
        }
    }

    const totalSurfaceAreaM2perKg = totalSA / totalAggregateMassGrams;
    return { fractions, totalSurfaceArea: totalSurfaceAreaM2perKg };
};

export const calculateFilmThickness = (pb: number, gb: number, surfaceAreaM2perKg: number): number | null => {
    if (surfaceAreaM2perKg <= 0 || gb <= 0 || pb >= 100) return null;
    const ps = 100 - pb;
    const pbe = pb; // For now, Effective Binder = Total Binder
    // Film thickness in microns
    return (1000 * pbe) / (gb * ps * surfaceAreaM2perKg);
};

// ==========================================
// ORCHESTRATION & INTERPOLATION
// ==========================================

export const computeVolumetricResults = (
    state: VolumetricState,
    proportions: number[],
    surfaceAreaM2perKg: number = 0
): BinderResult[] => {
    const combinedGsb = calculateCombinedGsb(state.pileVolumetrics, proportions);

    // Compute average experimental Gmm if a binder is selected
    let gSe: number | null = null;
    let avgExperimentalGmm: number | null = null;
    
    if (state.gmmBinderId && state.gmmSamples.length > 0) {
        const validGmms = state.gmmSamples
            .map(s => calculateExperimentalGmm(s.a, s.b, s.c, s.d))
            .filter((val): val is number => val !== null);
            
        if (validGmms.length > 0) {
            avgExperimentalGmm = validGmms.reduce((sum, val) => sum + val, 0) / validGmms.length;
            
            const gmmBinder = state.binders.find(b => b.id === state.gmmBinderId);
            if (gmmBinder) {
                gSe = calculateGse(gmmBinder.pb, avgExperimentalGmm, state.gb);
            }
        }
    }

    return state.binders.map(binder => {
        // Compute valid Gmb, Stability, and Flow values
        const validGmbs: number[] = [];
        const validStabilities: number[] = [];
        const validFlows: number[] = [];

        binder.gmbSamples.forEach(s => {
            const gmb = calculateGmb(s.w1, s.w2, s.w3);
            if (gmb !== null) validGmbs.push(gmb);

            const d = s.diameter ?? 101.6;
            const h = s.height ?? 63.5;
            const volCc = calculateVolumeCc(s.w2, s.w3, d, h);
            
            const lf = state.loadFactor ?? 5.66;
            const stability = calculateStability(s.provingRingReading ?? 0, lf, volCc);
            if (stability !== null) validStabilities.push(stability);

            if (s.flow > 0) validFlows.push(s.flow);
        });
            
        const avgGmb = validGmbs.length > 0 ? validGmbs.reduce((sum, val) => sum + val, 0) / validGmbs.length : null;
        const avgStability = validStabilities.length > 0 ? validStabilities.reduce((sum, val) => sum + val, 0) / validStabilities.length : null;
        const avgFlow = validFlows.length > 0 ? validFlows.reduce((sum, val) => sum + val, 0) / validFlows.length : null;

        // Determine Gmm for this binder
        let gmm: number | null = null;
        if (state.gmmCalculationMethod === 'theoretical') {
            const wa = state.waterAbsorption || 0;
            const frac = state.bitumenAbsorptionFraction ?? 60;
            const pba = wa * (frac / 100);
            let theoreticalGse = null;
            if (combinedGsb && combinedGsb > 0) {
                if (pba === 0) {
                    theoreticalGse = combinedGsb;
                } else {
                    const denom = (1 / combinedGsb) - (pba / (100 * state.gb));
                    if (denom > 0) {
                        theoreticalGse = 1 / denom;
                    }
                }
            }
            if (theoreticalGse) {
                gmm = calculateTheoreticalGmm(binder.pb, theoreticalGse, state.gb);
            }
        } else if (binder.id === state.gmmBinderId && avgExperimentalGmm) {
            gmm = avgExperimentalGmm;
        } else if (gSe) {
            gmm = calculateTheoreticalGmm(binder.pb, gSe, state.gb);
        }

        // Calculate Va, VMA, VFB
        let va: number | null = null;
        let vma: number | null = null;
        let vfb: number | null = null;

        if (avgGmb !== null) {
            if (gmm !== null) {
                va = calculateVa(gmm, avgGmb);
            }
            if (combinedGsb !== null) {
                vma = calculateVma(avgGmb, binder.pb, combinedGsb);
            }
            if (vma !== null && va !== null) {
                vfb = calculateVfb(vma, va);
            }
        }
        
        let filmThickness: number | null = null;
        if (surfaceAreaM2perKg > 0) {
            filmThickness = calculateFilmThickness(binder.pb, state.gb, surfaceAreaM2perKg);
        }

        return {
            pb: binder.pb,
            avgGmb,
            gmm,
            va,
            vma,
            vfb,
            avgStability,
            avgFlow,
            filmThickness
        };
    });
};

// ==========================================
// POLYNOMIAL REGRESSION
// ==========================================

export const fitPolynomial = (points: {x: number, y: number}[]): {a: number, b: number, c: number} | null => {
    if (points.length < 2) return null;
    
    if (points.length === 2) {
        const x1 = points[0].x; const y1 = points[0].y;
        const x2 = points[1].x; const y2 = points[1].y;
        if (x1 === x2) return null;
        const b = (y2 - y1) / (x2 - x1);
        const c = y1 - b * x1;
        return { a: 0, b, c };
    }

    let sumX = 0, sumX2 = 0, sumX3 = 0, sumX4 = 0;
    let sumY = 0, sumXY = 0, sumX2Y = 0;
    const n = points.length;

    for (const p of points) {
        const x = p.x;
        const y = p.y;
        const x2 = x * x;
        
        sumX += x;
        sumX2 += x2;
        sumX3 += x2 * x;
        sumX4 += x2 * x2;
        
        sumY += y;
        sumXY += x * y;
        sumX2Y += x2 * y;
    }

    const M = [
        [n, sumX, sumX2],
        [sumX, sumX2, sumX3],
        [sumX2, sumX3, sumX4]
    ];
    const V = [sumY, sumXY, sumX2Y];

    // Cramer's Rule for 3x3
    const det3x3 = (mat: number[][]) => 
        mat[0][0] * (mat[1][1] * mat[2][2] - mat[1][2] * mat[2][1]) -
        mat[0][1] * (mat[1][0] * mat[2][2] - mat[1][2] * mat[2][0]) +
        mat[0][2] * (mat[1][0] * mat[2][1] - mat[1][1] * mat[2][0]);

    const D = det3x3(M);
    if (Math.abs(D) < 1e-9) {
        // Fallback to linear if matrix is singular
        const x1 = points[0].x; const y1 = points[0].y;
        const x2 = points[points.length-1].x; const y2 = points[points.length-1].y;
        if (x1 === x2) return null;
        const b = (y2 - y1) / (x2 - x1);
        const c = y1 - b * x1;
        return { a: 0, b, c };
    }

    const replaceCol = (mat: number[][], col: number, vec: number[]) => 
        mat.map((row, i) => { const r = [...row]; r[col] = vec[i]; return r; });

    const Dc = det3x3(replaceCol(M, 0, V));
    const Db = det3x3(replaceCol(M, 1, V));
    const Da = det3x3(replaceCol(M, 2, V));

    return { c: Dc / D, b: Db / D, a: Da / D };
};

export const findOptimalBinder = (results: BinderResult[], targetVa: number): BinderResult | null => {
    const validResults = results.filter(r => r.va !== null).sort((a, b) => a.pb - b.pb);
    if (validResults.length < 2) return null;

    const pointsVa = validResults.map(r => ({x: r.pb, y: r.va!}));
    const polyVa = fitPolynomial(pointsVa);
    if (!polyVa) return null;

    let optPb = -1;
    const {a, b, c} = polyVa;
    const cAdj = c - targetVa;

    if (Math.abs(a) < 1e-9) {
        // Linear
        if (Math.abs(b) < 1e-9) return null;
        optPb = -cAdj / b;
    } else {
        // Quadratic
        const discriminant = b * b - 4 * a * cAdj;
        if (discriminant < 0) return null; // No real roots
        
        const root1 = (-b + Math.sqrt(discriminant)) / (2 * a);
        const root2 = (-b - Math.sqrt(discriminant)) / (2 * a);
        
        const minPb = validResults[0].pb;
        const maxPb = validResults[validResults.length - 1].pb;
        
        // Check which root is within or nearest to our domain [minPb - 1, maxPb + 1]
        const r1Valid = root1 >= minPb - 1 && root1 <= maxPb + 1;
        const r2Valid = root2 >= minPb - 1 && root2 <= maxPb + 1;
        
        if (r1Valid && !r2Valid) optPb = root1;
        else if (!r1Valid && r2Valid) optPb = root2;
        else if (r1Valid && r2Valid) {
            // Pick root where Va is decreasing (slope < 0)
            const slope1 = 2 * a * root1 + b;
            optPb = (slope1 < 0) ? root1 : root2;
        } else {
            return null; // neither root is anywhere near our data
        }
    }

    if (optPb === -1) return null;

    // Evaluate polynomials for all other variables at optPb
    const evaluate = (key: keyof BinderResult) => {
        const points = validResults.filter(r => r[key] !== null).map(r => ({x: r.pb, y: r[key] as number}));
        if (points.length < 2) return null;
        const poly = fitPolynomial(points);
        if (!poly) return null;
        return poly.a * optPb * optPb + poly.b * optPb + poly.c;
    };

    return {
        pb: optPb,
        avgGmb: evaluate('avgGmb'),
        gmm: evaluate('gmm'),
        va: targetVa,
        vma: evaluate('vma'),
        vfb: evaluate('vfb'),
        avgStability: evaluate('avgStability'),
        avgFlow: evaluate('avgFlow'),
        filmThickness: evaluate('filmThickness'),
    };
};
