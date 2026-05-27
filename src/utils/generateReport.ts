import { AppState, ValidationState, BinderResult, Sieve, Envelope, EnvelopeLimit } from '../types';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, ImageRun, AlignmentType, VerticalAlign, BorderStyle, WidthType, HeightRule, ShadingType, UnderlineType, VerticalMergeType } from 'docx';
import { computeAndValidatePile, computeBlend } from './calculations';
import { calculateCombinedGsb, calculateSurfaceArea, computeVolumetricResults, findOptimalBinder, fitPolynomial } from './volumetrics';
import { STANDARD_SIEVES, MORTH_ENVELOPES } from './constants';

const CELL_MARGIN = { top: 80, bottom: 80, left: 80, right: 80 };
const BORDER_BLACK = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
const NO_BORDER = { style: BorderStyle.NIL, size: 0, color: "FFFFFF" };
const ALL_BORDERS = { top: BORDER_BLACK, bottom: BORDER_BLACK, left: BORDER_BLACK, right: BORDER_BLACK };

const getLogoBuffer = async (): Promise<ArrayBuffer> => {
    const response = await fetch('/iitr_logo.png');
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    return new Uint8Array(arrayBuffer).buffer;
};

const canvasToArrayBuffer = (canvas: HTMLCanvasElement): ArrayBuffer => {
    const dataUrl = canvas.toDataURL('image/png');
    const base64Data = dataUrl.replace(/^data:image\/(png|jpg);base64,/, "");
    const binaryString = window.atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
};

