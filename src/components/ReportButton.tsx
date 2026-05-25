'use client';

import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { saveAs } from 'file-saver';
import { useAppContext } from '@/context/AppContext';
import { generateReport } from '@/utils/generateReport';

export default function ReportButton() {
    const { state } = useAppContext();
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerate = async () => {
        try {
            setIsGenerating(true);
            const blob = await generateReport(state);
            saveAs(blob, 'DAC-1_Mix_Design_Report.docx');
        } catch (error) {
            console.error('Failed to generate report:', error);
            alert('Failed to generate report. Please check the console for details.');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <button
            onClick={handleGenerate}
            disabled={isGenerating || !state.volumetrics.isSetupComplete}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white font-medium rounded-lg shadow-sm transition-colors"
        >
            {isGenerating ? (
                <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating Report...
                </>
            ) : (
                <>
                    <Download className="w-4 h-4" />
                    Export Report (DOCX)
                </>
            )}
        </button>
    );
}
