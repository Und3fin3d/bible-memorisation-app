import { useState } from "react";
import { motion } from "framer-motion";
import { Collapsible, Tabs } from "radix-ui";
import { getReviewStats, type Card, type ReviewMode } from "../lib/scheduling";
import type { CustomGroup } from "../lib/storage";
import { getOrganizedGroups, isGroupDue, type VerseGroup } from "../lib/verseGroups";
import { ConfirmDialog, Dialog, DialogContent, DialogTitle } from "./ui";
import { Trash2, Eye, Keyboard, Type, ChevronDown, ChevronUp, Plus, Pencil, Check, X, Search } from "lucide-react";

type StudyGroupAction = (cardIds: string[], label: string) => void;

const modes: Record<ReviewMode, { label: string; icon: React.ReactNode }> = {
  flashcard: { label: "Flashcard", icon: <Eye className="w-3 h-3 inline" /> },
  typing: { label: "Typing", icon: <Keyboard className="w-3 h-3 inline" /> },
  "first-letter": { label: "First letters", icon: <Type className="w-3 h-3 inline" /> },
};

const statNames = ["mastered", "learning", "new"] as const;
const tabClass = "flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-lg text-muted-foreground transition-colors hover:text-foreground data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-[0_1px_2px_oklch(0_0_0/0.08)]";
const plainIconClass = "p-2 rounded-lg transition-colors text-muted-foreground hover:bg-muted hover:text-foreground";
const dangerIconClass = "rounded-lg transition-colors text-muted-foreground hover:text-destructive hover:bg-destructive/10";

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

function formatDate(date: Date) {
  const d = new Date(date);
  const days = Math.floor((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return "Due now";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 7) return `In ${days} days`;
  if (days < 30) return `In ${Math.floor(days / 7)} weeks`;
  return d.toLocaleDateString();
}

function getStatusBadge(card: Card) {
  if (new Date(card.nextReview) <= new Date()) return { text: "Due", className: "text-foreground" };
  if (card.repetitions >= 5) return { text: "Mastered", className: "text-yv-green-30" };
  if (card.repetitions > 0 || card.lastReviewed) return { text: "Learning", className: "text-muted-foreground" };
  return { text: "New", className: "text-muted-foreground" };
}

function DueMark({ label = "Due" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 font-medium text-foreground">
      <span className="w-1.5 h-1.5 rounded-full bg-yv-orange-30" aria-hidden="true" />
      {label}
    </span>
  );
}

function VerseSummary({ card }: { card: Card }) {
  return (
    <div className="min-w-0">
      <p className="font-semibold text-sm truncate font-serif text-foreground">{card.reference}</p>
      <p className="text-xs text-muted-foreground line-clamp-1 verse-text">{card.text}</p>
    </div>
  );
}

interface CardItemProps {
  card: Card;
  onDelete: () => void;
}

function CardItem({ card, onDelete }: CardItemProps) {
  const status = getStatusBadge(card);
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-0.5">
          <h4 className="font-semibold text-sm truncate font-serif text-foreground">{card.reference}</h4>
          <span className={`text-xs font-medium ${status.className}`}>{status.text === "Due" ? <DueMark /> : status.text}</span>
        </div>
        <p className="text-sm line-clamp-2 mb-1 verse-text text-muted-foreground">{card.text}</p>
        <p className="flex items-center gap-x-1.5 text-xs flex-wrap text-muted-foreground tabular-nums">
          <span>{formatDate(card.nextReview)}</span>
          <span aria-hidden="true">·</span>
          <span>{plural(card.repetitions, "review")}</span>
          <span aria-hidden="true">·</span>
          <span>{card.translation}</span>
          {card.modesUsed.map((mode) => (
            <span key={mode} title={modes[mode].label} aria-label={modes[mode].label} className="ml-1">{modes[mode].icon}</span>
          ))}
        </p>
      </div>
      <button onClick={onDelete} className={`${dangerIconClass} p-1.5 -mr-1.5`} aria-label={`Delete ${card.reference}`} title="Delete verse">
        <Trash2 className="w-4 h-4" />
      </button>
    </li>
  );
}

function GroupStats({ group }: { group: VerseGroup }) {
  const stats = getReviewStats(group.cards);
  const parts = statNames.filter((name) => stats[name] > 0).map((name) => `${stats[name]} ${name}`);
  return parts.length > 0 && <span className="hidden sm:inline">· {parts.join(" · ")}</span>;
}

