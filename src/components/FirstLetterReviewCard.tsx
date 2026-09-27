import { useState, useEffect, useEffectEvent } from "react";
import type { Card, QualityRating } from "../lib/sm2";
import { RatingBar } from "./RatingBar";
import { ReviewShell } from "./ReviewShell";
import { Eye, X } from "lucide-react";

interface FirstLetterReviewCardProps {
  card: Card;
  onRate: (quality: QualityRating, accuracy: number) => void;
  onSkip?: () => void;
}

interface WordState {
  fullWord: string;
  firstLetter: string;
  punctuation: string;
  isRevealed: boolean;
  isCorrect: boolean | null;
  isPunctuationOnly: boolean;
}

interface FirstLetterState {
  cardId: string;
  words: WordState[];
  currentWordIndex: number;
  score: { correct: number; total: number };
  showAnswer: boolean;
  justRevealed: number | null;
}

function parseWords(text: string): WordState[] {
  return text.split(/\s+/).filter(w => w.length > 0).map(word => {
    const leadingMatch = word.match(/^[^(\w)]*/);
    const leadingPunct = leadingMatch ? leadingMatch[0] : "";
    const content = word.slice(leadingPunct.length);
    const trailingMatch = content.match(/[^(\w)]*$/);
    const trailingPunct = trailingMatch ? trailingMatch[0] : "";
    const coreWord = content.slice(0, content.length - trailingPunct.length);
    const firstLetter = coreWord.charAt(0).toLowerCase();
    const isPunctuationOnly = coreWord.length === 0;
    return {
      fullWord: word,
      firstLetter: isPunctuationOnly ? "" : firstLetter,
      punctuation: leadingPunct + trailingPunct,
      isRevealed: false,
      isCorrect: null,
      isPunctuationOnly,
    };
  });
}

function createState(card: Card): FirstLetterState {
  return {
    cardId: card.id,
    words: parseWords(card.text),
    currentWordIndex: 0,
    score: { correct: 0, total: 0 },
    showAnswer: false,
    justRevealed: null,
  };
}

function applyLetter(state: FirstLetterState, typedLetter: string): FirstLetterState {
  const currentWord = state.words[state.currentWordIndex];
  if (state.showAnswer || !currentWord) return state;

  const words = [...state.words];
  let nextIndex = state.currentWordIndex + 1;

  if (currentWord.isPunctuationOnly) {
    while (nextIndex < words.length && words[nextIndex].isPunctuationOnly) nextIndex++;
    return { ...state, currentWordIndex: nextIndex };
  }

  const isCorrect = typedLetter === currentWord.firstLetter;
  words[state.currentWordIndex] = { ...currentWord, isRevealed: true, isCorrect };

  while (nextIndex < words.length && words[nextIndex].isPunctuationOnly) {
    words[nextIndex] = { ...words[nextIndex], isRevealed: true };
    nextIndex++;
  }

  return {
    ...state,
    words,
    currentWordIndex: nextIndex,
    score: {
      correct: state.score.correct + Number(isCorrect),
      total: state.score.total + 1,
    },
    justRevealed: state.currentWordIndex,
  };
}

