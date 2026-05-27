'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '@/context/AppContext';
import PileInputTable from '@/components/PileInputTable';
import BlendController from '@/components/BlendController';
import GradationChart from '@/components/GradationChart';
import EnvelopeOverlay from '@/components/EnvelopeOverlay';
import VolumetricSetup from '@/components/volumetrics/VolumetricSetup';
import AggregateGsb from '@/components/volumetrics/AggregateGsb';
import AggregateSurfaceArea from '@/components/blending/AggregateSurfaceArea';
import GmbCalculations from '@/components/volumetrics/GmbCalculations';
import GmmCalculations from '@/components/volumetrics/GmmCalculations';
import VolumetricResults from '@/components/volumetrics/VolumetricResults';
import VolumetricCharts from '@/components/volumetrics/VolumetricCharts';
import ReportButton from '@/components/ReportButton';
import { Beaker, RefreshCw, AlertTriangle, CheckCircle2, FlaskConical, Layers } from 'lucide-react';

export default function Home() {
  const { isClient, resetState, validationState, state } = useAppContext();
  const [activeTab, setActiveTab] = useState<'blending' | 'volumetrics'>('blending');

  if (!isClient) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <FlaskConical className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Marshall Mix Design Simulator</h1>
              <p className="text-xs text-slate-500 font-medium">IS 2720 / MoRTH / IRC</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-slate-100 p-1 rounded-lg flex gap-1">
              <button
                onClick={() => setActiveTab('blending')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                  activeTab === 'blending' 
                    ? 'bg-white text-indigo-600 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4" /> Aggregate Blending
                </div>
              </button>
              <button
                onClick={() => setActiveTab('volumetrics')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                  activeTab === 'volumetrics' 
                    ? 'bg-white text-indigo-600 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Beaker className="w-4 h-4" /> Volumetric Analysis
                </div>
              </button>
            </div>
            
            <ReportButton />
            <button
              onClick={resetState}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-md transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Reset
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Global Error Summary */}
        <AnimatePresence>
          {!validationState.isValid && validationState.globalErrors.length > 0 && activeTab === 'blending' && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="bg-red-50 border border-red-200 rounded-xl p-4 overflow-hidden"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-800">
                    Fix {validationState.globalErrors.length} error{validationState.globalErrors.length > 1 ? 's' : ''} to proceed
                  </h3>
                  <ul className="mt-2 list-disc list-inside text-sm text-red-700 space-y-1">
                    {validationState.globalErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {activeTab === 'blending' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            <div className="lg:col-span-2 space-y-6">
              <EnvelopeOverlay />
              <PileInputTable />
              <GradationChart />
            </div>

            <div className="space-y-6">
              <BlendController />
              <AggregateSurfaceArea />
            </div>
          </motion.div>
        )}

        {activeTab === 'volumetrics' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Warning if blending is invalid */}
            {!validationState.isValid && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-amber-800">Aggregate Blending Invalid</h3>
                  <p className="text-sm text-amber-700 mt-1">
                    Please resolve the errors in the Aggregate Blending tab before proceeding. Volumetric results depend on valid gradation.
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-6">
              <VolumetricSetup />
              
              {state.volumetrics.isSetupComplete ? (
                <>
                  <AggregateGsb />
                  <GmbCalculations />
                  <GmmCalculations />
                  <VolumetricResults />
                  <VolumetricCharts />
                </>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center h-64 flex flex-col items-center justify-center">
                  <FlaskConical className="w-16 h-16 text-slate-300 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-700">Setup Required</h3>
                  <p className="text-slate-500 mt-2 max-w-sm">
                    Please configure your Marshall Mix Design parameters (Gb, Binder Contents, Specimens) to proceed with Volumetric Analysis.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </main>

      {/* Sticky Status Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="text-sm font-medium text-slate-500">Global Status:</div>
            {validationState.isValid ? (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm font-semibold border border-emerald-200">
                <CheckCircle2 className="w-4 h-4" /> Data Valid
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm font-semibold border border-red-200">
                <AlertTriangle className="w-4 h-4" /> Invalid Blend Data
              </div>
            )}
          </div>
          <div className="text-sm flex items-center gap-4">
            <span className="text-slate-500 font-medium">
              Mode: <span className="text-indigo-600 font-bold">{activeTab === 'blending' ? 'Blending' : 'Volumetrics'}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
