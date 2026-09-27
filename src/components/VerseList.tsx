import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getReviewStats, type Card, type ReviewMode } from "../lib/sm2";
import type { CustomGroup } from "../lib/storage";
import { ConfirmDialog } from "./ConfirmDialog";
import { CustomGroupList } from "./CustomGroupList";
import {
  getOrganizedGroups,
  isGroupDue,
  type VerseGroup,
} from "../lib/verseGroups";
import {
  Trash2,
  BookOpen,
  Calendar,
  BarChart3,
  Eye,
  Keyboard,
  Type,
  ChevronDown,
  ChevronUp,
  Layers,
  AlertCircle,
  CheckCircle2,
  GraduationCap,
  Sparkles,
  PlayCircle,
  BookMarked,
} from "lucide-react";

interface VerseListProps {
  cards: Card[];
  onDelete: (id: string) => void;
  onSelect?: (card: Card) => void;
  customGroups: CustomGroup[];
  onStudyGroup: (cardIds: string[], label: string) => void;
  onCreateCustomGroup: (name: string) => void;
  onUpdateCustomGroup: (groupId: string, cardIds: string[]) => void;
  onRenameCustomGroup: (groupId: string, name: string) => void;
  onDeleteCustomGroup: (groupId: string) => void;
}

const modeIcons: Record<ReviewMode, React.ReactNode> = {
  flashcard: <Eye className="w-3 h-3" />,
  typing: <Keyboard className="w-3 h-3" />,
  "first-letter": <Type className="w-3 h-3" />,
};

const modeLabels: Record<ReviewMode, string> = {
  flashcard: "Flashcard",
  typing: "Typing",
  "first-letter": "First Letters",
};

function formatDate(date: Date | null): string {
  if (!date) return "No review scheduled";

  const d = new Date(date);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days < 0) return "Due now";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 7) return `In ${days} days`;
  if (days < 30) return `In ${Math.floor(days / 7)} weeks`;
  return d.toLocaleDateString();
}

function getStatusBadge(card: Card): { text: string; className: string } {
  const now = new Date();
  const nextReview = new Date(card.nextReview);

  if (nextReview <= now) return { text: "Due", className: "bg-destructive/10 text-destructive" };
  if (card.repetitions >= 5) return { text: "Mastered", className: "bg-yv-green-10 text-yv-green-30" };
  if (card.repetitions > 0 || card.lastReviewed) return { text: "Learning", className: "bg-muted text-foreground" };
  return { text: "New", className: "bg-muted text-muted-foreground" };
}

interface GroupCardProps {
  group: VerseGroup;
  onDelete: (id: string) => void;
  onSelect?: (card: Card) => void;
  defaultExpanded?: boolean;
  onStudyGroup: (cardIds: string[], label: string) => void;
}

interface GroupStatsProps {
  stats: ReturnType<typeof getReviewStats>;
}

const statBadges = [
  ["mastered", CheckCircle2, "bg-yv-green-10 text-yv-green-30"],
  ["learning", GraduationCap, "bg-muted text-foreground"],
  ["new", Sparkles, "bg-muted text-muted-foreground"],
] as const;

function GroupStats({ stats }: GroupStatsProps) {
  return (
    <div className="hidden sm:flex items-center gap-1.5">
      {statBadges.map(([name, Icon, colour]) =>
        stats[name] > 0 ? (
          <span
            key={name}
            className={`flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full tabular-nums ${colour}`}
            title={`${stats[name]} ${name}`}
          >
            <Icon className="w-3 h-3" />
            {stats[name]}
          </span>
        ) : null
      )}
    </div>
  );
}

