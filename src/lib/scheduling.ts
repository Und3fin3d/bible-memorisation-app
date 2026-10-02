import { createEmptyCard, fsrs, GenSeedStrategyWithCardId, Rating, State, StrategyMode, type Card as Schedule, type Grade } from "ts-fsrs";
import type { StreakData, CustomGroup, ReviewSelection } from "./storage";
import type { VerseGroup } from "./verseGroups";

export type ReviewMode = "flashcard" | "typing" | "first-letter";

export type QualityRating = Grade;

export interface Card {
  id: string;
  reference: string;
  text: string;
  translation: string;
  schedule: Schedule;
  repetitions: number;
  nextReview: Date;
  lastReviewed: Date | null;
  createdAt: Date;
  modesUsed: ReviewMode[];
}

export const DAY_MS = 86400000;

const scheduler = fsrs({ enable_fuzz: true }).useStrategy(StrategyMode.SEED, GenSeedStrategyWithCardId("id"));

export type StoredCard = Omit<Card, "schedule"> & { schedule?: Schedule; ef?: number; interval?: number };

export const isoDay = (date: Date) => date.toISOString().split("T")[0];

export const daysAgo = (days: number) => new Date(Date.now() - days * DAY_MS);

export const isDue = (card: Card, now = new Date()) => card.nextReview <= now;

function migrateSchedule(card: StoredCard): Schedule {
  const schedule = createEmptyCard(card.nextReview);
  if (!card.lastReviewed) return schedule;
  const interval = card.interval ?? 0;
  const stability = Math.max(0.001, interval);
  const { w } = scheduler.parameters;
  const difficulty = 11 - ((card.ef ?? 2.5) - 1) / (Math.exp(w[8]) * stability ** -w[9] * Math.expm1(0.1 * w[10]));
  return {
    ...schedule,
    stability,
    difficulty: Math.min(10, Math.max(1, difficulty)),
    scheduled_days: interval,
    reps: Math.max(1, card.repetitions),
    state: interval > 0 ? State.Review : State.Learning,
    last_review: card.lastReviewed,
  };
}

export function restoreCard(stored: StoredCard): Card {
  const { ef, interval, schedule, ...fields } = stored;
  const card = {
    ...fields,
    nextReview: new Date(fields.nextReview),
    lastReviewed: fields.lastReviewed ? new Date(fields.lastReviewed) : null,
    createdAt: new Date(fields.createdAt),
  };
  const restored = schedule ? {
    ...schedule,
    due: new Date(schedule.due),
    last_review: schedule.last_review ? new Date(schedule.last_review) : undefined,
  } : migrateSchedule({ ...card, ef, interval });
  return { ...card, schedule: restored };
}

function calculateNextReview(card: Card, quality: QualityRating, now: Date) {
  const current = { ...card.schedule, id: card.id };
  const { card: schedule } = scheduler.next(current, now, quality);
  const repetitions = quality === Rating.Again ? 0 : card.repetitions + 1;
  return { schedule, repetitions, nextReview: schedule.due, lastReviewed: now };
}

export function createCard(reference: string, text: string, translation = "NIV"): Card {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    reference,
    text,
    translation,
    schedule: createEmptyCard(now),
    repetitions: 0,
    nextReview: now,
    lastReviewed: null,
    createdAt: now,
    modesUsed: [],
  };
}

export function getDueCards(cards: Card[], now = new Date()): Card[] {
  return cards.filter((card) => isDue(card, now)).sort((a, b) => a.nextReview.getTime() - b.nextReview.getTime());
}

export function getReviewStats(cards: Card[]) {
  const now = new Date();
  const count = (predicate: (card: Card) => boolean) => cards.filter(predicate).length;
  return {
    total: cards.length,
    due: count((c) => isDue(c, now)),
    mastered: count((c) => c.repetitions >= 5),
    learning: count((c) => c.repetitions < 5 && (c.repetitions > 0 || c.lastReviewed !== null)),
    new: count((c) => c.repetitions === 0 && !c.lastReviewed),
  };
}

