import React, { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  X,
  Upload,
  FileText,
  AlertCircle,
  CheckCircle,
  Loader2,
  ScanLine,
  ChevronRight,
  RefreshCw,
  Calendar,
  User,
  Hash,
  DollarSign,
  ListChecks,
} from "lucide-react";
import { InvoiceService, ClientService } from "../api";
import { cn } from "@/src/utils";
import { useNotification } from "../context/NotificationContext";
import { ClientPicker } from "./ClientPicker";

interface ExtractedData {
  client_name?: string | null;
  title?: string | null;
  issue_date?: string | null;
  due_date?: string | null;
  subtotal?: number | null;
  tax_percentage?: number | null;
  discount_amount?: number | null;
  total_amount?: number | null;
  notes?: string | null;
  line_items?: {
    name: string;
    description: string;
    quantity: number | string;
    unit_price: number | string;
  }[];
  raw_text?: string;
  parse_method?: string;
  error?: string;
  invoice_number_hint?: string | null;
  client_id?: number | string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

const MAX_SIZE_MB = 10;
const ACCEPTED = ["application/pdf", "image/png", "image/jpeg", "image/webp"];

export function UploadInvoiceModal({ open, onClose }: Props) {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<"upload" | "confirm">("upload");
  const [dragging, setDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<ExtractedData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<number | string>("");

  useEffect(() => {
    if (step === "confirm") {
      ClientService.getAll()
        .then((res) => setClients(res.data.results || res.data))
        .catch(console.error);
    }
  }, [step]);

  const resetState = () => {
    setStep("upload");
    setSelectedFile(null);
    setIsExtracting(false);
    setExtractError(null);
    setExtracted(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED.includes(file.type))
      return "Unsupported file type. Please upload a PDF, PNG, JPG, or WEBP.";
    if (file.size > MAX_SIZE_MB * 1024 * 1024)
      return `File too large. Max size is ${MAX_SIZE_MB} MB.`;
    return null;
  };

  const processFile = async (file: File) => {
    const err = validateFile(file);
    if (err) {
      setExtractError(err);
      return;
    }
    setSelectedFile(file);
    setExtractError(null);
    setIsExtracting(true);
    try {
      const res = await InvoiceService.parseUpload(file);
      const data: ExtractedData = res.data;
      if (data.error) {
        setExtractError(data.error);
        setIsExtracting(false);
        return;
      }
      setExtracted(data);
      setStep("confirm");
    } catch (e: any) {
      setExtractError(
        e?.response?.data?.error || "Failed to extract invoice data.",
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);
  const onDragLeave = useCallback(() => setDragging(false), []);
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, []);
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const handleCreateDraft = () => {
    if (extracted && selectedClientId) {
      extracted.client_id = selectedClientId;
    }
    handleClose();
    navigate("/invoices/new", { state: { ocrData: extracted } });
  };

  if (!open) return null;

  // Summary row helper
  const SummaryRow = ({
    icon: Icon,
    label,
    value,
  }: {
    icon: any;
    label: string;
    value: string | null | undefined;
  }) => {
    if (!value) return null;
    return (
      <div className="flex items-center gap-3 py-2.5 border-b border-[var(--border-soft)] last:border-0">
        <div className="p-1.5 rounded-lg bg-[var(--bg-app)]">
          <Icon className="w-3.5 h-3.5 text-[var(--text-muted)]" />
        </div>
        <span className="text-xs text-[var(--text-muted)] w-24 shrink-0">
          {label}
        </span>
        <span className="text-sm font-semibold text-[var(--text-main)] truncate">
          {value}
        </span>
      </div>
    );
  };

  const capturedCount = [
    extracted?.client_name,
    extracted?.title,
    extracted?.issue_date,
    extracted?.due_date,
    extracted?.total_amount,
  ].filter(Boolean).length;

  const lineItemCount = (extracted?.line_items || []).filter(
    (i) => i.name?.trim(),
  ).length;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className={cn(
          "bg-[var(--bg-app)] rounded-3xl w-full shadow-2xl border border-[var(--border-soft)] flex flex-col overflow-hidden transition-all duration-300",
          step === "upload" ? "max-w-md" : "max-w-lg",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border-soft)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-brand-primary/10">
              <Upload className="w-5 h-5 text-brand-primary" />
            </div>
            <div>
              <h2 className="text-lg font-black text-[var(--text-main)]">
                Upload Invoice
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                {step === "upload"
                  ? "PDF or image — we'll extract what we can"
                  : "Invoice draft ready to create"}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 px-6 py-3 bg-[var(--bg-surface)] border-b border-[var(--border-soft)] shrink-0">
          {["Upload File", "Create Draft"].map((label, idx) => {
            const active =
              (idx === 0 && step === "upload") ||
              (idx === 1 && step === "confirm");
            const done = idx === 0 && step === "confirm";
            return (
              <React.Fragment key={label}>
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-black transition-colors",
                      done
                        ? "bg-emerald-500 text-white"
                        : active
                          ? "bg-brand-primary text-white"
                          : "bg-[var(--bg-app)] text-[var(--text-muted)] border border-[var(--border-soft)]",
                    )}
                  >
                    {done ? <CheckCircle className="w-3.5 h-3.5" /> : idx + 1}
                  </div>
                  <span
                    className={cn(
                      "text-xs font-bold",
                      active
                        ? "text-[var(--text-main)]"
                        : "text-[var(--text-muted)]",
                    )}
                  >
                    {label}
                  </span>
                </div>
                {idx === 0 && (
                  <ChevronRight className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* ── STEP 1: Upload ── */}
        {step === "upload" && (
          <div className="p-6 flex flex-col gap-4">
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => !isExtracting && fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-2xl p-10 flex flex-col items-center gap-4 cursor-pointer transition-all select-none",
                dragging
                  ? "border-brand-primary bg-brand-primary/5 scale-[1.01]"
                  : "border-[var(--border-soft)] hover:border-brand-primary/50 hover:bg-[var(--bg-surface)]",
                isExtracting && "pointer-events-none opacity-60",
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                className="hidden"
                onChange={onFileChange}
              />

              {isExtracting ? (
                <>
                  <div className="p-4 rounded-2xl bg-brand-primary/10 animate-pulse">
                    <ScanLine className="w-8 h-8 text-brand-primary" />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-[var(--text-main)] flex items-center gap-2 justify-center">
                      <Loader2 className="w-4 h-4 animate-spin" /> Scanning
                      document…
                    </p>
                    <p className="text-sm text-[var(--text-muted)] mt-1">
                      <span className="font-semibold">
                        {selectedFile?.name}
                      </span>
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-4 rounded-2xl bg-[var(--bg-surface)]">
                    {selectedFile ? (
                      <FileText className="w-8 h-8 text-emerald-600" />
                    ) : (
                      <Upload className="w-8 h-8 text-[var(--text-muted)]" />
                    )}
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-[var(--text-main)]">
                      {selectedFile
                        ? selectedFile.name
                        : "Drop your invoice here"}
                    </p>
                    <p className="text-sm text-[var(--text-muted)] mt-1">
                      {selectedFile
                        ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`
                        : "or click to browse — PDF, PNG, JPG, WEBP"}
                    </p>
                  </div>
                  {!selectedFile && (
                    <div className="flex items-center gap-2">
                      {["PDF", "PNG", "JPG", "WEBP"].map((fmt) => (
                        <span
                          key={fmt}
                          className="px-2.5 py-1 bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-lg text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider"
                        >
                          {fmt}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {extractError && (
              <div className="flex items-start gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-700 dark:text-rose-400">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm">Could not read file</p>
                  <p className="text-sm mt-0.5">{extractError}</p>
                </div>
              </div>
            )}

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isExtracting}
              className="w-full py-3 bg-brand-primary text-white rounded-2xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isExtracting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Processing…
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" /> Choose File
                </>
              )}
            </button>
          </div>
        )}

        {/* ── STEP 2: Confirm ── */}
        {step === "confirm" && extracted && (
          <div className="flex flex-col overflow-hidden flex-1 min-h-0">
            {/* OCR result banner */}
            <div className="px-6 py-3 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center gap-2 text-emerald-700 dark:text-emerald-400 shrink-0">
              <ScanLine className="w-4 h-4 shrink-0" />
              <p className="text-xs font-bold">
                OCR complete —{" "}
                <span className="font-black">
                  {capturedCount} field{capturedCount !== 1 ? "s" : ""}
                </span>{" "}
                captured
                {lineItemCount > 0 && (
                  <>
                    ,{" "}
                    <span className="font-black">
                      {lineItemCount} line item{lineItemCount !== 1 ? "s" : ""}
                    </span>{" "}
                    detected
                  </>
                )}
                . Any missing fields can be filled in the editor.
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-soft)] p-4">
                <h4 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider mb-3">
                  Link Client (Optional)
                </h4>
                <ClientPicker
                  clients={clients}
                  value={selectedClientId}
                  onChange={setSelectedClientId}
                  onClientCreated={(client) =>
                    setClients((prev) => [...prev, client])
                  }
                />
              </div>

              {/* Extracted summary */}
              <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-soft)] px-4 py-1">
                <SummaryRow
                  icon={FileText}
                  label="Title"
                  value={extracted.title}
                />
                <SummaryRow
                  icon={Hash}
                  label="Invoice #"
                  value={extracted.invoice_number_hint}
                />
                <SummaryRow
                  icon={Calendar}
                  label="Issue Date"
                  value={extracted.issue_date}
                />
                <SummaryRow
                  icon={Calendar}
                  label="Due Date"
                  value={extracted.due_date}
                />
                <SummaryRow
                  icon={DollarSign}
                  label="Total"
                  value={
                    extracted.total_amount != null
                      ? String(extracted.total_amount)
                      : null
                  }
                />
                <SummaryRow
                  icon={ListChecks}
                  label="Line Items"
                  value={lineItemCount > 0 ? `${lineItemCount} detected` : null}
                />
              </div>

              {/* Nothing captured fallback */}
              {capturedCount === 0 && lineItemCount === 0 && (
                <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-700 dark:text-amber-400">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="text-sm font-semibold">
                    We couldn't extract structured data from this file. A blank
                    draft will be created — you can fill everything in manually.
                  </p>
                </div>
              )}

              <p className="text-xs text-[var(--text-muted)] text-center leading-relaxed">
                You'll be taken directly to the editor to complete any missing
                details.
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center gap-3 px-6 py-4 border-t border-[var(--border-soft)] shrink-0 bg-[var(--bg-surface)]">
              <button
                onClick={() => setStep("upload")}
                className="flex items-center gap-2 px-4 py-2.5 border border-[var(--border-soft)] rounded-xl text-[var(--text-main)] text-sm font-bold hover:bg-[var(--bg-app)] transition-colors"
              >
                <RefreshCw className="w-4 h-4" /> Re-upload
              </button>
              <button
                onClick={handleCreateDraft}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-primary text-white rounded-xl font-bold hover:opacity-90 transition-opacity"
              >
                <CheckCircle className="w-4 h-4" /> Continue to Editor
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
