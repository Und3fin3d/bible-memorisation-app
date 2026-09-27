import type { ReviewMode } from "../lib/sm2";
import { Eye, Keyboard, Type, ChevronRight, BookMarked, X } from "lucide-react";

interface ReviewModeSelectorProps {
  selectedMode: ReviewMode | null;
  onSelectMode: (mode: ReviewMode) => void;
  onStart: () => void;
  scopeLabel?: string;
  scopeCardCount?: number;
  onClearScope?: () => void;
}

interface ModeOption {
  id: ReviewMode;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const modes: ModeOption[] = [
  {
    id: "flashcard",
    title: "Flashcard",
    description: "Reveal the verse and rate your recall.",
    icon: <Eye className="w-5 h-5" />,
  },
  {
    id: "typing",
    title: "Type Full Verse",
    description: "Type the entire verse from memory with real-time feedback.",
    icon: <Keyboard className="w-5 h-5" />,
  },
  {
    id: "first-letter",
    title: "First Letters",
    description: "Use first-letter hints to recall each word.",
    icon: <Type className="w-5 h-5" />,
  },
];

export function ReviewModeSelector({ selectedMode, onSelectMode, onStart, scopeLabel, scopeCardCount, onClearScope }: ReviewModeSelectorProps) {
  return (
    <div className="glass max-w-2xl mx-auto">
      <div className="px-6 pt-6 pb-4 border-b border-border/60">
        <h2 className="text-2xl font-semibold mb-0.5 text-foreground font-serif">Choose Review Mode</h2>
        <p className="text-sm text-muted-foreground">Select how you want to review your verses today</p>
      </div>

      <div className="p-6 space-y-5">
        {scopeLabel && (
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-border/60">
            <div className="flex items-center gap-2">
              <BookMarked className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
              <span className="text-sm text-foreground">
                <span className="font-semibold">{scopeLabel}</span>
                {scopeCardCount !== undefined && (
                  <span className="ml-1.5 text-muted-foreground">
                    · {scopeCardCount} verse{scopeCardCount !== 1 ? "s" : ""}
                  </span>
                )}
              </span>
            </div>
            {onClearScope && (
              <button
                onClick={onClearScope}
                className="flex items-center gap-1 text-xs transition-colors hover:text-foreground text-muted-foreground"
              >
                <X className="w-3.5 h-3.5" />
                Review all
              </button>
            )}
          </div>
        )}

        <div className="space-y-2" role="radiogroup" aria-label="Review mode">
          {modes.map((mode) => {
            const isSelected = selectedMode === mode.id;
            return (
              <button
                key={mode.id}
                role="radio"
                aria-checked={isSelected}
                onClick={() => onSelectMode(mode.id)}
                className="choice-row w-full p-4 text-left"
              >
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground flex-shrink-0">{mode.icon}</span>
                  <div className="flex-1 text-left">
                    <h3 className="font-medium text-sm text-foreground">{mode.title}</h3>
                    <p className="text-xs mt-0.5 text-muted-foreground">{mode.description}</p>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      isSelected ? "border-foreground bg-foreground" : "border-border"
                    }`}
                  >
                    {isSelected && <div className="w-2 h-2 rounded-full bg-background" />}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <button onClick={onStart} disabled={!selectedMode} className="btn-primary w-full py-3">
          Start Review
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
