import { motion } from "framer-motion";
import type { Card, QualityRating } from "../lib/sm2";
import { getNextIntervalText } from "../lib/sm2";
import { RotateCcw, Hourglass, ThumbsUp, Zap } from "lucide-react";

interface RatingBarProps {
  card: Card;
  onRate: (quality: QualityRating) => void;
  showKeys?: boolean;
}

type RatingButton = {
  quality: QualityRating;
  label: string;
  key: string;
  icon: React.ReactNode;
};

const ratingButtons: RatingButton[] = [
  {
    quality: 1,
    label: "Again",
    key: "1",
    icon: <RotateCcw className="w-[18px] h-[18px]" strokeWidth={2.25} />,
  },
  {
    quality: 3,
    label: "Hard",
    key: "2",
    icon: <Hourglass className="w-[18px] h-[18px]" strokeWidth={2.25} />,
  },
  {
    quality: 4,
    label: "Good",
    key: "3",
    icon: <ThumbsUp className="w-[18px] h-[18px]" strokeWidth={2.25} />,
  },
  {
    quality: 5,
    label: "Easy",
    key: "4",
    icon: <Zap className="w-[18px] h-[18px]" strokeWidth={2.25} />,
  },
];

export function RatingBar({ card, onRate, showKeys = false }: RatingBarProps) {
  return (
    <div className="space-y-3">
      <p className="text-center text-sm font-medium text-muted-foreground">
        How well did you remember?
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {ratingButtons.map((btn) => (
          <motion.button
            key={btn.quality}
            whileHover={{ y: -1 }}
            whileTap={{ y: 0 }}
            onClick={() => onRate(btn.quality)}
            className="flex flex-col items-center gap-1 p-3 rounded-xl border border-border bg-background/60 hover:bg-muted transition-colors"
          >
            <div className={btn.quality === 1 ? "text-destructive" : "text-muted-foreground"}>{btn.icon}</div>
            <span className="text-sm font-medium text-foreground">{btn.label}</span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {getNextIntervalText(card, btn.quality)}
            </span>
            {showKeys && (
              <span className="text-xs text-muted-foreground -mt-0.5">
                {btn.key}
              </span>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