const renderGradationChart = async (sieves: Sieve[], combinedPassing: number[], envelope: Envelope | null | undefined): Promise<ArrayBuffer> => {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = 600;
        canvas.height = 400;
        const ctx = canvas.getContext('2d')!;
        
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, 600, 400);

        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 10; i++) {
            const y = 50 + i * 30;
            ctx.beginPath(); ctx.moveTo(50, y); ctx.lineTo(550, y); ctx.stroke();
            ctx.fillStyle = '#000000';
            ctx.font = '12px Arial';
            ctx.textAlign = 'right';
            ctx.fillText((100 - i * 10).toString(), 45, y + 4);
        }

        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeRect(50, 50, 500, 300);

        const minSieve = 0.075;
        const maxSieve = sieves.length > 0 ? sieves[0].size_mm : 26.5;
        
        const getX = (size: number) => {
            const logMin = Math.log10(minSieve);
            const logMax = Math.log10(maxSieve);
            const logVal = Math.log10(Math.max(size, minSieve));
            return 50 + ((logVal - logMin) / (logMax - logMin)) * 500;
        };
        const getY = (passing: number) => 350 - (passing / 100) * 300;

        sieves.forEach(s => {
            const px = getX(s.size_mm);
            ctx.strokeStyle = '#e2e8f0';
            ctx.beginPath(); ctx.moveTo(px, 50); ctx.lineTo(px, 350); ctx.stroke();
            
            ctx.strokeStyle = '#000000';
            ctx.beginPath(); ctx.moveTo(px, 350); ctx.lineTo(px, 355); ctx.stroke();
            ctx.fillStyle = '#000000';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(s.size_mm.toString(), px, 368);
        });
        
        ctx.fillStyle = '#334155';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Sieve Size (mm)', 300, 390);

        ctx.save();
        ctx.translate(20, 200);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Percent Passing (%)', 0, 0);
        ctx.restore();

        if (envelope) {
            // Upper
            ctx.beginPath();
            envelope.limits.forEach((lim: EnvelopeLimit, idx: number) => {
                const px = getX(lim.size_mm);
                const py = getY(lim.upper);
                if (idx === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            });
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.stroke();

            // Lower
            ctx.beginPath();
            envelope.limits.forEach((lim: EnvelopeLimit, idx: number) => {
                const px = getX(lim.size_mm);
                const py = getY(lim.lower);
                if (idx === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            });
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Achieved
        ctx.beginPath();
        sieves.forEach((s, idx) => {
            const px = getX(s.size_mm);
            const py = getY(combinedPassing[idx]);
            if (idx === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        });
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 3;
        ctx.stroke();

        sieves.forEach((s, idx) => {
            const px = getX(s.size_mm);
            const py = getY(combinedPassing[idx]);
            ctx.beginPath();
            ctx.arc(px, py, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.stroke();
        });

        resolve(canvasToArrayBuffer(canvas));
    });
};

const renderMarshallChart = async (results: BinderResult[], optPb: number | null, key: keyof BinderResult, title: string, yLabel: string, color: string): Promise<ArrayBuffer> => {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 300;
        const ctx = canvas.getContext('2d')!;

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, 400, 300);

        const valid = results.filter(r => r[key] !== null).sort((a, b) => a.pb - b.pb);
        if (valid.length < 2) {
            resolve(canvasToArrayBuffer(canvas));
            return;
        }

        const minX = valid[0].pb;
        const maxX = valid[valid.length - 1].pb;
        const rangeX = (maxX - minX) || 1;
        const padX = rangeX * 0.1;
        
        const yVals = valid.map(r => r[key] as number);
        const minY = Math.min(...yVals);
        const maxY = Math.max(...yVals);
        const rangeY = (maxY - minY) || 1;
        const padY = rangeY * 0.1;

        const pMinX = minX - padX;
        const pMaxX = maxX + padX;
        const pMinY = minY - padY;
        const pMaxY = maxY + padY;

        const getX = (val: number) => 50 + ((val - pMinX) / (pMaxX - pMinX)) * 320;
        const getY = (val: number) => 250 - ((val - pMinY) / (pMaxY - pMinY)) * 200;

        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = 50 + i * 50;
            const valY = pMaxY - (i / 4) * (pMaxY - pMinY);
            ctx.beginPath(); ctx.moveTo(50, y); ctx.lineTo(370, y); ctx.stroke();
            ctx.fillStyle = '#000000';
            ctx.font = '12px Arial';
            ctx.textAlign = 'right';
            ctx.fillText(valY.toFixed(1), 45, y + 4);

            const x = 50 + i * 80;
            const valX = pMinX + (i / 4) * (pMaxX - pMinX);
            ctx.beginPath(); ctx.moveTo(x, 50); ctx.lineTo(x, 250); ctx.stroke();
            ctx.fillStyle = '#000000';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(valX.toFixed(1), x, 265);
        }

        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeRect(50, 50, 320, 200);

        ctx.fillStyle = '#334155';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(title, 210, 20);

        ctx.font = '10px Arial';
        ctx.fillText('Binder Content (%)', 210, 280);

        ctx.save();
        ctx.translate(20, 150);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(yLabel, 0, 0);
        ctx.restore();

        const pts = valid.map(r => ({ x: r.pb, y: r[key] as number }));
        const poly = fitPolynomial(pts);
        
        ctx.save();
        ctx.beginPath();
        ctx.rect(50, 50, 320, 200);
        ctx.clip();

        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        
        if (poly) {
            for (let i = 0; i <= 50; i++) {
                const x = pMinX + (i / 50) * (pMaxX - pMinX);
                const y = poly.a * x * x + poly.b * x + poly.c;
                const px = getX(x);
                const py = getY(y);
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
        } else {
            valid.forEach((r, i) => {
                const px = getX(r.pb);
                const py = getY(r[key] as number);
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            });
        }
        ctx.stroke();
        ctx.restore();

        if (optPb !== null) {
            const ox = getX(optPb);
            ctx.strokeStyle = '#6366f1';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(ox, 50);
            ctx.lineTo(ox, 250);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        valid.forEach(r => {
            const px = getX(r.pb);
            const py = getY(r[key] as number);
            ctx.beginPath();
            ctx.arc(px, py, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.stroke();
        });

        resolve(canvasToArrayBuffer(canvas));
    });
};

export async function generateReport(state: AppState): Promise<Blob> {
    const pilesPercentPassing = state.piles.map(p => computeAndValidatePile(p).computed.percentPassing);
    const combinedPassing = computeBlend(pilesPercentPassing, state.proportions);
    const combinedGsb = calculateCombinedGsb(state.volumetrics.pileVolumetrics, state.proportions);
    
    let massGrams = state.totalAggregateMass ?? 1000;
    const unit = state.totalAggregateMassUnit ?? 'g';
    if (unit === 'kg') massGrams *= 1000;
    else if (unit === 'tonnes') massGrams *= 1000000;

    const { totalSurfaceArea } = calculateSurfaceArea(state.sieves, combinedPassing, massGrams, combinedGsb);
    const results = computeVolumetricResults(state.volumetrics, state.proportions, totalSurfaceArea);
    const targetVa = state.volumetrics.targetVa ?? 4.0;
    const optimalBinder = findOptimalBinder(results, targetVa);
    const env = state.useCustomEnvelope ? state.customEnvelope : MORTH_ENVELOPES.find(e => e.id === state.selectedEnvelopeId);

    const logoBuf = await getLogoBuffer();
    const chartGradation = await renderGradationChart(state.sieves, combinedPassing, env);
    const cVa = await renderMarshallChart(results, optimalBinder?.pb ?? null, 'va', 'Air Voids (Va)', 'Va (%)', '#ef4444');
    const cGmb = await renderMarshallChart(results, optimalBinder?.pb ?? null, 'avgGmb', 'Density (Gmb)', 'g/cm³', '#8b5cf6');
    const cVma = await renderMarshallChart(results, optimalBinder?.pb ?? null, 'vma', 'VMA', 'VMA (%)', '#f59e0b');
    const cVfb = await renderMarshallChart(results, optimalBinder?.pb ?? null, 'vfb', 'VFB', 'VFB (%)', '#3b82f6');
    const cStab = await renderMarshallChart(results, optimalBinder?.pb ?? null, 'avgStability', 'Stability', 'Stability (kN)', '#d97706');
    const cFlow = await renderMarshallChart(results, optimalBinder?.pb ?? null, 'avgFlow', 'Flow', 'Flow (mm)', '#2563eb');

    const doc = new Document({
        sections: [{
            properties: {
                page: {
                    margin: { top: 994, right: 922, bottom: 360, left: 907 }
                }
            },
            children: [
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    columnWidths: [2766, 7854],
                    borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER, insideHorizontal: NO_BORDER, insideVertical: NO_BORDER },
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({
                                    width: { size: 26, type: WidthType.PERCENTAGE },
                                    margins: CELL_MARGIN,
                                    children: [new Paragraph({ children: [new ImageRun({ type: 'png', data: logoBuf, transformation: { width: 100, height: 100 } })] })],
                                }),
                                new TableCell({
                                    width: { size: 74, type: WidthType.PERCENTAGE },
                                    margins: CELL_MARGIN,
                                   
                                    children: [
                                        new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "TRANSPORTATION ENGINEERING LABORATORY", font: "Times New Roman", size: 20, bold: true })] }),
                                        new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "DEPARTMENT OF CIVIL ENGINEERING", font: "Times New Roman", size: 20, bold: true })] }),
                                        new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "INDIAN INSTITUTE OF TECHNOLOGY Roorkee-247667", font: "Times New Roman", size: 20, bold: true })] }),
                                        new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Tel : +91-1332-284319, 285219; Fax Nos. : +91-1332-275568", font: "Times New Roman", size: 20, bold: true })] }),
                                        new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "URL: http://www.civil.iitr.ac.in; Email: civil@iitr.ac.in", font: "Times New Roman", size: 20, bold: true })] })
                                    ]
                                })
                            ]
                        })
                    ]
                }),
                new Paragraph({ text: "" }),
                new Paragraph({ border: { bottom: { color: "000000", space: 1, size: 12, style: BorderStyle.SINGLE } } }),
                new Paragraph({ text: "" }),
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    columnWidths: [6204, 4249],
                    borders: ALL_BORDERS,
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({
                                    columnSpan: 2, margins: CELL_MARGIN,
                                    children: [new Paragraph({ children: [new TextRun({ text: "  No.                                                                                                                Dated: ", font: "Arial", size: 22 })] })]
                                })
                            ]
                        }),
                        new TableRow({
                            children: [
                                new TableCell({
                                    width: { size: 6204, type: WidthType.DXA }, margins: CELL_MARGIN,
                                    children: [
                                        new Paragraph({ children: [new TextRun({ text: "Name and Address of the Client", font: "Arial", bold: true, size: 22 })] }),
                                        new Paragraph({ text: " " })
                                    ]
                                }),
                                new TableCell({
                                    width: { size: 4249, type: WidthType.DXA }, margins: CELL_MARGIN,
                                    children: [
                                        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Client's Reference No. & Date", font: "Arial", bold: true, size: 22 })] })
                                    ]
                                })
                            ]
                        })
                    ]
                }),
                new Paragraph({ text: "" }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "MIX DESIGN REPORT", font: "Arial", bold: true, size: 22 })] }),
                new Paragraph({ text: "" }),
                new Paragraph({ children: [new TextRun({ text: "General", font: "Arial", bold: true, size: 22 })] }),
                new Paragraph({ text: "" }),
                new Paragraph({ children: [new TextRun({ text: "Scope", font: "Arial", bold: true, size: 22 })] }),
                new Paragraph({ text: "" }),
                new Paragraph({ children: [new TextRun({ text: "Mix Design of DAC-1", font: "Arial", bold: true, underline: { type: UnderlineType.SINGLE }, size: 22 })] }),
                new Paragraph({ text: "" }),
                new Paragraph({ children: [new TextRun({ text: "Table 1: Sieve Size distribution of aggregates, specific gravity, and aggregate properties for DAC-1", font: "Arial", size: 22 })] }),
                
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    columnWidths: [2207, ...Array(state.piles.length).fill(1348)],
                    borders: ALL_BORDERS,
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({ margins: CELL_MARGIN, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Sieve size (mm)", font: "Arial", bold: true, size: 20 })] })] }),
                                ...state.piles.map(p => new TableCell({ margins: CELL_MARGIN, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: p.name, font: "Arial", bold: true, size: 20 })] })] }))
                            ]
                        }),
                        ...state.sieves.map((s, i) => new TableRow({
                            children: [
                                new TableCell({ margins: CELL_MARGIN, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: s.size_mm.toString(), font: "Arial", bold: true, size: 20 })] })] }),
                                ...pilesPercentPassing.map(pass => new TableCell({ margins: CELL_MARGIN, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: pass[i].toFixed(2), font: "Arial", size: 20 })] })] }))
                            ]
                        })),
                        new TableRow({
                            children: [
                                new TableCell({ margins: CELL_MARGIN, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Bulk Specific Gravity of Aggregates, g/cm", font: "Arial", bold: true, size: 20 }), new TextRun({ text: "3", font: "Arial", bold: true, size: 20, superScript: true })] })] }),
                                ...state.volumetrics.pileVolumetrics.map(pv => new TableCell({ margins: CELL_MARGIN, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: pv.gSb?.toFixed(3) || "-", font: "Arial", size: 20 })] })] }))
                            ]
                        })
                    ]
                }),
                
                new Paragraph({ text: "" }),
                new Paragraph({ children: [new TextRun({ text: "Blending of stockpiles for DAC-1", font: "Arial", bold: true, size: 22 })] }),
                new Paragraph({ children: [new TextRun({ text: "STBBM, an inhouse software developed by IIT Roorkee, was used for assessing the appropriate blend of the stockpiles. Table 2 presents the Aggregate Blending proposed for the given sieve size distribution and the required gradation for DAC-1. As can be seen, the proposed blend satisfies the specified gradation band and hence can be used for the production of bituminous mixture.", font: "Arial", size: 22 })] }),
                new Paragraph({ text: "" }),
                new Paragraph({ children: [new TextRun({ text: "Table 2: Proposed aggregate blending for DAC-1", font: "Arial", size: 22 })] }),
                
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    columnWidths: [1316, 3448, 2587, 2585],
                    borders: ALL_BORDERS,
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({ margins: CELL_MARGIN, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "S. No.", font: "Arial", bold: true, size: 20 })] })] }),
                                new TableCell({ margins: CELL_MARGIN, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Material", font: "Arial", bold: true, size: 20 })] })] }),
                                new TableCell({ margins: CELL_MARGIN, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Proportion (%)", font: "Arial", bold: true, size: 20 })] })] }),
                                new TableCell({ margins: CELL_MARGIN, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Combined Specific Gravity", font: "Arial", bold: true, size: 20 })] })] })
                            ]
                        }),
                        ...state.piles.map((p, i) => new TableRow({
                            children: [
                                new TableCell({ margins: CELL_MARGIN, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: (i + 1).toString(), font: "Arial", size: 20 })] })] }),
                                new TableCell({ margins: CELL_MARGIN, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: p.name, font: "Arial", size: 20 })] })] }),
                                new TableCell({ margins: CELL_MARGIN, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: (state.proportions[i] * 100).toFixed(1), font: "Arial", size: 20 })] })] }),
                                ...(i === 0 ? [
                                    new TableCell({ rowSpan: state.piles.length, margins: CELL_MARGIN, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: combinedGsb?.toFixed(3) || "-", font: "Arial", size: 20 }), new TextRun({ text: " g/cm", font: "Arial", size: 20 }), new TextRun({ text: "3", font: "Arial", size: 20, superScript: true })] })] })
                                ] : [])
                            ]
                        }))
                    ]
                }),

                new Paragraph({ text: "" }),
                new Paragraph({ children: [new TextRun({ text: "Note: ", font: "Arial", bold: true, italics: true, size: 22 }), new TextRun({ text: "The above blend has been proposed for the materials received. Any change in hot bin during production should be monitored to ensure the target gradation.", font: "Arial", bold: true, size: 22 })] }),
                new Paragraph({ text: "" }),
                new Paragraph({ children: [new TextRun({ text: "Gradation Achieved", font: "Arial", bold: true, size: 22 })] }),
                new Paragraph({ children: [new TextRun({ text: "Table 3 and Figure 1 presents the gradation achieved through the job mix formula and the corresponding requirement for DAC-1 as per MoRT&H.", font: "Arial", size: 22 })] }),
                new Paragraph({ text: "" }),
                new Paragraph({ children: [new TextRun({ text: "Table 3. Gradation achieved for DAC-1", font: "Arial", size: 22 })] }),
                
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    columnWidths: [2517, 2517, 2438, 2595],
                    borders: ALL_BORDERS,
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({ margins: CELL_MARGIN, children: [] }),
                                new TableCell({ margins: CELL_MARGIN, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Desired Gradation Range", font: "Arial", bold: true, size: 20 })] })] }),
                                new TableCell({ margins: CELL_MARGIN, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Achieved Gradation Range", font: "Arial", bold: true, size: 20 })] })] }),
                                new TableCell({ rowSpan: state.sieves.length + 2, margins: CELL_MARGIN, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "The gradation is satisfied", font: "Arial", size: 20 })] })] })
                            ]
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ margins: CELL_MARGIN, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Nominal Aggregate Size", font: "Arial", bold: true, size: 20 })] })] }),
                                new TableCell({ margins: CELL_MARGIN, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: state.sieves[0]?.size_mm + " mm", font: "Arial", bold: true, size: 20 })] })] }),
                                new TableCell({ margins: CELL_MARGIN, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "-", font: "Arial", bold: true, size: 20 })] })] }),
                            ]
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ margins: CELL_MARGIN, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "IS Sieve (mm)", font: "Arial", bold: true, size: 20 })] })] }),
                                new TableCell({ columnSpan: 2, margins: CELL_MARGIN, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Cumulative % by weight of total aggregate passing", font: "Arial", bold: true, size: 20 })] })] }),
                            ]
                        }),
                        ...state.sieves.map((s, i) => {
                            const limit = env?.limits.find(l => l.size_mm === s.size_mm);
                            const rangeText = limit ? `${limit.lower}-${limit.upper}` : "-";
                            return new TableRow({
                                children: [
                                    new TableCell({ margins: CELL_MARGIN, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: s.size_mm.toString(), font: "Arial", size: 20 })] })] }),
                                    new TableCell({ margins: CELL_MARGIN, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: rangeText, font: "Arial", size: 20 })] })] }),
                                    new TableCell({ margins: CELL_MARGIN, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: combinedPassing[i].toFixed(2), font: "Arial", size: 20 })] })] })
                                ]
                            });
                        })
                    ]
                }),

                new Paragraph({ text: "" }),
                new Paragraph({ text: "" }),
                
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    columnWidths: [10077],
                    borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER, insideHorizontal: NO_BORDER, insideVertical: NO_BORDER },
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({ margins: CELL_MARGIN, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ type: 'png', data: chartGradation, transformation: { width: 450, height: 300 } })] })] })
                            ]
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ margins: CELL_MARGIN, children: [new Paragraph({ alignment: AlignmentType.LEFT, children: [new TextRun({ text: "Figure 1", font: "Arial", bold: true, size: 22 }), new TextRun({ text: " - Gradation achieved for DAC-1", font: "Arial", size: 22 })] })] })
                            ]
                        })
                    ]
                }),

                new Paragraph({ text: "" }),
                new Paragraph({ children: [new TextRun({ text: "Marshall Mix Design Results", font: "Arial", bold: true, size: 22 })] }),
                new Paragraph({ text: "" }),

                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    columnWidths: [5038, 5039],
                    borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER, insideHorizontal: NO_BORDER, insideVertical: NO_BORDER },
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({ margins: CELL_MARGIN, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ type: 'png', data: cVa, transformation: { width: 300, height: 225 } })] })] }),
                                new TableCell({ margins: CELL_MARGIN, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ type: 'png', data: cGmb, transformation: { width: 300, height: 225 } })] })] })
                            ]
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ margins: CELL_MARGIN, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "a", font: "Arial", size: 22 })] })] }),
                                new TableCell({ margins: CELL_MARGIN, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "b", font: "Arial", size: 22 })] })] })
                            ]
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ margins: CELL_MARGIN, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ type: 'png', data: cVma, transformation: { width: 300, height: 225 } })] })] }),
                                new TableCell({ margins: CELL_MARGIN, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ type: 'png', data: cVfb, transformation: { width: 300, height: 225 } })] })] })
                            ]
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ margins: CELL_MARGIN, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "c", font: "Arial", size: 22 })] })] }),
                                new TableCell({ margins: CELL_MARGIN, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "d", font: "Arial", size: 22 })] })] })
                            ]
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ margins: CELL_MARGIN, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ type: 'png', data: cStab, transformation: { width: 300, height: 225 } })] })] }),
                                new TableCell({ margins: CELL_MARGIN, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ type: 'png', data: cFlow, transformation: { width: 300, height: 225 } })] })] })
                            ]
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ margins: CELL_MARGIN, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "e", font: "Arial", size: 22 })] })] }),
                                new TableCell({ margins: CELL_MARGIN, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "f", font: "Arial", size: 22 })] })] })
                            ]
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ columnSpan: 2, margins: CELL_MARGIN, children: [new Paragraph({ children: [new TextRun({ text: "Figure 2. Marshall volumetric and strength properties", font: "Arial", size: 22 })] })] })
                            ]
                        })
                    ]
                }),

                new Paragraph({ text: "" }),
                new Paragraph({ children: [new TextRun({ text: "Table 4. ", font: "Arial", bold: true, size: 22 }), new TextRun({ text: "Marshall mix design parameters", font: "Arial", size: 22 })] }),

                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    columnWidths: [2514, 2504, 2528, 2521],
                    borders: ALL_BORDERS,
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({ margins: CELL_MARGIN, children: [new Paragraph({ children: [new TextRun({ text: "Parameter", font: "Arial", bold: true, size: 22 })] })] }),
                                new TableCell({ margins: CELL_MARGIN, children: [new Paragraph({ children: [new TextRun({ text: "Obtained result", font: "Arial", bold: true, size: 22 })] })] }),
                                new TableCell({ margins: CELL_MARGIN, children: [new Paragraph({ children: [new TextRun({ text: "Specification, MoRT&H", font: "Arial", bold: true, size: 22 })] })] }),
                                new TableCell({ margins: CELL_MARGIN, children: [new Paragraph({ children: [new TextRun({ text: "Remarks", font: "Arial", bold: true, size: 22 })] })] })
                            ]
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ margins: CELL_MARGIN, children: [new Paragraph({ children: [new TextRun({ text: "Air void at OBC", font: "Arial", size: 22 })] })] }),
                                new TableCell({ margins: CELL_MARGIN, children: [new Paragraph({ children: [new TextRun({ text: `${optimalBinder?.va?.toFixed(1) || "-"}% (approx.)`, font: "Arial", size: 22 })] })] }),
                                new TableCell({ margins: CELL_MARGIN, children: [new Paragraph({ children: [new TextRun({ text: "3%-5%", font: "Arial", size: 22 })] })] }),
                                new TableCell({ rowSpan: 8, margins: CELL_MARGIN, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ children: [new TextRun({ text: "Values are as per specification.", font: "Arial", size: 22 })] })] })
                            ]
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ margins: CELL_MARGIN, children: [new Paragraph({ children: [new TextRun({ text: "Average G", font: "Arial", size: 22 }), new TextRun({ text: "sb ", font: "Arial", size: 22, subScript: true }), new TextRun({ text: "(Combined)", font: "Arial", size: 22 })] })] }),
                                new TableCell({ margins: CELL_MARGIN, children: [new Paragraph({ children: [new TextRun({ text: `${combinedGsb?.toFixed(3) || "-"} g/cm`, font: "Arial", size: 22 }), new TextRun({ text: "3", font: "Arial", size: 22, superScript: true })] })] }),
                                new TableCell({ margins: CELL_MARGIN, children: [new Paragraph({ children: [new TextRun({ text: "-", font: "Arial", size: 22 })] })] }),
                            ]
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ margins: CELL_MARGIN, children: [new Paragraph({ children: [new TextRun({ text: "VMA", font: "Arial", size: 22 })] })] }),
                                new TableCell({ margins: CELL_MARGIN, children: [new Paragraph({ children: [new TextRun({ text: `${optimalBinder?.vma?.toFixed(1) || "-"}%`, font: "Arial", size: 22 })] })] }),
                                new TableCell({ margins: CELL_MARGIN, children: [new Paragraph({ children: [new TextRun({ text: "12%", font: "Arial", size: 22 })] })] }),
                            ]
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ margins: CELL_MARGIN, children: [new Paragraph({ children: [new TextRun({ text: "VFB", font: "Arial", size: 22 })] })] }),
                                new TableCell({ margins: CELL_MARGIN, children: [new Paragraph({ children: [new TextRun({ text: `${optimalBinder?.vfb?.toFixed(1) || "-"}%`, font: "Arial", size: 22 })] })] }),
                                new TableCell({ margins: CELL_MARGIN, children: [new Paragraph({ children: [new TextRun({ text: "65-75%", font: "Arial", size: 22 })] })] }),
                            ]
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ margins: CELL_MARGIN, children: [new Paragraph({ children: [new TextRun({ text: "Density at OBC", font: "Arial", size: 22 })] })] }),
                                new TableCell({ margins: CELL_MARGIN, children: [new Paragraph({ children: [new TextRun({ text: `${optimalBinder?.avgGmb?.toFixed(3) || "-"} g/cm`, font: "Arial", size: 22 }), new TextRun({ text: "3", font: "Arial", size: 22, superScript: true })] })] }),
                                new TableCell({ margins: CELL_MARGIN, children: [new Paragraph({ children: [new TextRun({ text: "-", font: "Arial", size: 22 })] })] }),
                            ]
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ margins: CELL_MARGIN, children: [new Paragraph({ children: [new TextRun({ text: "Marshall stability", font: "Arial", size: 22 })] })] }),
                                new TableCell({ margins: CELL_MARGIN, children: [new Paragraph({ children: [new TextRun({ text: `${optimalBinder?.avgStability?.toFixed(1) || "-"} kN`, font: "Arial", size: 22 })] })] }),
                                new TableCell({ margins: CELL_MARGIN, children: [new Paragraph({ children: [new TextRun({ text: "9 kN", font: "Arial", size: 22 })] })] }),
                            ]
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ margins: CELL_MARGIN, children: [new Paragraph({ children: [new TextRun({ text: "Marshall Flow", font: "Arial", size: 22 })] })] }),
                                new TableCell({ margins: CELL_MARGIN, children: [new Paragraph({ children: [new TextRun({ text: `${optimalBinder?.avgFlow?.toFixed(1) || "-"} mm`, font: "Arial", size: 22 })] })] }),
                                new TableCell({ margins: CELL_MARGIN, children: [new Paragraph({ children: [new TextRun({ text: "2.5-4 mm", font: "Arial", size: 22 })] })] }),
                            ]
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ margins: CELL_MARGIN, children: [new Paragraph({ children: [new TextRun({ text: "Marshall Quotient", font: "Arial", size: 22 })] })] }),
                                new TableCell({ margins: CELL_MARGIN, children: [new Paragraph({ children: [new TextRun({ text: `${(optimalBinder?.avgStability && optimalBinder?.avgFlow) ? (optimalBinder.avgStability / optimalBinder.avgFlow).toFixed(1) : "-"}`, font: "Arial", size: 22 })] })] }),
                                new TableCell({ margins: CELL_MARGIN, children: [new Paragraph({ children: [new TextRun({ text: "2-5", font: "Arial", size: 22 })] })] }),
                            ]
                        })
                    ]
                }),

                new Paragraph({ text: "" }),
                new Paragraph({ children: [new TextRun({ text: "Closing Remarks/Conclusion", font: "Arial", bold: true, size: 22 })] }),
                new Paragraph({ text: "" }),
                new Paragraph({ text: "" }),
                new Paragraph({ text: "" }),
                
                new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Prof. Nikhil Saboo", font: "Arial", bold: true, size: 22 })] }),
                new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Associate Professor", font: "Arial", size: 22 })] }),
                new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "IIT Roorkee", font: "Arial", size: 22 })] }),
            ]
        }]
    });

    return await Packer.toBlob(doc);
}
