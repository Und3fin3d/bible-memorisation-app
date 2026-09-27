import { motion } from "framer-motion";
import type { Card } from "../lib/sm2";
import { SkipForward } from "lucide-react";

interface ReviewShellProps {
  card: Card;
  modeLabel?: string;
  onSkip?: () => void;
  skipHint?: string;
  children: React.ReactNode;
}

export function ReviewShell({ card, modeLabel, onSkip, skipHint, children }: ReviewShellProps) {
  return (
    <motion.div
      key={card.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.18 }}
      className="glass max-w-2xl mx-auto"
    >
      <div className="px-6 pt-6 pb-4 border-b border-border/60">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground tracking-wide">
            {card.translation}
          </span>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {modeLabel && <span>{modeLabel}</span>}
            {card.repetitions > 0 && <span>Reviewed {card.repetitions}×</span>}
            {onSkip && (
              <button
                onClick={onSkip}
                className="flex items-center gap-1 font-medium transition-colors hover:text-foreground"
                title={skipHint ?? "Skip"}
              >
                <SkipForward className="w-3.5 h-3.5" />
                Skip
              </button>
            )}
          </div>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold mt-3 font-serif text-foreground">
          {card.reference}
        </h2>
      </div>
      {children}
    </motion.div>
  );
}
