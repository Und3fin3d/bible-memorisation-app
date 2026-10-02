import { ChevronRight, Check } from "lucide-react";
import type { Card, ReviewMode } from "../lib/scheduling";
import type { VerseGroup } from "../lib/verseGroups";
import type { CustomGroup, ReviewSelection } from "../lib/storage";
import { getDueCards } from "../lib/scheduling";
import { RadioGroup, RadioGroupItem, RadioMark } from "./ui";

type ReviewSelectionScreenProps = {
  cards: Card[];
  customGroups: CustomGroup[];
  sequentialGroups: VerseGroup[];
  lastSelection: ReviewSelection | null;
  onSelect: (selection: ReviewSelection) => void;
};

type ReviewModeSelectorProps = {
  selectedMode: ReviewMode | null;
  onSelectMode: (mode: ReviewMode) => void;
  onStart: () => void;
  scopeLabel?: string;
  scopeCardCount?: number;
};

type SelectionOption = {
  type: "all" | "custom-group" | "sequential-group";
  id?: string;
  name: string;
  dueCount: number;
  totalCount: number;
  isLastUsed: boolean;
};

type SelectionRowProps = {
  option: SelectionOption;
  serifName?: boolean;
  onSelect: (option: SelectionOption) => void;
};

const modes: { id: ReviewMode; title: string; description: string }[] = [
  { id: "flashcard", title: "Flashcard", description: "Recall aloud." },
  { id: "typing", title: "Typing", description: "Type the verse." },
  { id: "first-letter", title: "First letters", description: "Type each initial." },
];

function SelectionRow({ option, serifName = false, onSelect }: SelectionRowProps) {
  const done = option.dueCount === 0;
  return (
    <button
      onClick={() => onSelect(option)}
      disabled={done}
      className={`choice-row w-full px-3.5 py-3 text-left ${done ? "opacity-50 cursor-not-allowed" : option.isLastUsed ? "!border-border" : ""}`}
    >
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <h4 className={`font-semibold text-sm flex items-center gap-1.5 text-foreground ${serifName ? "font-serif" : ""}`}>
            <span className="truncate">{option.name}</span>
            {option.isLastUsed && <span className="text-xs font-normal text-muted-foreground font-sans whitespace-nowrap">· Last used</span>}
          </h4>
          <p className="text-xs mt-0.5 text-muted-foreground font-sans tabular-nums">
            {option.dueCount} due · {option.totalCount} total
          </p>
        </div>
        {done ? <Check className="w-4 h-4 text-yv-green-30" aria-label="Nothing due" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </div>
    </button>
  );
}

export function ReviewSelectionScreen({ cards, customGroups, sequentialGroups, lastSelection, onSelect }: ReviewSelectionScreenProps) {
  const toOption = (type: SelectionOption["type"], name: string, groupCards: Card[], id?: string): SelectionOption => ({
    type,
    id,
    name,
    dueCount: getDueCards(groupCards).length,
    totalCount: groupCards.length,
    isLastUsed: lastSelection?.type === type && lastSelection.id === id,
  });
  const allOption = toOption("all", "All verses", cards);
  const collectionOptions = customGroups.map((group) => toOption("custom-group", group.name, cards.filter((c) => group.cardIds.includes(c.id)), group.id));
  const passageOptions = sequentialGroups
    .filter((group) => !group.isMiscellaneous || getDueCards(group.cards).length > 0)
    .map((group) => toOption("sequential-group", group.reference, group.cards, group.reference));
  const sections = [
    { title: "Collections", options: collectionOptions, serifName: false },
    { title: "Passages", options: passageOptions, serifName: true },
  ];
  const handleSelect = ({ type, id, name }: SelectionOption) => onSelect({ type, id, name });

  return (
    <div className="surface max-w-2xl mx-auto">
      <div className="px-6 pt-6 pb-2">
        <h2 className="text-2xl font-semibold text-foreground font-serif tracking-[-0.01em]">What do you want to study?</h2>
      </div>

      <div className="px-4 sm:px-6 pb-6 pt-3 space-y-6">
        <button onClick={() => handleSelect(allOption)} className="w-full p-4 text-left rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <h3 className="font-semibold text-base">{allOption.name}</h3>
              <p className="text-xs mt-0.5 opacity-75 tabular-nums">
                {allOption.dueCount} due · {allOption.totalCount} total
                {allOption.isLastUsed && " · Last used"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </button>

        {sections.filter(({ options }) => options.length > 0).map(({ title, options, serifName }) => (
          <div key={title}>
            <h3 className="text-sm font-medium mb-1 px-3.5 text-muted-foreground">{title}</h3>
            <div className="space-y-0.5">
              {options.map((option) => <SelectionRow key={option.id} option={option} serifName={serifName} onSelect={handleSelect} />)}
            </div>
          </div>
        ))}

        {collectionOptions.length === 0 && (
          <div className="px-3.5 pt-5 border-t border-border">
            <p className="text-sm font-medium text-foreground">No collections yet</p>
            <p className="text-sm mt-1 text-muted-foreground">Make one in the Verses tab.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function ReviewModeSelector({ selectedMode, onSelectMode, onStart, scopeLabel, scopeCardCount }: ReviewModeSelectorProps) {
  return (
    <div className="surface max-w-2xl mx-auto">
      <div className="px-6 pt-6 pb-4">
        <h2 className="text-2xl font-semibold text-foreground font-serif tracking-[-0.01em]">Choose a mode</h2>
        {scopeLabel && (
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{scopeLabel}</span>
            {scopeCardCount !== undefined && <span className="tabular-nums"> · {scopeCardCount} verse{scopeCardCount !== 1 ? "s" : ""}</span>}
          </p>
        )}
      </div>

      <div className="px-4 sm:px-6 pb-6 space-y-5">
        <RadioGroup aria-label="Review mode" value={selectedMode ?? ""} onValueChange={(value) => onSelectMode(value as ReviewMode)} className="space-y-1">
          {modes.map(({ id, title, description }) => (
            <RadioGroupItem key={id} value={id} className="px-3.5 py-3">
              <span className="flex items-center gap-4">
                <span className="flex-1">
                  <span className="block font-medium text-sm text-foreground">{title}</span>
                  <span className="block text-sm mt-0.5 text-muted-foreground">{description}</span>
                </span>
                <RadioMark />
              </span>
            </RadioGroupItem>
          ))}
        </RadioGroup>

        <button onClick={onStart} disabled={!selectedMode} className="btn-primary w-full py-3">
          Start
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
