import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Card } from "../lib/sm2";
import type { CustomGroup } from "../lib/storage";
import { ConfirmDialog } from "./ConfirmDialog";
import {
  BookMarked,
  PlayCircle,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Search,
  Users,
  AlertCircle,
} from "lucide-react";

interface VersePickerProps {
  allCards: Card[];
  currentIds: string[];
  onSave: (ids: string[]) => void;
  onCancel: () => void;
}

function VersePicker({ allCards, currentIds, onSave, onCancel }: VersePickerProps) {
  const [selected, setSelected] = useState(() => new Set(currentIds));
  const [search, setSearch] = useState("");

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  const query = search.toLowerCase();
  const filtered = allCards.filter(
    (c) =>
      c.reference.toLowerCase().includes(query) ||
      c.text.toLowerCase().includes(query)
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        role="dialog"
        aria-modal="true"
        aria-label="Select verses"
        onClick={(e) => e.stopPropagation()}
        className="glass max-sm:rounded-b-none w-full max-w-lg flex flex-col max-h-[88vh] sm:max-h-[80vh]"
      >
        <div className="p-4 border-b border-border/60 flex items-center justify-between">
          <h3 className="font-bold text-lg text-foreground">Select Verses</h3>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by reference or text…"
              autoFocus
              className="w-full pl-9 pr-3 py-2 bg-input border border-border rounded-xl text-sm focus:ring-2 focus:ring-ring focus:border-transparent outline-none text-foreground"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No verses found</p>
          ) : (
            filtered.map((card) => {
              const isSelected = selected.has(card.id);
              return (
                <button
                  key={card.id}
                  onClick={() => toggle(card.id)}
                  className={`tile tile-interactive w-full text-left p-3 ${
                    isSelected ? "border-foreground bg-muted" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        isSelected ? "border-foreground bg-foreground" : "border-border"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate text-foreground">
                        {card.reference}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-1 verse-text">
                        {card.text}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="p-4 border-t border-border/60 flex gap-3">
          <button onClick={onCancel} className="btn-muted flex-1 py-2.5">
            Cancel
          </button>
          <button onClick={() => onSave([...selected])} className="btn-primary flex-1 py-2.5 tabular-nums">
            Save · {selected.size} verse{selected.size !== 1 ? "s" : ""}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

interface CustomGroupCardProps {
  group: CustomGroup;
  allCards: Card[];
  onStudy: () => void;
  onUpdate: (cardIds: string[]) => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}

function CustomGroupCard({
  group,
  allCards,
  onStudy,
  onUpdate,
  onRename,
  onDelete,
}: CustomGroupCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [nameInput, setNameInput] = useState(group.name);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const groupCards = allCards.filter((c) => group.cardIds.includes(c.id));
  const dueCount = groupCards.filter((c) => new Date(c.nextReview) <= new Date()).length;

  const saveName = () => {
    if (nameInput.trim()) onRename(nameInput.trim());
    setRenaming(false);
  };

  const cancelRename = () => {
    setRenaming(false);
    setNameInput(group.name);
  };

  return (
    <>
      <div className="glass overflow-hidden">
        <div className="p-4 flex items-center gap-3">
          <div className="flex items-center justify-center flex-shrink-0 text-muted-foreground">
            <BookMarked className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0">
            {renaming ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveName();
                    if (e.key === "Escape") cancelRename();
                  }}
                  autoFocus
                  className="flex-1 px-2 py-1 text-sm border border-border rounded-lg focus:ring-2 focus:ring-ring outline-none bg-background text-foreground"
                />
                <button
                  onClick={saveName}
                  className="p-1 text-yv-green-30 hover:bg-yv-green-10 rounded"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={cancelRename}
                  className="p-1 text-muted-foreground hover:bg-muted rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <h3 className="font-bold truncate text-foreground">{group.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {groupCards.length} verse{groupCards.length !== 1 ? "s" : ""}
                  {dueCount > 0 && (
                    <span className="text-destructive font-medium ml-1.5 inline-flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {dueCount} due
                    </span>
                  )}
                </p>
              </>
            )}
          </div>

          {!renaming && (
            <div className="flex items-center gap-1.5">
              {groupCards.length > 0 && (
                <button onClick={onStudy} className="btn-primary gap-1 text-xs px-2.5 py-1.5">
                  <PlayCircle className="w-3.5 h-3.5" />
                  Study
                </button>
              )}
              <button
                onClick={() => setRenaming(true)}
                className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground"
                title="Rename"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="p-1.5 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors text-muted-foreground"
                title="Delete collection"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsExpanded((e) => !e)}
                className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground"
              >
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
            </div>
          )}
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-border"
            >
              <div className="p-3 space-y-2">
                {groupCards.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-3">
                    No verses yet — click "Edit verses" to add some
                  </p>
                ) : (
                  groupCards.map((card) => (
                    <div
                      key={card.id}
                      className="tile flex items-center justify-between px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate text-foreground">
                          {card.reference}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-1 verse-text">
                          {card.text}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          onUpdate(group.cardIds.filter((id) => id !== card.id))
                        }
                        className="ml-2 p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors flex-shrink-0"
                        title="Remove from collection"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}

                <button
                  onClick={() => setShowPicker(true)}
                  className="w-full py-2 border-2 border-dashed border-border rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 hover:bg-muted text-muted-foreground"
                >
                  <Plus className="w-4 h-4" />
                  Edit verses
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showPicker && (
          <VersePicker
            allCards={allCards}
            currentIds={group.cardIds}
            onSave={(ids) => {
              onUpdate(ids);
              setShowPicker(false);
            }}
            onCancel={() => setShowPicker(false)}
          />
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete Collection"
        message={`Delete "${group.name}"? Your verses won't be deleted — only this collection.`}
        onConfirm={() => {
          setConfirmDelete(false);
          onDelete();
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}

interface CustomGroupListProps {
  groups: CustomGroup[];
  allCards: Card[];
  onStudyGroup: (cardIds: string[], label: string) => void;
  onCreate: (name: string) => void;
  onUpdate: (groupId: string, cardIds: string[]) => void;
  onRename: (groupId: string, name: string) => void;
  onDelete: (groupId: string) => void;
}

export function CustomGroupList({
  groups,
  allCards,
  onStudyGroup,
  onCreate,
  onUpdate,
  onRename,
  onDelete,
}: CustomGroupListProps) {
  const [newGroupName, setNewGroupName] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = () => {
    const name = newGroupName.trim();
    if (!name) return;
    onCreate(name);
    setNewGroupName("");
    setCreating(false);
  };

  const cancelCreate = () => {
    setCreating(false);
    setNewGroupName("");
  };

  if (groups.length === 0 && !creating) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
          <Users className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="font-medium text-foreground">No collections yet</p>
        <p className="text-sm mt-1 mb-5 text-muted-foreground">
          Create a collection to study a curated set of verses
        </p>
        <button onClick={() => setCreating(true)} className="btn-primary px-5 py-2.5 shadow-sm">
          <Plus className="w-4 h-4" />
          New Collection
        </button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <CustomGroupCard
          key={group.id}
          group={group}
          allCards={allCards}
          onStudy={() => onStudyGroup(group.cardIds, group.name)}
          onUpdate={(cardIds) => onUpdate(group.id, cardIds)}
          onRename={(name) => onRename(group.id, name)}
          onDelete={() => onDelete(group.id)}
        />
      ))}

      {creating ? (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl border-2 border-dashed border-border bg-muted/50"
        >
          <p className="text-sm font-medium mb-2 text-foreground">New Collection</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") cancelCreate();
              }}
              placeholder="e.g. Sermon on the Mount, Psalms of comfort…"
              autoFocus
              className="flex-1 px-3 py-2 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-ring outline-none text-foreground"
            />
            <button
              onClick={handleCreate}
              disabled={!newGroupName.trim()}
              className="btn-primary px-3 py-2"
            >
              Create
            </button>
            <button
              onClick={cancelCreate}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="w-full py-3 border-2 border-dashed border-border rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 hover:bg-muted text-muted-foreground"
        >
          <Plus className="w-4 h-4" />
          New Collection
        </button>
      )}
    </div>
  );
}
