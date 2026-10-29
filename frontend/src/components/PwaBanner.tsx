import React from "react";
import { Download, WifiOff, RefreshCw, X, Info } from "lucide-react";
import { usePwa } from "../context/PwaContext";

export function PwaBanner() {
  const {
    isInstallable,
    isOffline,
    isUpdateAvailable,
    promptInstall,
    updateApp,
    dismissInstall,
    showInstallBanner,
  } = usePwa();

  return (
    <>
      {/* 1. Offline Mode Indicator */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 shadow-md animate-in slide-in-from-top duration-300">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>
            You are currently offline. Cached views remain available; new
            changes will sync once connected.
          </span>
        </div>
      )}

      {/* 2. New Version Update Prompt */}
      {isUpdateAvailable && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 bg-brand-primary text-white px-5 py-3 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-4 animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-brand-accent shrink-0" />
            <span className="text-xs font-medium">
              A new version of NeoOps is available.
            </span>
          </div>
          <button
            onClick={updateApp}
            className="px-3 py-1.5 bg-white text-brand-primary text-xs font-bold rounded-xl hover:bg-slate-100 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Update Now
          </button>
        </div>
      )}

      {/* 3. Install App Prompt Banner */}
      {showInstallBanner && isInstallable && (
        <div className="fixed bottom-5 right-5 z-40 max-w-sm w-[calc(100vw-2.5rem)] bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center shrink-0">
              <Download className="w-5 h-5 text-brand-primary" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-[var(--text-main)]">
                  Install NeoOps App
                </h4>
                <button
                  onClick={dismissInstall}
                  className="text-[var(--text-muted)] hover:text-[var(--text-main)] p-1 rounded-lg transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">
                Install for instant launch, standalone window mode, and offline
                availability.
              </p>

              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={promptInstall}
                  className="flex-1 py-1.5 px-3 bg-brand-primary text-white text-xs font-bold rounded-xl hover:opacity-90 transition-opacity shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Install Now
                </button>
                <button
                  onClick={dismissInstall}
                  className="py-1.5 px-3 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-muted)] hover:text-[var(--text-main)] text-xs font-medium rounded-xl transition-colors"
                >
                  Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
