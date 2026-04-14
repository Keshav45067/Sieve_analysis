'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '@/context/AppContext';
import SieveSelector from '@/components/SieveSelector';
import PileInputTable from '@/components/PileInputTable';
import BlendController from '@/components/BlendController';
import GradationChart from '@/components/GradationChart';
import EnvelopeOverlay from '@/components/EnvelopeOverlay';
import { Beaker, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function Home() {
  const { isClient, resetState, validationState } = useAppContext();

  if (!isClient) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Beaker className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Sieve Analysis & Blending</h1>
              <p className="text-xs text-slate-500 font-medium">IS 2720 / MoRTH Simulator</p>
            </div>
          </div>

          <button
            onClick={resetState}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Reset
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Global Error Summary */}
        <AnimatePresence>
          {!validationState.isValid && validationState.globalErrors.length > 0 && (
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <SieveSelector />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <PileInputTable />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <GradationChart />
            </motion.div>
          </div>

          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <BlendController />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.4 }}
            >
              <EnvelopeOverlay />
            </motion.div>
          </div>
        </div>
      </main>

      {/* Sticky Status Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="text-sm font-medium text-slate-500">Status:</div>
            {validationState.isValid ? (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm font-semibold border border-emerald-200">
                <CheckCircle2 className="w-4 h-4" /> Valid Data
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm font-semibold border border-red-200">
                <AlertTriangle className="w-4 h-4" /> Invalid Data
              </div>
            )}
          </div>
          <div className="text-sm">
            <span className="text-slate-500 font-medium mr-2">Calculations Active:</span>
            <span className={validationState.isValid ? "text-indigo-600 font-bold" : "text-slate-400 font-medium"}>
              {validationState.isValid ? 'Yes' : 'Paused'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
