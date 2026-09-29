import { useState, useRef, useEffect, useEffectEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, SkipForward, X } from "lucide-react";
import type { Card, QualityRating } from "../lib/sm2";
import { calculateAccuracy, getNextIntervalText } from "../lib/sm2";

const TEXT_ENTRY_TAGS = ["INPUT", "TEXTAREA", "SELECT"];

function useKeyboardShortcuts(handlers: Record<string, (e: KeyboardEvent) => void>) {
  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
    if (TEXT_ENTRY_TAGS.includes((e.target as HTMLElement).tagName)) return;
    const handler = handlers[e.key.toLowerCase()];
    if (!handler) return;
    e.preventDefault();
    handler(e);
  });

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}

type ReviewCardProps = {
  card: Card;
  onRate: (quality: QualityRating, accuracy?: number) => void;
  onSkip?: () => void;
};

type ReviewShellProps = {
  card: Card;
  modeLabel?: string;
  onSkip?: () => void;
  skipHint?: string;
  children: React.ReactNode;
};

type RatingBarProps = {
  card: Card;
  onRate: (quality: QualityRating) => void;
  showKeys?: boolean;
};

type AnswerShownNoticeProps = { className?: string };

type WordState = {
  fullWord: string;
  firstLetter: string;
  punctuation: string;
  isRevealed: boolean;
  isCorrect: boolean | null;
};

type FirstLetterRound = {
  words: WordState[];
  currentWordIndex: number;
  showAnswer: boolean;
  justRevealed: number | null;
};

const ratings: { quality: QualityRating; label: string; key: string }[] = [
  { quality: 1, label: "Again", key: "1" },
  { quality: 3, label: "Hard", key: "2" },
  { quality: 4, label: "Good", key: "3" },
  { quality: 5, label: "Easy", key: "4" },
];

const wordTone: Record<string, string> = {
  true: "text-yv-green-30",
  false: "text-destructive line-through",
  null: "text-foreground",
};

const normaliseWord = (word: string) => word.toLowerCase().replace(/[^\w]/g, "");

function useCardReview<T extends object>(card: Card, onRate: ReviewCardProps["onRate"], create: () => T) {
  const fresh = () => ({ cardId: card.id, ...create() });
  const [review, setReview] = useState(fresh);
  if (review.cardId !== card.id) setReview(fresh());
  const rate = (quality: QualityRating, accuracy?: number) => {
    setReview(fresh());
    onRate(quality, accuracy);
  };
  return [review, setReview, rate] as const;
}

function parseWords(text: string): WordState[] {
  return text.split(/\s+/).filter(Boolean).map((fullWord) => {
    const [, leading, core, trailing] = fullWord.match(/^([^(\w)]*)(.*?)([^(\w)]*)$/)!;
    return { fullWord, firstLetter: core.charAt(0).toLowerCase(), punctuation: leading + trailing, isRevealed: false, isCorrect: null };
  });
}

function applyLetter({ words, currentWordIndex, showAnswer }: FirstLetterRound, letter: string): Partial<FirstLetterRound> {
  const current = words[currentWordIndex];
  if (showAnswer || !current) return {};

  let next = currentWordIndex + 1;
  if (!current.firstLetter) {
    while (next < words.length && !words[next].firstLetter) next++;
    return { currentWordIndex: next };
  }

  const updated = [...words];
  updated[currentWordIndex] = { ...current, isRevealed: true, isCorrect: letter === current.firstLetter };
  while (next < words.length && !words[next].firstLetter) {
    updated[next] = { ...words[next], isRevealed: true };
    next++;
  }
  return { words: updated, currentWordIndex: next, justRevealed: currentWordIndex };
}

function ReviewShell({ card, modeLabel, onSkip, skipHint = "Skip", children }: ReviewShellProps) {
  return (
    <motion.div
      key={card.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.18 }}
      className="surface max-w-2xl mx-auto"
    >
      <div className="px-6 pt-5 pb-4 border-b border-border">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold text-muted-foreground tracking-wide">{card.translation}</span>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {modeLabel && <span>{modeLabel}</span>}
            {card.repetitions > 0 && <span>Reviewed {card.repetitions}×</span>}
            {onSkip && (
              <button onClick={onSkip} className="flex items-center gap-1 font-medium transition-colors hover:text-foreground" title={skipHint}>
                <SkipForward className="w-3.5 h-3.5" />
                Skip
              </button>
            )}
          </div>
        </div>
        <h2 className="text-2xl sm:text-3xl font-semibold mt-2 font-serif tracking-[-0.01em] text-foreground">{card.reference}</h2>
      </div>
      {children}
    </motion.div>
  );
}