interface GroupCardProps {
  group: VerseGroup;
  onDelete: (id: string) => void;
  onStudyGroup: StudyGroupAction;
}

function GroupCard({ group, onDelete, onStudyGroup }: GroupCardProps) {
  const [deleteTarget, setDeleteTarget] = useState<Card | null>(null);

  const verseRows = (
    <ul className="divide-y divide-border">
      {group.cards.map((card) => <CardItem key={card.id} card={card} onDelete={() => setDeleteTarget(card)} />)}
    </ul>
  );

  const deleteDialog = (
    <ConfirmDialog
      open={!!deleteTarget}
      title="Delete verse"
      message={`Delete ${deleteTarget?.reference}? You cannot undo this.`}
      onConfirm={() => {
        onDelete(deleteTarget!.id);
        setDeleteTarget(null);
      }}
      onCancel={() => setDeleteTarget(null)}
    />
  );

  if (group.isMiscellaneous) {
    return (
      <section className="surface">
        <div className="px-4 pt-4 pb-2 flex items-baseline gap-2">
          <h3 className="font-semibold text-sm text-foreground">Miscellaneous</h3>
          <span className="text-xs text-muted-foreground tabular-nums">{group.cards.length} verse{group.cards.length !== 1 ? "s" : ""}</span>
        </div>
        {verseRows}
        {deleteDialog}
      </section>
    );
  }

  return (
    <Collapsible.Root className="surface">
      <div className="flex items-center gap-2 pr-3">
        <Collapsible.Trigger className="group flex-1 min-w-0 flex items-center gap-3 p-4 text-left rounded-2xl hover:bg-muted/50 transition-colors">
          <span className="min-w-0 flex-1">
            <span className="block font-semibold font-serif text-foreground">{group.reference}</span>
            <span className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground tabular-nums">
              <span>{group.cards.length} verse{group.cards.length !== 1 ? "s" : ""}</span>
              {isGroupDue(group) && <>· <DueMark /></>}
              <GroupStats group={group} />
            </span>
          </span>
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 group-data-[state=open]:rotate-180" />
        </Collapsible.Trigger>
        <button onClick={() => onStudyGroup(group.cards.map((c) => c.id), group.reference)} className="btn-muted text-xs px-3 py-1.5">
          Study
        </button>
      </div>
      <Collapsible.Content className="border-t border-border">{verseRows}</Collapsible.Content>
      {deleteDialog}
    </Collapsible.Root>
  );
}

interface VersePickerProps {
  allCards: Card[];
  currentIds: string[];
  onSave: (ids: string[]) => void;
  onCancel: () => void;
}