export function FirstLetterReviewCard({ card, onRate, onSkip }: FirstLetterReviewCardProps) {
  const [review, setReview] = useState(() => createState(card));

  if (review.cardId !== card.id) setReview(createState(card));

  const { words, currentWordIndex, score, showAnswer, justRevealed } = review;
  const typingWordCount = words.filter((word) => !word.isPunctuationOnly).length;
  const isCompleted = currentWordIndex >= words.length;

  const handleKeyDown = useEffectEvent((e: KeyboardEvent) => {
    if (isCompleted || showAnswer) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key.length !== 1) return;
    const typedLetter = e.key.toLowerCase();
    if (!/^[a-z]$/.test(typedLetter)) return;
    e.preventDefault();

    setReview((state) => applyLetter(state, typedLetter));
    setTimeout(() => {
      setReview((state) => ({ ...state, justRevealed: null }));
    }, 300);
  });

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleShowAnswer = () => {
    setReview((state) => ({
      ...state,
      words: state.words.map((word) => ({ ...word, isRevealed: true })),
      showAnswer: true,
    }));
  };

  const handleRate = (quality: QualityRating) => {
    const accuracy = typingWordCount > 0 ? Math.round((score.correct / typingWordCount) * 100) : 0;
    setReview(createState(card));
    onRate(showAnswer ? 1 : quality, accuracy);
  };

  const progress = typingWordCount > 0 ? Math.min(100, (score.total / typingWordCount) * 100) : 0;
  const currentTypingNumber = currentWordIndex < words.length
    ? words.slice(0, currentWordIndex).filter(word => !word.isPunctuationOnly).length + 1
    : typingWordCount;
  const inPlay = !isCompleted && !showAnswer;

  return (
    <ReviewShell
      card={card}
      modeLabel="First letters"
      onSkip={inPlay ? onSkip : undefined}
    >
      <div className="p-6 space-y-4">
        {inPlay && (
          <div className="flex items-baseline justify-between text-sm">
            <p className="text-foreground font-medium">
              Type the first letter of word{" "}
              <span className="font-bold tabular-nums">{currentTypingNumber}</span>
            </p>
            <p className="text-muted-foreground tabular-nums">
              {score.correct}/{score.total} correct
            </p>
          </div>
        )}

        <div className="bg-background border border-border/60 rounded-xl px-5 py-5 min-h-[96px] verse-text text-lg leading-loose">
          {words.map((word, index) => (
            <span key={index} className="inline-block mr-[0.3em]">
              {word.isRevealed ? (
                <span
                  className={`transition-all duration-300 inline-flex items-center ${
                    word.isCorrect === true
                      ? "text-yv-green-30"
                      : word.isCorrect === false
                      ? "text-destructive line-through"
                      : "text-foreground"
                  } ${justRevealed === index ? "scale-110" : ""}`}
                >
                  {word.fullWord}
                  {word.isCorrect === false && (
                    <X className="w-3 h-3 ml-0.5 text-destructive inline" />
                  )}
                </span>
              ) : (
                <span className="inline-flex items-center justify-center min-w-[1.5ch]">
                  {word.isPunctuationOnly ? (
                    <span className="text-muted-foreground">{word.punctuation}</span>
                  ) : (
                    <span className="inline-flex items-baseline">
                      <span className="inline-block w-[1ch] border-b-2 border-border mx-0.5 text-center">
                        {index === currentWordIndex ? (
                          <span className="animate-pulse text-foreground">_</span>
                        ) : (
                          ""
                        )}
                      </span>
                      {word.punctuation && (
                        <span className="text-muted-foreground">{word.punctuation}</span>
                      )}
                    </span>
                  )}
                </span>
              )}
            </span>
          ))}
        </div>

        {inPlay ? (
          <>
            <div>
              <div className="w-full rounded-full h-1.5 bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300 bg-foreground"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-center text-xs mt-2 text-muted-foreground tabular-nums">
                {score.total} / {typingWordCount} words · one attempt each
              </p>
            </div>

            <button onClick={handleShowAnswer} className="btn-muted w-full py-3">
              <Eye className="w-4 h-4" />
              Show answer
            </button>
          </>
        ) : (
          <div className="space-y-4">
            <div className="py-2 text-center">
              <p className="text-2xl font-medium text-foreground tabular-nums">
                {score.correct}/{typingWordCount}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {Math.round((score.correct / Math.max(typingWordCount, 1)) * 100)}% correct
              </p>
            </div>

            {showAnswer && (
              <div className="py-3 border-t border-border/60 flex items-center gap-2.5">
                <Eye className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  You looked at the answer, so this review counts as "Again".
                </p>
              </div>
            )}

            <RatingBar card={card} onRate={handleRate} />
          </div>
        )}
      </div>
    </ReviewShell>
  );
}