function RatingBar({ card, onRate, showKeys = false }: RatingBarProps) {
  return (
    <div className="space-y-3">
      <p className="text-center text-sm text-muted-foreground">How well did you remember?</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {ratings.map(({ quality, label, key }) => (
          <button
            key={quality}
            onClick={() => onRate(quality)}
            className="relative flex flex-col items-center gap-0.5 px-3 py-3 rounded-xl border border-border bg-card hover:bg-muted hover:border-foreground/30 transition-colors"
          >
            <span className={`text-sm font-semibold ${quality === 1 ? "text-destructive" : "text-foreground"}`}>{label}</span>
            <span className="text-xs text-muted-foreground tabular-nums">{getNextIntervalText(card, quality)}</span>
            {showKeys && <kbd className="absolute top-1.5 right-1.5 hidden sm:block">{key}</kbd>}
          </button>
        ))}
      </div>
    </div>
  );
}

function AnswerShownNotice({ className = "" }: AnswerShownNoticeProps) {
  return (
    <div className={`py-3 flex items-center gap-2.5 ${className}`}>
      <Eye className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">You looked at the answer, so this review counts as "Again".</p>
    </div>
  );
}

export function ReviewCard({ card, onRate, onSkip }: ReviewCardProps) {
  const [{ revealed }, setReview, rate] = useCardReview(card, onRate, () => ({ revealed: false }));
  const setRevealed = (value: boolean) => setReview((state) => ({ ...state, revealed: value }));
  const ratingShortcuts = Object.fromEntries(ratings.map(({ key, quality }) => [key, () => { if (revealed) rate(quality); }]));

  useKeyboardShortcuts({ " ": () => setRevealed(true), ...ratingShortcuts, s: () => onSkip?.() });

  return (
    <ReviewShell card={card} onSkip={onSkip} skipHint="Skip (S)">
      <div className="relative min-h-[160px] flex items-center justify-center p-6 sm:p-10">
        <AnimatePresence mode="wait">
          {revealed ? (
            <motion.div key="verse" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="text-center w-full">
              <p className="verse-text text-lg sm:text-xl leading-relaxed text-foreground max-w-[60ch] mx-auto text-pretty">"{card.text}"</p>
              <button onClick={() => setRevealed(false)} className="mt-5 text-xs flex items-center gap-1.5 mx-auto transition-colors hover:text-foreground text-muted-foreground">
                <EyeOff className="w-3.5 h-3.5" />
                Hide
              </button>
            </motion.div>
          ) : (
            <motion.button
              key="reveal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRevealed(true)}
              className="flex items-center gap-2.5 px-5 py-3 rounded-xl border border-dashed border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
            >
              <Eye className="w-4 h-4" />
              Tap to reveal
              <kbd className="hidden sm:inline">Space</kbd>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {revealed && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.2 }} className="px-6 pb-6 pt-5 border-t border-border">
            <RatingBar card={card} onRate={rate} showKeys />
          </motion.div>
        )}
      </AnimatePresence>
    </ReviewShell>
  );
}

export function TypingReviewCard({ card, onRate, onSkip }: ReviewCardProps) {
  const [{ input, result }, setReview, rate] = useCardReview(card, onRate, () => ({ input: "", result: null as "checked" | "answer" | null }));
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const showAnswer = result === "answer";
  const accuracy = result === "checked" ? calculateAccuracy(input, card.text) : 0;
  const inputWords = input.trim().split(/\s+/);
  const expectedWords = card.text.trim().split(/\s+/);
  const setResult = (value: "checked" | "answer") => setReview((state) => ({ ...state, result: value }));

  useEffect(() => {
    inputRef.current?.focus();
  }, [card.id]);

  return (
    <ReviewShell card={card} modeLabel="Type the full verse" onSkip={onSkip}>
      <div className="p-6">
        {result === null ? (
          <div className="space-y-4">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setReview((state) => ({ ...state, input: e.target.value }))}
              placeholder="Type the verse from memory…"
              rows={5}
              className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-ring focus:border-transparent outline-none resize-none text-lg bg-input text-foreground"
            />
            <div className="flex gap-2">
              <button onClick={() => setResult("checked")} disabled={!input.trim()} className="btn-primary flex-1 py-3">
                Check my answer
              </button>
              <button onClick={() => setResult("answer")} className="btn-muted px-4 py-3">
                <Eye className="w-4 h-4" />
                Show answer
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="pb-4 border-b border-border">
              <p className="text-sm font-medium text-muted-foreground mb-2">Your answer</p>
              <p className="text-lg leading-relaxed">
                {inputWords.map((word, index) => (
                  <span key={index}>
                    <span className={normaliseWord(word) === normaliseWord(expectedWords[index] ?? "") ? "text-yv-green-30 font-medium" : "text-destructive font-medium"}>{word}</span>
                    {index < inputWords.length - 1 && " "}
                  </span>
                ))}
              </p>
              {accuracy < 100 && (
                <>
                  <p className="text-sm font-medium text-muted-foreground mt-4 mb-2">Correct answer</p>
                  <p className="text-lg leading-relaxed verse-text text-foreground">{card.text}</p>
                </>
              )}
            </div>
            {showAnswer && <AnswerShownNotice />}
            {accuracy > 0 && (
              <div className="text-center">
                <p className="text-2xl font-medium text-foreground tabular-nums">{accuracy}%</p>
                <p className="text-sm text-muted-foreground">accuracy</p>
              </div>
            )}
            <RatingBar card={card} onRate={(quality) => rate(showAnswer ? 1 : quality, accuracy)} />
          </div>
        )}
      </div>
    </ReviewShell>
  );
}