function VersePicker({ allCards, currentIds, onSave, onCancel }: VersePickerProps) {
  const [selected, setSelected] = useState(() => new Set(currentIds));
  const [search, setSearch] = useState("");
  const query = search.toLowerCase();
  const filtered = allCards.filter((c) => c.reference.toLowerCase().includes(query) || c.text.toLowerCase().includes(query));

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (!next.delete(id)) next.add(id);
    setSelected(next);
  };

  return (
    <>
      <div className="p-4 pr-16">
        <DialogTitle>Choose verses</DialogTitle>
      </div>
      <div className="px-4 pb-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by reference or text…"
            aria-label="Search verses"
            autoFocus
            className="w-full pl-9 pr-3 py-2 bg-input border border-border rounded-xl text-sm focus:ring-2 focus:ring-ring focus:border-transparent outline-none text-foreground"
          />
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-2">
        {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No verses found</p>}
        {filtered.map((card) => {
          const isSelected = selected.has(card.id);
          return (
            <button key={card.id} role="checkbox" aria-checked={isSelected} onClick={() => toggle(card.id)} className="choice-row w-full text-left px-3 py-2.5">
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? "border-foreground bg-foreground" : "border-border"}`}>
                  {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                </div>
                <VerseSummary card={card} />
              </div>
            </button>
          );
        })}
      </div>
      <div className="p-4 border-t border-border flex gap-3">
        <button onClick={onCancel} className="btn-muted flex-1 py-2.5">Cancel</button>
        <button onClick={() => onSave([...selected])} className="btn-primary flex-1 py-2.5 tabular-nums">
          Save · {plural(selected.size, "verse")}
        </button>
      </div>
    </>
  );
}

interface CollectionNameInputProps {
  name: string;
  onRename: (name: string) => void;
  onClose: () => void;
}

function CollectionNameInput({ name, onRename, onClose }: CollectionNameInputProps) {
  const [nameInput, setNameInput] = useState(name);

  const saveName = () => {
    if (nameInput.trim()) onRename(nameInput.trim());
    onClose();
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={nameInput}
        onChange={(e) => setNameInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") saveName();
          if (e.key === "Escape") onClose();
        }}
        autoFocus
        aria-label="Collection name"
        className="flex-1 min-w-0 px-2 py-1 text-sm border border-border rounded-lg focus:ring-2 focus:ring-ring outline-none bg-input text-foreground"
      />
      <button onClick={saveName} className="p-1.5 text-foreground hover:bg-muted rounded-lg" aria-label="Save name">
        <Check className="w-4 h-4" />
      </button>
      <button onClick={onClose} className="p-1.5 text-muted-foreground hover:bg-muted rounded-lg" aria-label="Cancel rename">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

interface CollectionCardProps {
  group: CustomGroup;
  allCards: Card[];
  onStudy: () => void;
  onUpdate: (cardIds: string[]) => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}

function CollectionCard({ group, allCards, onStudy, onUpdate, onRename, onDelete }: CollectionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const groupCards = allCards.filter((c) => group.cardIds.includes(c.id));
  const dueCount = getReviewStats(groupCards).due;

  return (
    <>
      <Collapsible.Root open={isExpanded} onOpenChange={setIsExpanded} className="surface">
        <div className="p-4 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            {renaming ? (
              <CollectionNameInput name={group.name} onRename={onRename} onClose={() => setRenaming(false)} />
            ) : (
              <>
                <h3 className="font-semibold truncate text-foreground">{group.name}</h3>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {plural(groupCards.length, "verse")}
                  {dueCount > 0 && <>{" · "}<DueMark label={`${dueCount} due`} /></>}
                </p>
              </>
            )}
          </div>
          {!renaming && (
            <div className="flex items-center gap-1">
              {groupCards.length > 0 && <button onClick={onStudy} className="btn-muted text-xs px-3 py-1.5 mr-1">Study</button>}
              <button onClick={() => setRenaming(true)} className={plainIconClass} title="Rename" aria-label={`Rename ${group.name}`}>
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setConfirmDelete(true)} className={`${dangerIconClass} p-2`} title="Delete collection" aria-label={`Delete ${group.name}`}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <Collapsible.Trigger className={plainIconClass} aria-label={isExpanded ? "Hide verses" : "Show verses"}>
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Collapsible.Trigger>
            </div>
          )}
        </div>
        <Collapsible.Content className="border-t border-border">
          {groupCards.length === 0 && <p className="text-sm text-muted-foreground px-4 py-4">No verses yet. Select Edit verses to add some.</p>}
          {groupCards.length > 0 && (
            <ul className="divide-y divide-border">
              {groupCards.map((card) => (
                <li key={card.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <VerseSummary card={card} />
                  <button
                    onClick={() => onUpdate(group.cardIds.filter((id) => id !== card.id))}
                    className={`${dangerIconClass} p-1.5 flex-shrink-0`}
                    title="Remove from collection"
                    aria-label={`Remove ${card.reference} from collection`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="p-3 border-t border-border">
            <button onClick={() => setShowPicker(true)} className="btn-ghost w-full">
              <Plus className="w-4 h-4" />
              Edit verses
            </button>
          </div>
        </Collapsible.Content>
      </Collapsible.Root>

      <Dialog open={showPicker} onOpenChange={setShowPicker}>
        <DialogContent sheetOnMobile className="sm:max-w-lg h-[88dvh] sm:h-[80vh]" aria-describedby={undefined}>
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
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete collection"
        message={`Delete "${group.name}"? Your verses stay in your library.`}
        onConfirm={() => {
          setConfirmDelete(false);
          onDelete();
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}

interface CollectionListProps {
  groups: CustomGroup[];
  allCards: Card[];
  onStudyGroup: StudyGroupAction;
  onCreate: (name: string) => void;
  onUpdate: (groupId: string, cardIds: string[]) => void;
  onRename: (groupId: string, name: string) => void;
  onDelete: (groupId: string) => void;
}

function CollectionList({ groups, allCards, onStudyGroup, onCreate, onUpdate, onRename, onDelete }: CollectionListProps) {
  const [newGroupName, setNewGroupName] = useState("");
  const [creating, setCreating] = useState(false);

  const closeCreate = () => {
    setCreating(false);
    setNewGroupName("");
  };

  const handleCreate = () => {
    if (!newGroupName.trim()) return;
    onCreate(newGroupName.trim());
    closeCreate();
  };

  const newButton = (className: string) => (
    <button onClick={() => setCreating(true)} className={className}>
      <Plus className="w-4 h-4" />
      New collection
    </button>
  );

  if (groups.length === 0 && !creating) {
    return (
      <div className="text-center py-12">
        <p className="text-xl font-semibold font-serif text-foreground">No collections yet</p>
        <p className="text-sm mt-1 mb-5 text-muted-foreground">Group verses that you want to study together.</p>
        {newButton("btn-primary px-5 py-2.5")}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <CollectionCard
          key={group.id}
          group={group}
          allCards={allCards}
          onStudy={() => onStudyGroup(group.cardIds, group.name)}
          onUpdate={(cardIds) => onUpdate(group.id, cardIds)}
          onRename={(name) => onRename(group.id, name)}
          onDelete={() => onDelete(group.id)}
        />
      ))}
      {!creating && newButton("btn-muted w-full py-3")}
      {creating && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="surface p-4">
          <label htmlFor="new-collection-name" className="block text-sm font-medium mb-2 text-foreground">New collection</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") closeCreate();
              }}
              placeholder="e.g. Sermon on the Mount, Psalms of comfort…"
              id="new-collection-name"
              autoFocus
              className="flex-1 min-w-0 px-3 py-2 bg-input border border-border rounded-xl text-sm focus:ring-2 focus:ring-ring outline-none text-foreground"
            />
            <button onClick={handleCreate} disabled={!newGroupName.trim()} className="btn-primary px-3 py-2">Create</button>
            <button onClick={closeCreate} className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors" aria-label="Cancel new collection">
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

interface VerseListProps {
  cards: Card[];
  onDelete: (id: string) => void;
  customGroups: CustomGroup[];
  onStudyGroup: StudyGroupAction;
  onCreateCustomGroup: (name: string) => void;
  onUpdateCustomGroup: (groupId: string, cardIds: string[]) => void;
  onRenameCustomGroup: (groupId: string, name: string) => void;
  onDeleteCustomGroup: (groupId: string) => void;
}

export function VerseList({ cards, onDelete, customGroups, onStudyGroup, onCreateCustomGroup, onUpdateCustomGroup, onRenameCustomGroup, onDeleteCustomGroup }: VerseListProps) {
  const [activeListTab, setActiveListTab] = useState("groups");
  const { sequentialGroups, miscellaneousGroup } = getOrganizedGroups(cards);
  const groups = [...sequentialGroups].sort((a, b) => Number(isGroupDue(b)) - Number(isGroupDue(a)));
  if (miscellaneousGroup) groups.push(miscellaneousGroup);

  if (cards.length === 0 && activeListTab === "groups") {
    return (
      <div className="text-center py-16">
        <p className="text-xl font-semibold font-serif text-foreground">No verses yet</p>
        <p className="text-sm mt-1 text-muted-foreground">Add a verse to start.</p>
      </div>
    );
  }

  return (
    <Tabs.Root value={activeListTab} onValueChange={setActiveListTab} className="space-y-4">
      <Tabs.List className="flex gap-1 p-1 rounded-xl bg-muted">
        <Tabs.Trigger value="groups" className={tabClass}>Passages</Tabs.Trigger>
        <Tabs.Trigger value="collections" className={tabClass}>
          Collections
          {customGroups.length > 0 && <span className="text-xs text-muted-foreground tabular-nums">{customGroups.length}</span>}
        </Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="groups" className="space-y-3 outline-none">
        {groups.map((group) => <GroupCard key={group.id} group={group} onDelete={onDelete} onStudyGroup={onStudyGroup} />)}
      </Tabs.Content>
      <Tabs.Content value="collections" className="outline-none">
        <CollectionList
          groups={customGroups}
          allCards={cards}
          onStudyGroup={onStudyGroup}
          onCreate={onCreateCustomGroup}
          onUpdate={onUpdateCustomGroup}
          onRename={onRenameCustomGroup}
          onDelete={onDeleteCustomGroup}
        />
      </Tabs.Content>
    </Tabs.Root>
  );
}
