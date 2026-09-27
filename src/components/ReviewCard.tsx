import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Card, QualityRating } from "../lib/sm2";
import { useKeyboardShortcuts } from "../lib/hooks";
import { RatingBar } from "./RatingBar";
import { ReviewShell } from "./ReviewShell";
import { Eye, EyeOff } from "lucide-react";

interface ReviewCardProps {
  card: Card;
  onRate: (quality: QualityRating) => void;
  onSkip?: () => void;
}

export function ReviewCard({ card, onRate, onSkip }: ReviewCardProps) {
  const [review, setReview] = useState({ cardId: card.id, revealed: false });

  if (review.cardId !== card.id) setReview({ cardId: card.id, revealed: false });

  const { revealed } = review;

  const handleRate = (quality: QualityRating) => {
    setReview({ cardId: card.id, revealed: false });
    onRate(quality);
  };

  useKeyboardShortcuts({
    " ": () => {
      if (!revealed) setReview({ cardId: card.id, revealed: true });
    },
    "1": () => { if (revealed) handleRate(1); },
    "2": () => { if (revealed) handleRate(3); },
    "3": () => { if (revealed) handleRate(4); },
    "4": () => { if (revealed) handleRate(5); },
    s: () => onSkip?.(),
  });

  return (
    <ReviewShell card={card} onSkip={onSkip} skipHint="Skip (S)">
      <div className="relative min-h-[160px] flex items-center justify-center p-6 sm:p-10">
        <AnimatePresence mode="wait">
          {!revealed ? (
            <motion.button
              key="reveal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setReview({ cardId: card.id, revealed: true })}
              className="flex flex-col items-center gap-3 transition-opacity hover:opacity-75"
            >
              <div className="flex items-center justify-center">
                <Eye className="w-5 h-5 text-muted-foreground" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">
                Tap to reveal <span className="text-muted-foreground">(Space)</span>
              </span>
            </motion.button>
          ) : (
            <motion.div
              key="verse"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="text-center w-full"
            >
              <p className="verse-text text-lg sm:text-xl leading-relaxed text-foreground">
                "{card.text}"
              </p>
              <button
                onClick={() => setReview({ cardId: card.id, revealed: false })}
                className="mt-5 text-xs flex items-center gap-1.5 mx-auto transition-opacity hover:opacity-60 text-muted-foreground"
              >
                <EyeOff className="w-3.5 h-3.5" />
                Hide
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {revealed && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="px-6 pb-6 pt-5 border-t border-border/60"
          >
            <RatingBar card={card} onRate={handleRate} showKeys />
          </motion.div>
        )}
      </AnimatePresence>
    </ReviewShell>
  );
}