export function FirstLetterReviewCard({ card, onRate, onSkip }: ReviewCardProps) {
  const [review, setReview, rate] = useCardReview(card, onRate, (): FirstLetterRound => ({ words: parseWords(card.text), currentWordIndex: 0, showAnswer: false, justRevealed: null }));
  const { words, currentWordIndex, showAnswer, justRevealed } = review;
  const typingWordCount = words.filter((word) => word.firstLetter).length;
  const attempted = words.filter((word) => word.isCorrect !== null).length;
  const correct = words.filter((word) => word.isCorrect).length;
  const percent = Math.round((correct / Math.max(typingWordCount, 1)) * 100);
  const inPlay = currentWordIndex < words.length && !showAnswer;

  const handleKeyDown = useEffectEvent((e: KeyboardEvent) => {
    const letter = e.key.toLowerCase();
    if (!inPlay || e.ctrlKey || e.metaKey || e.altKey || !/^[a-z]$/.test(letter)) return;
    e.preventDefault();
    setReview((state) => ({ ...state, ...applyLetter(state, letter) }));
    setTimeout(() => setReview((state) => ({ ...state, justRevealed: null })), 300);
  });

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const showWholeAnswer = () => setReview((state) => ({ ...state, words: state.words.map((word) => ({ ...word, isRevealed: true })), showAnswer: true }));

  return (
    <ReviewShell card={card} modeLabel="First letters" onSkip={inPlay ? onSkip : undefined}>
      <div className="p-6 space-y-4">
        {inPlay && (
          <div className="flex items-baseline justify-between text-sm">
            <p className="text-foreground font-medium">
              Type the first letter of word <span className="font-bold tabular-nums">{attempted + 1}</span>
            </p>
            <p className="text-muted-foreground tabular-nums">
              {correct}/{attempted} correct
            </p>
          </div>
        )}

        <div className="bg-input border border-border rounded-xl px-5 py-5 min-h-[96px] verse-text text-lg leading-loose">
          {words.map((word, index) => (
            <span key={index} className="inline-block mr-[0.3em]">
              {word.isRevealed ? (
                <span className={`transition-all duration-300 inline-flex items-center ${wordTone[String(word.isCorrect)]} ${justRevealed === index ? "scale-110" : ""}`}>
                  {word.fullWord}
                  {word.isCorrect === false && <X className="w-3 h-3 ml-0.5 text-destructive inline" />}
                </span>
              ) : (
                <span className="inline-flex items-center justify-center min-w-[1.5ch]">
                  {word.firstLetter ? (
                    <span className="inline-flex items-baseline">
                      <span className="inline-block w-[1ch] border-b-2 border-border mx-0.5 text-center">
                        {index === currentWordIndex && <span className="animate-pulse text-foreground">_</span>}
                      </span>
                      {word.punctuation && <span className="text-muted-foreground">{word.punctuation}</span>}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">{word.punctuation}</span>
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
                <div className="h-full rounded-full transition-all duration-300 bg-foreground" style={{ width: `${(attempted / Math.max(typingWordCount, 1)) * 100}%` }} />
              </div>
              <p className="text-center text-xs mt-2 text-muted-foreground tabular-nums">
                {attempted} / {typingWordCount} words · one attempt each
              </p>
            </div>
            <button onClick={showWholeAnswer} className="btn-muted w-full py-3">
              <Eye className="w-4 h-4" />
              Show answer
            </button>
          </>
        ) : (
          <div className="space-y-4">
            <div className="py-2 text-center">
              <p className="text-2xl font-medium text-foreground tabular-nums">
                {correct}/{typingWordCount}
              </p>
              <p className="text-sm text-muted-foreground mt-1">{percent}% correct</p>
            </div>
            {showAnswer && <AnswerShownNotice className="border-t border-border" />}
            <RatingBar card={card} onRate={(quality) => rate(showAnswer ? 1 : quality, percent)} />
          </div>
        )}
      </div>
    </ReviewShell>
  );
}
