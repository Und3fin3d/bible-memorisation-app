import { useMemo } from "react";
import type { Card } from "../lib/sm2";
import type { VerseGroup } from "../lib/verseGroups";
import type { CustomGroup, ReviewSelection } from "../lib/storage";
import { getDueCards } from "../lib/sm2";
import {
  FolderOpen,
  Layers,
  ChevronRight,
  CheckCircle2,
  History,
} from "lucide-react";

export type { ReviewSelection } from "../lib/storage";

interface ReviewSelectionScreenProps {
  cards: Card[];
  customGroups: CustomGroup[];
  sequentialGroups: VerseGroup[];
  lastSelection: ReviewSelection | null;
  onSelect: (selection: ReviewSelection) => void;
}

interface SelectionOption {
  type: "all" | "custom-group" | "sequential-group";
  id?: string;
  name: string;
  dueCount: number;
  totalCount: number;
  isLastUsed?: boolean;
}

function LastUsedChip() {
  return (
    <span className="text-xs font-normal flex items-center gap-0.5 text-muted-foreground font-sans whitespace-nowrap">
      <History className="w-2.5 h-2.5" />
      Last used
    </span>
  );
}

interface SelectionRowProps {
  option: SelectionOption;
  icon: React.ReactNode;
  serifName?: boolean;
  onSelect: (option: SelectionOption) => void;
}

function SelectionRow({ option, icon, serifName = false, onSelect }: SelectionRowProps) {
  const done = option.dueCount === 0;
  return (
    <button
      onClick={() => onSelect(option)}
      disabled={done}
      className={`choice-row w-full p-3.5 text-left ${
        done
          ? "opacity-50 cursor-not-allowed"
          : `tile-interactive ${option.isLastUsed ? "border-foreground" : ""}`
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center flex-shrink-0 text-muted-foreground">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={`font-semibold text-sm flex items-center gap-1.5 text-foreground ${serifName ? "font-serif" : ""}`}>
            <span className="truncate">{option.name}</span>
            {option.isLastUsed && <LastUsedChip />}
          </h4>
          <p className="text-xs mt-0.5 text-muted-foreground font-sans tabular-nums">
            {option.dueCount} due · {option.totalCount} total
          </p>
        </div>
        {done ? (
          <CheckCircle2 className="w-5 h-5 text-yv-green-30" />
        ) : (
          <span className="text-sm font-medium text-muted-foreground tabular-nums">
            {option.dueCount}
          </span>
        )}
      </div>
    </button>
  );
}

export function ReviewSelectionScreen({
  cards,
  customGroups,
  sequentialGroups,
  lastSelection,
  onSelect,
}: ReviewSelectionScreenProps) {
  const options = useMemo(() => {
    const opts: SelectionOption[] = [];

    opts.push({
      type: "all",
      name: "Study All Verses",
      dueCount: getDueCards(cards).length,
      totalCount: cards.length,
      isLastUsed: lastSelection?.type === "all",
    });

    customGroups.forEach((group) => {
      const groupCards = cards.filter((c) => group.cardIds.includes(c.id));
      const groupDueCards = getDueCards(groupCards);

      opts.push({
        type: "custom-group",
        id: group.id,
        name: group.name,
        dueCount: groupDueCards.length,
        totalCount: groupCards.length,
        isLastUsed: lastSelection?.type === "custom-group" && lastSelection.id === group.id,
      });
    });

    sequentialGroups.forEach((group) => {
      const groupDueCount = group.cards.filter(
        (c) => new Date(c.nextReview) <= new Date()
      ).length;

      if (group.isMiscellaneous && groupDueCount === 0) return;

      opts.push({
        type: "sequential-group",
        id: group.reference,
        name: group.reference,
        dueCount: groupDueCount,
        totalCount: group.cards.length,
        isLastUsed: lastSelection?.type === "sequential-group" && lastSelection.id === group.reference,
      });
    });

    return opts;
  }, [cards, customGroups, sequentialGroups, lastSelection]);

  const allOption = options.find((o) => o.type === "all")!;
  const customGroupOptions = options.filter((o) => o.type === "custom-group");
  const sequentialGroupOptions = options.filter((o) => o.type === "sequential-group");

  const handleSelect = (option: SelectionOption) => {
    onSelect({
      type: option.type,
      id: option.id,
      name: option.name,
    });
  };

  return (
    <div className="glass max-w-2xl mx-auto">
      <div className="px-6 pt-6 pb-4 border-b border-border/60">
        <h2 className="text-2xl font-semibold mb-0.5 text-foreground font-serif">
          What would you like to study?
        </h2>
        <p className="text-sm text-muted-foreground">
          Choose which verses to review today
        </p>
      </div>

      <div className="p-6 space-y-5">
        <button
          onClick={() => handleSelect(allOption)}
          className={`choice-row w-full p-4 text-left bg-muted/60 ${
            allOption.isLastUsed ? "border-foreground" : ""
          }`}
        >
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <h3 className="font-semibold text-base flex flex-wrap items-center gap-2 text-foreground">
                {allOption.name}
                {allOption.isLastUsed && <LastUsedChip />}
              </h3>
              <p className="text-xs mt-0.5 text-muted-foreground tabular-nums">
                {allOption.dueCount} due · {allOption.totalCount} total
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </button>

        {customGroupOptions.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-2 flex items-center gap-1.5 text-muted-foreground">
              <FolderOpen className="w-3.5 h-3.5" />
              Collections
            </h3>
            <div className="space-y-2">
              {customGroupOptions.map((option) => (
                <SelectionRow
                  key={option.id}
                  option={option}
                  icon={<FolderOpen className="w-5 h-5" />}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          </div>
        )}

        {sequentialGroupOptions.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-2 flex items-center gap-1.5 text-muted-foreground">
              <Layers className="w-3.5 h-3.5" />
              By Book / Passage
            </h3>
            <div className="space-y-2">
              {sequentialGroupOptions.map((option) => (
                <SelectionRow
                  key={option.id}
                  option={option}
                  icon={<Layers className="w-5 h-5" />}
                  serifName
                  onSelect={handleSelect}
                />
              ))}
            </div>
          </div>
        )}

        {customGroupOptions.length === 0 && (
          <div className="pt-5 border-t border-border/60">
            <p className="text-sm font-medium text-foreground">No collections yet</p>
            <p className="text-sm mt-1 text-muted-foreground">
              Create collections in the Verses tab to organise your verses
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