export function getNextIntervalText(card: Card, quality: QualityRating, mode: ReviewMode = "flashcard", accuracy?: number): string {
  const now = new Date();
  const { nextReview } = calculateNextReview(card, adjustQuality(quality, mode, accuracy), now);
  const minutes = Math.round((nextReview.getTime() - now.getTime()) / 60000);
  if (minutes < 1) return "<1m";
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
  const days = Math.round(minutes / 1440);
  if (days < 30) return `${days}d`;
  if (days < 365) return `${(days / 30).toFixed(1)}mo`;
  return `${(days / 365).toFixed(1)}y`;
}

const normaliseText = (text: string) => text.toLowerCase().replace(/\s+/g, " ").replace(/[^\w\s]/g, "").trim();

export function calculateAccuracy(input: string, expected: string): number {
  const a = normaliseText(input);
  const b = normaliseText(expected);
  if (b.length === 0) return 0;
  const maxLength = Math.max(a.length, b.length);
  return Math.max(0, Math.round(((maxLength - levenshteinDistance(a, b)) / maxLength) * 100));
}

function levenshteinDistance(a: string, b: string): number {
  const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
  matrix[0] = Array.from({ length: a.length + 1 }, (_, j) => j);
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] = Math.min(
        matrix[i - 1][j - 1] + Number(b[i - 1] !== a[j - 1]),
        matrix[i][j - 1] + 1,
        matrix[i - 1][j] + 1
      );
    }
  }
  return matrix[b.length][a.length];
}

function adjustQuality(quality: QualityRating, mode: ReviewMode, accuracy?: number): QualityRating {
  if (mode === "flashcard" || accuracy === undefined) return quality;
  if (accuracy < 50) return Rating.Again;
  return accuracy < 80 && quality > Rating.Hard ? Rating.Hard : quality;
}

function recordReview(streak: StreakData): StreakData {
  const today = isoDay(new Date());
  if (streak.lastReviewDate === today) return { ...streak, totalReviews: streak.totalReviews + 1 };
  const currentStreak = streak.lastReviewDate === isoDay(daysAgo(1)) ? streak.currentStreak + 1 : 1;
  return {
    currentStreak,
    longestStreak: Math.max(streak.longestStreak, currentStreak),
    lastReviewDate: today,
    totalReviews: streak.totalReviews + 1,
  };
}

export function applyReview(
  card: Card,
  mode: ReviewMode,
  quality: QualityRating,
  accuracy: number | undefined,
  streak: StreakData
) {
  const adjusted = adjustQuality(quality, mode, accuracy);
  const updates = calculateNextReview(card, adjusted, new Date());
  let celebration: string | null = null;
  if (updates.repetitions === 5) celebration = `${card.reference} mastered!`;
  else if (adjusted === Rating.Easy && updates.repetitions > 5) celebration = "Perfect recall!";
  const modesUsed = card.modesUsed.includes(mode) ? card.modesUsed : [...card.modesUsed, mode];
  return { card: { ...card, ...updates, modesUsed }, streak: recordReview(streak), celebration };
}

export function resolveSelection(
  selection: ReviewSelection | null,
  cards: Card[],
  customGroups: CustomGroup[],
  sequentialGroups: VerseGroup[]
): Card[] {
  if (!selection) return cards;
  const ids = {
    all: undefined,
    "custom-group": customGroups.find((g) => g.id === selection.id)?.cardIds,
    "sequential-group": sequentialGroups.find((g) => g.reference === selection.id)?.cards.map((c) => c.id),
    "ad-hoc": selection.cardIds,
  }[selection.type];
  if (!ids) return cards;
  const idSet = new Set(ids);
  return cards.filter((c) => idSet.has(c.id));
}
