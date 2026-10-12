import React, { useEffect, useRef, useState } from "react";
import {
  FileText,
  Upload,
  Trash2,
  ExternalLink,
  Loader2,
  Paperclip,
  X,
} from "lucide-react";
import { AttachmentService, AttachmentTarget } from "../api";
import { useNotification } from "../context/NotificationContext";
import { compressImage } from "../utils/compressImage";
import { cn } from "../utils";

export interface AttachmentKindOption {
  value: string;
  label: string;
}

interface Attachment {
  id: number;
  kind: string;
  url: string | null;
  original_name: string;
  size: number;
  is_pdf: boolean;
  uploaded_by_name: string | null;
  created_at: string;
}

interface AttachmentsPanelProps {
  target: AttachmentTarget;
  objectId: number;
  kinds: AttachmentKindOption[];
  /** Called with the new count whenever files are added or removed. */
  onCountChange?: (count: number) => void;
}

const ACCEPT =
  "image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf";

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/** Upload, list, preview and delete receipts/invoices for one record. */
export function AttachmentsPanel({
  target,
  objectId,
  kinds,
  onCountChange,
}: AttachmentsPanelProps) {
  const { showNotification, showConfirm } = useNotification();
  const [items, setItems] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState(kinds[0]?.value || "other");
  const [uploads, setUploads] = useState<{ name: string; progress: number }[]>(
    [],
  );
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const kindLabel = (value: string) =>
    kinds.find((k) => k.value === value)?.label || value;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    AttachmentService.list(target, objectId)
      .then((res) => {
        if (cancelled) return;
        setItems(res.data);
        onCountChange?.(res.data.length);
      })
      .catch((e) => console.error("Failed to load attachments", e))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, objectId]);

  const handleFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    for (const original of list) {
      const entry = { name: original.name, progress: 0 };
      setUploads((u) => [...u, entry]);
      try {
        const file = await compressImage(original);
        const res = await AttachmentService.upload(
          target,
          objectId,
          kind,
          file,
          (p) =>
            setUploads((u) =>
              u.map((x) => (x === entry ? { ...x, progress: p } : x)),
            ),
        );
        setItems((prev) => {
          const next = [res.data, ...prev];
          onCountChange?.(next.length);
          return next;
        });
      } catch (e: any) {
        console.error(e);
        const detail = e.response?.data;
        const msg =
          (detail &&
            typeof detail === "object" &&
            Object.values(detail).flat().filter(Boolean).join(" ")) ||
          `Failed to upload ${original.name}`;
        showNotification(String(msg), "error");
      } finally {
        setUploads((u) => u.filter((x) => x !== entry));
      }
    }
  };

  const handleDelete = (item: Attachment) => {
    showConfirm({
      title: "Delete file",
      message: `Delete "${item.original_name}"? This cannot be undone.`,
      type: "danger",
      confirmText: "Delete",
      onConfirm: async () => {
        try {
          await AttachmentService.delete(item.id);
          setItems((prev) => {
            const next = prev.filter((x) => x.id !== item.id);
            onCountChange?.(next.length);
            return next;
          });
        } catch (e) {
          console.error(e);
          showNotification("Failed to delete file.", "error");
        }
      },
    });
  };

  return (
    <div className="space-y-4">
      {kinds.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {kinds.map((k) => (
            <button
              key={k.value}
              type="button"
              onClick={() => setKind(k.value)}
              className={cn(
                "px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors",
                kind === k.value
                  ? "bg-brand-primary border-brand-primary text-white"
                  : "bg-[var(--bg-app)] border-[var(--border-soft)] text-[var(--text-muted)] hover:text-[var(--text-main)]",
              )}
            >
              {k.label}
            </button>
          ))}
        </div>
      )}

      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) =>
          (e.key === "Enter" || e.key === " ") && inputRef.current?.click()
        }
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center gap-2 p-6 border-2 border-dashed rounded-2xl cursor-pointer text-center transition-colors",
          dragging
            ? "border-brand-primary bg-brand-primary/5"
            : "border-[var(--border-soft)] hover:border-brand-primary/50 hover:bg-[var(--bg-app)]",
        )}
      >
        <Upload className="w-6 h-6 text-brand-primary" />
        <p className="text-sm font-semibold text-[var(--text-main)]">
          Upload {kindLabel(kind).toLowerCase()}
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          Drop files here or click to browse · JPG, PNG, WebP, HEIC or PDF ·
          photos are compressed automatically
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {uploads.map((u, i) => (
        <div
          key={`${u.name}-${i}`}
          className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-app)]"
        >
          <Loader2 className="w-4 h-4 animate-spin text-brand-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-[var(--text-main)] truncate">{u.name}</p>
            <div className="h-1.5 mt-1.5 rounded-full bg-[var(--border-soft)] overflow-hidden">
              <div
                className="h-full bg-brand-primary transition-all"
                style={{ width: `${u.progress}%` }}
              />
            </div>
          </div>
        </div>
      ))}

      {loading ? (
        <p className="text-sm text-[var(--text-muted)] text-center py-4">
          Loading files...
        </p>
      ) : items.length === 0 && uploads.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)] text-center py-2">
          No files attached yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-app)]"
            >
              <a
                href={item.url || undefined}
                target="_blank"
                rel="noreferrer"
                className="w-12 h-12 rounded-lg overflow-hidden bg-[var(--bg-surface)] border border-[var(--border-soft)] flex items-center justify-center shrink-0"
              >
                {item.is_pdf || !item.url ? (
                  <FileText className="w-5 h-5 text-rose-500" />
                ) : (
                  <img
                    src={item.url}
                    alt={item.original_name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                )}
              </a>
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-medium text-[var(--text-main)] truncate"
                  title={item.original_name}
                >
                  {item.original_name}
                </p>
                <p className="text-xs text-[var(--text-muted)] truncate">
                  {[
                    kindLabel(item.kind),
                    formatSize(item.size),
                    new Date(item.created_at).toLocaleDateString(),
                    item.uploaded_by_name,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  title="Open"
                  className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface)] rounded-lg transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
              <button
                type="button"
                onClick={() => handleDelete(item)}
                title="Delete"
                className="p-2 text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface AttachmentsModalProps extends AttachmentsPanelProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
}

/** AttachmentsPanel in a modal with fixed header, for row "Receipts" actions. */
export function AttachmentsModal({
  title,
  subtitle,
  onClose,
  ...panel
}: AttachmentsModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-[var(--bg-app)]/80 backdrop-blur-sm">
      <div className="bg-[var(--bg-surface)] rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden border border-[var(--border-soft)] shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between gap-3 p-6 border-b border-[var(--border-soft)] bg-[var(--bg-app)]/50 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-brand-primary/10 text-brand-primary shrink-0">
              <Paperclip className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-[var(--text-main)] truncate">
                {title}
              </h2>
              {subtitle && (
                <p className="text-xs text-[var(--text-muted)] truncate">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-app)] rounded-full transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1 min-h-0">
          <AttachmentsPanel {...panel} />
        </div>
        <div className="p-6 border-t border-[var(--border-soft)] flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-brand-primary text-white font-bold rounded-xl hover:opacity-90 transition-opacity"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