function GroupCard({ group, onDelete, onSelect, defaultExpanded = false, onStudyGroup }: GroupCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [deleteTarget, setDeleteTarget] = useState<Card | null>(null);
  const isDue = isGroupDue(group);
  const stats = getReviewStats(group.cards);
  
  const handleConfirmDelete = () => {
    if (deleteTarget) {
      onDelete(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  if (group.isMiscellaneous) {
    return (
      <>
        <div className="glass p-4">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm text-foreground">Miscellaneous</h3>
            <span className="text-xs text-muted-foreground">({group.cards.length} verses)</span>
          </div>
          <div className="space-y-2">
            {group.cards.map((card, index) => (
              <CardItem
                key={card.id}
                card={card}
                onDelete={() => setDeleteTarget(card)}
                onSelect={onSelect}
                index={index}
                showReference
              />
            ))}
          </div>
        </div>
        <ConfirmDialog
          open={!!deleteTarget}
          title="Delete Verse"
          message={`Remove "${deleteTarget?.reference}" from your collection? This cannot be undone.`}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      </>
    );
  }

  return (
    <>
      <div className="glass overflow-hidden">
        <div
          role="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full p-4 flex items-center justify-between transition-colors cursor-pointer hover:bg-muted/50"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center text-muted-foreground">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-sm font-serif text-foreground">{group.reference}</h3>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">{group.cards.length} verses</span>
                {isDue && (
                  <span className="flex items-center gap-1 font-medium text-destructive">
                    <AlertCircle className="w-3 h-3" />
                    Due
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStudyGroup(group.cards.map((c) => c.id), group.reference);
              }}
              className="btn-primary gap-1 text-xs px-2.5 py-1.5"
            >
              <PlayCircle className="w-3.5 h-3.5" />
              Study
            </button>
            <GroupStats stats={stats} />
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
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
                {group.cards.map((card, index) => (
                  <CardItem
                    key={card.id}
                    card={card}
                    onDelete={() => setDeleteTarget(card)}
                    onSelect={onSelect}
                    index={index}
                    showReference
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Verse"
        message={`Remove "${deleteTarget?.reference}" from your collection? This cannot be undone.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}

interface CardItemProps {
  card: Card;
  onDelete: () => void;
  onSelect?: (card: Card) => void;
  index: number;
  showReference?: boolean;
}

function CardItem({ card, onDelete, onSelect, index, showReference = false }: CardItemProps) {
  const status = getStatusBadge(card);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 8) * 0.02, duration: 0.15 }}
      className={`tile p-3 ${onSelect ? "tile-interactive" : ""}`}
      onClick={() => onSelect?.(card)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {showReference && (
              <h4 className="font-semibold text-sm truncate font-serif text-foreground">
                {card.reference}
              </h4>
            )}
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.className}`}>
              {status.text}
            </span>
          </div>
          <p className="text-sm line-clamp-2 mb-1.5 verse-text text-muted-foreground">
            {card.text}
          </p>
          <div className="flex items-center gap-3 text-xs flex-wrap text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(card.nextReview)}
            </span>
            <span className="flex items-center gap-1 tabular-nums">
              <BarChart3 className="w-3 h-3" />
              {card.repetitions} review{card.repetitions !== 1 ? "s" : ""}
            </span>
            <span>{card.translation}</span>
            {!!card.modesUsed?.length && (
              <div className="flex items-center gap-1">
                {card.modesUsed.map((mode) => (
                  <span
                    key={mode}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground"
                    title={modeLabels[mode]}
                  >
                    {modeIcons[mode]}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="ml-2 p-1.5 rounded-lg transition-colors text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          aria-label={`Delete ${card.reference}`}
          title="Delete verse"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

export function VerseList({
  cards,
  onDelete,
  onSelect,
  customGroups,
  onStudyGroup,
  onCreateCustomGroup,
  onUpdateCustomGroup,
  onRenameCustomGroup,
  onDeleteCustomGroup,
}: VerseListProps) {
  const [activeListTab, setActiveListTab] = useState<"groups" | "collections">("groups");

  const { sequentialGroups, miscellaneousGroup } = getOrganizedGroups(cards);
  const sortedSequentialGroups = [...sequentialGroups].sort(
    (a, b) => Number(isGroupDue(b)) - Number(isGroupDue(a))
  );

  if (cards.length === 0 && activeListTab === "groups") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-16"
      >
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
          <BookOpen className="w-10 h-10 text-muted-foreground" />
        </div>
        <p className="text-lg font-medium text-foreground">No verses yet</p>
        <p className="text-sm mt-1 text-muted-foreground">
          Add your first verse to get started
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 p-1 rounded-xl bg-muted">
        <button
          onClick={() => setActiveListTab("groups")}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeListTab === "groups"
              ? "bg-background text-foreground shadow-sm font-bold"
              : "text-muted-foreground"
          }`}
        >
          Scripture Groups
        </button>
        <button
          onClick={() => setActiveListTab("collections")}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
            activeListTab === "collections"
              ? "bg-background text-foreground shadow-sm font-bold"
              : "text-muted-foreground"
          }`}
        >
          <BookMarked className="w-3.5 h-3.5" />
          My Collections
          {customGroups.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-muted text-foreground">
              {customGroups.length}
            </span>
          )}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeListTab === "groups" ? (
          <motion.div
            key="groups"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.15 }}
            className="space-y-4"
          >
            {sortedSequentialGroups.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                onDelete={onDelete}
                onSelect={onSelect}
                onStudyGroup={onStudyGroup}
              />
            ))}

            {miscellaneousGroup && (
              <GroupCard
                group={miscellaneousGroup}
                onDelete={onDelete}
                onSelect={onSelect}
                onStudyGroup={onStudyGroup}
                defaultExpanded={true}
              />
            )}
          </motion.div>
        ) : (
          <motion.div
            key="collections"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.15 }}
          >
            <CustomGroupList
              groups={customGroups}
              allCards={cards}
              onStudyGroup={onStudyGroup}
              onCreate={onCreateCustomGroup}
              onUpdate={onUpdateCustomGroup}
              onRename={onRenameCustomGroup}
              onDelete={onDeleteCustomGroup}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
