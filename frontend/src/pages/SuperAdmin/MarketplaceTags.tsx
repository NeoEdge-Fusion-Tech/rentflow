import React, { useEffect, useState } from "react";
import {
  Tags,
  Plus,
  Search,
  X,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  EyeOff,
  Eye,
} from "lucide-react";
import { useNotification } from "../../context/NotificationContext";
import { MarketplaceTagService } from "../../api";
import { ActionMenu } from "../../components/ActionMenu";
import { cn } from "../../utils";

interface Tag {
  id: number;
  name: string;
  slug: string;
  description: string;
  sort_order: number;
  is_active: boolean;
  product_count: number;
}

const emptyForm = { name: "", description: "" };

export function MarketplaceTags() {
  const { showNotification, showConfirm } = useNotification();
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Tag | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      setIsLoading(true);
      const res = await MarketplaceTagService.getAll({ all: "true" });
      setTags(res.data.results || res.data);
    } catch (e) {
      console.error("Failed to fetch marketplace tags", e);
    } finally {
      setIsLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setIsModalOpen(true);
  };

  const openEdit = (tag: Tag) => {
    setEditing(tag);
    setForm({ name: tag.name, description: tag.description || "" });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    try {
      setIsSaving(true);
      if (editing) {
        await MarketplaceTagService.update(editing.id, {
          name: form.name.trim(),
          description: form.description.trim(),
        });
        showNotification("Tag updated", "success");
      } else {
        const nextOrder = tags.length
          ? Math.max(...tags.map((t) => t.sort_order)) + 1
          : 0;
        await MarketplaceTagService.create({
          name: form.name.trim(),
          description: form.description.trim(),
          sort_order: nextOrder,
          is_active: true,
        });
        showNotification("Tag added", "success");
      }
      setIsModalOpen(false);
      fetchTags();
    } catch (err: any) {
      console.error(err);
      showNotification(
        err.response?.data?.name?.[0] || "Failed to save tag.",
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const toggleActive = async (tag: Tag) => {
    try {
      await MarketplaceTagService.update(tag.id, { is_active: !tag.is_active });
      showNotification(
        tag.is_active
          ? `"${tag.name}" hidden from the marketplace`
          : `"${tag.name}" is live on the marketplace`,
        "success",
      );
      fetchTags();
    } catch (e) {
      console.error(e);
      showNotification("Failed to update tag.", "error");
    }
  };

  const handleDelete = (tag: Tag) => {
    showConfirm({
      title: "Delete Tag",
      message:
        tag.product_count > 0
          ? `"${tag.name}" is used on ${tag.product_count} product(s). Deleting it removes it from all of them. To keep it on those products but stop showing it, deactivate it instead.`
          : `Delete "${tag.name}"? This cannot be undone.`,
      type: "danger",
      confirmText: "Delete",
      onConfirm: async () => {
        try {
          await MarketplaceTagService.delete(tag.id);
          showNotification("Tag deleted", "success");
          fetchTags();
        } catch (e) {
          console.error(e);
          showNotification("Failed to delete tag.", "error");
        }
      },
    });
  };

  // Swap sort order with the neighbour above/below.
  const move = async (index: number, dir: -1 | 1) => {
    const other = tags[index + dir];
    const tag = tags[index];
    if (!other) return;
    const reordered = [...tags];
    reordered[index] = other;
    reordered[index + dir] = tag;
    setTags(reordered);
    try {
      await Promise.all(
        reordered.map((t, i) =>
          t.sort_order === i
            ? null
            : MarketplaceTagService.update(t.id, { sort_order: i }),
        ),
      );
      fetchTags();
    } catch (e) {
      console.error(e);
      showNotification("Failed to reorder tags.", "error");
      fetchTags();
    }
  };

  const query = searchQuery.trim().toLowerCase();
  const visible = query
    ? tags.filter((t) => t.name.toLowerCase().includes(query))
    : tags;
  const activeCount = tags.filter((t) => t.is_active).length;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-main)]">
            Marketplace Tags
          </h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">
            The shared categories customers filter by on the event marketplace.
            Vendors pick from these when listing products.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="bg-brand-primary text-brand-accent px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-brand-primary/20 shrink-0"
        >
          <Plus className="w-5 h-5" /> Add Tag
        </button>
      </div>

      <div className="bg-[var(--bg-surface)] p-4 rounded-2xl border border-[var(--border-soft)] shadow-sm flex items-center gap-3">
        <Search className="w-5 h-5 text-[var(--text-muted)] shrink-0" />
        <input
          type="text"
          placeholder="Search tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)]"
        />
        <span className="text-xs font-bold text-[var(--text-muted)] whitespace-nowrap">
          {activeCount} active · {tags.length} total
        </span>
      </div>

      <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-soft)] shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-[var(--text-muted)] text-sm">
            Loading tags...
          </div>
        ) : visible.length === 0 ? (
          <div className="p-12 text-center">
            <Tags className="w-10 h-10 mx-auto text-[var(--text-muted)] opacity-50 mb-3" />
            <p className="text-sm text-[var(--text-muted)]">
              {query ? "No tags match your search." : "No tags yet."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border-subtle)]">
            {visible.map((tag) => {
              const index = tags.findIndex((t) => t.id === tag.id);
              return (
                <li
                  key={tag.id}
                  className={cn(
                    "flex items-center gap-4 px-5 py-4",
                    !tag.is_active && "opacity-60",
                  )}
                >
                  {!query && (
                    <div className="flex flex-col shrink-0">
                      <button
                        onClick={() => move(index, -1)}
                        disabled={index === 0}
                        className="p-0.5 text-[var(--text-muted)] hover:text-[var(--text-main)] disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => move(index, 1)}
                        disabled={index === tags.length - 1}
                        className="p-0.5 text-[var(--text-muted)] hover:text-[var(--text-main)] disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-[var(--text-main)]">
                        {tag.name}
                      </p>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                          tag.is_active
                            ? "bg-emerald-500/10 text-emerald-500"
                            : "bg-[var(--bg-app)] text-[var(--text-muted)]",
                        )}
                      >
                        {tag.is_active ? "Active" : "Hidden"}
                      </span>
                    </div>
                    {tag.description && (
                      <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-1">
                        {tag.description}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-[var(--text-muted)] whitespace-nowrap tabular-nums">
                    {tag.product_count} product
                    {tag.product_count === 1 ? "" : "s"}
                  </span>
                  <ActionMenu
                    label="Tag actions"
                    items={[
                      {
                        label: "Edit",
                        icon: Edit2,
                        onClick: () => openEdit(tag),
                      },
                      {
                        label: tag.is_active
                          ? "Hide from marketplace"
                          : "Activate",
                        icon: tag.is_active ? EyeOff : Eye,
                        onClick: () => toggleActive(tag),
                      },
                      {
                        label: "Delete",
                        icon: Trash2,
                        danger: true,
                        onClick: () => handleDelete(tag),
                      },
                    ]}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-app)]/80 backdrop-blur-sm">
          <div className="bg-[var(--bg-surface)] rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-[var(--border-soft)]">
            <div className="p-6 border-b border-[var(--border-soft)] flex items-center justify-between bg-[var(--bg-app)]/30 shrink-0">
              <h3 className="text-lg font-bold text-[var(--text-main)]">
                {editing ? "Edit Tag" : "Add Tag"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-[var(--bg-app)] rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-[var(--text-muted)]" />
              </button>
            </div>
            <form
              onSubmit={handleSave}
              className="flex flex-col flex-1 min-h-0"
            >
              <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-muted)] uppercase px-1">
                    Tag Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    autoFocus
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Chairs & Seating"
                    maxLength={100}
                    className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl text-sm focus:border-brand-primary outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-muted)] uppercase px-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    placeholder="Optional hint shown to vendors"
                    maxLength={255}
                    className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl text-sm focus:border-brand-primary outline-none transition-all"
                  />
                </div>
              </div>
              <div className="p-6 border-t border-[var(--border-soft)] flex gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 px-4 bg-[var(--bg-app)] text-[var(--text-muted)] border border-[var(--border-soft)] rounded-xl font-bold transition-all hover:opacity-80"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !form.name.trim()}
                  className="flex-1 py-3 px-4 bg-brand-primary text-brand-accent rounded-xl font-bold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-primary/20"
                >
                  {isSaving
                    ? "Saving..."
                    : editing
                      ? "Save Changes"
                      : "Add Tag"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
