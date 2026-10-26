import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download, Loader2, Printer, X } from "lucide-react";

interface Props {
  title: string;
  /** PDF to show; null while it's still loading. */
  blob: Blob | null;
  filename: string;
  onClose: () => void;
}

/**
 * Shows a PDF (receipt, invoice…) inside the app instead of a new tab,
 * with download and print actions. Closes on Esc or backdrop click.
 */
export function PdfViewerModal({ title, blob, filename, onClose }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!blob) return;
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  const download = () => {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
    a.click();
  };

  const print = () => {
    try {
      frameRef.current?.contentWindow?.print();
    } catch {
      download();
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4 z-[100]"
      onClick={onClose}
    >
      <div
        className="bg-[var(--bg-surface)] sm:rounded-2xl shadow-2xl border border-[var(--border-soft)] w-full max-w-4xl h-full sm:h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-[var(--border-soft)] shrink-0">
          <h3 className="text-lg font-bold text-[var(--text-main)] truncate">
            {title}
          </h3>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={print}
              disabled={!url}
              title="Print"
              className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--border-soft)] text-sm font-bold text-[var(--text-main)] hover:bg-[var(--bg-app)] transition-colors disabled:opacity-50"
            >
              <Printer className="w-4 h-4" /> Print
            </button>
            <button
              onClick={download}
              disabled={!url}
              title="Download"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--border-soft)] text-sm font-bold text-[var(--text-main)] hover:bg-[var(--bg-app)] transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </button>
            <button
              onClick={onClose}
              title="Close"
              className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 bg-[var(--bg-app)]">
          {url ? (
            <iframe
              ref={frameRef}
              src={url}
              title={title}
              className="w-full h-full border-0"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center gap-2 text-[var(--text-muted)]">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading…
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
