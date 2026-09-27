import { useState, useRef, useEffect } from "react";
import type { Card, QualityRating } from "../lib/sm2";
import { calculateAccuracy } from "../lib/sm2";
import { RatingBar } from "./RatingBar";
import { ReviewShell } from "./ReviewShell";
import { Eye } from "lucide-react";

interface TypingReviewCardProps {
  card: Card;
  onRate: (quality: QualityRating, accuracy: number) => void;
  onSkip?: () => void;
}

interface TypingState {
  cardId: string;
  input: string;
  result: "checked" | "answer" | null;
}

function createState(card: Card): TypingState {
  return { cardId: card.id, input: "", result: null };
}

export function TypingReviewCard({ card, onRate, onSkip }: TypingReviewCardProps) {
  const [review, setReview] = useState(() => createState(card));
  const inputRef = useRef<HTMLTextAreaElement>(null);

  if (review.cardId !== card.id) setReview(createState(card));

  const { input, result } = review;
  const isSubmitted = result !== null;
  const showAnswer = result === "answer";
  const accuracy = result === "checked" ? calculateAccuracy(input, card.text) : 0;

  useEffect(() => {
    inputRef.current?.focus();
  }, [card.id]);

  const handleSubmit = () => {
    if (!input.trim()) return;
    setReview((state) => ({ ...state, result: "checked" }));
  };

  const handleRate = (quality: QualityRating) => {
    setReview(createState(card));
    onRate(showAnswer ? 1 : quality, accuracy);
  };

  const renderValidation = () => {
    if (!isSubmitted) return null;

    const inputWords = input.trim().split(/\s+/);
    const expectedWords = card.text.trim().split(/\s+/);

    return (
      <div className="pb-4 border-b border-border/60">
        <p className="text-sm font-medium text-muted-foreground mb-2">
          Your answer
        </p>
        <p className="text-lg leading-relaxed">
          {inputWords.map((word, wordIndex) => {
            const expectedWord = expectedWords[wordIndex] || "";
            const normalizedWord = word.toLowerCase().replace(/[^\w]/g, "");
            const normalizedExpectedWord = expectedWord.toLowerCase().replace(/[^\w]/g, "");
            const isCorrect = normalizedWord === normalizedExpectedWord;

            return (
              <span key={wordIndex}>
                <span className={isCorrect ? "text-yv-green-30 font-medium" : "text-destructive font-medium"}>
                  {word}
                </span>
                {wordIndex < inputWords.length - 1 && " "}
              </span>
            );
          })}
        </p>
        {accuracy < 100 && (
          <>
            <p className="text-sm font-medium text-muted-foreground mt-4 mb-2">
              Correct answer
            </p>
            <p className="text-lg leading-relaxed verse-text text-foreground">{card.text}</p>
          </>
        )}
      </div>
    );
  };

  return (
    <ReviewShell card={card} modeLabel="Type the full verse" onSkip={onSkip}>
      <div className="p-6">
        {!isSubmitted ? (
          <div className="space-y-4">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setReview((state) => ({ ...state, input: e.target.value }))}
              placeholder="Type the verse from memory…"
              rows={5}
              className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-ring focus:border-transparent outline-none resize-none text-lg bg-background text-foreground"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSubmit}
                disabled={!input.trim()}
                className="btn-primary flex-1 py-3"
              >
                Check my answer
              </button>
              <button
                onClick={() => setReview((state) => ({ ...state, result: "answer" }))}
                className="btn-muted px-4 py-3"
              >
                <Eye className="w-4 h-4" />
                Show answer
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {renderValidation()}

            {showAnswer && accuracy === 0 && (
              <div className="py-3 flex items-center gap-2.5">
                <Eye className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  You looked at the answer, so this review counts as "Again".
                </p>
              </div>
            )}

            {accuracy > 0 && (
              <div className="text-center">
                <p className="text-2xl font-medium text-foreground tabular-nums">{accuracy}%</p>
                <p className="text-sm text-muted-foreground">accuracy</p>
              </div>
            )}

            <RatingBar card={card} onRate={handleRate} />
          </div>
        )}
      </div>
    </ReviewShell>
  );
}
