import type { StreakData, CustomGroup, ReviewSelection } from "./storage";
import type { VerseGroup } from "./verseGroups";

export type ReviewMode = "flashcard" | "typing" | "first-letter";

export type QualityRating = 0 | 1 | 2 | 3 | 4 | 5;

export interface Card {
  id: string;
  reference: string;
  text: string;
  translation: string;
  ef: number;
  interval: number;
  repetitions: number;
  nextReview: Date;
  lastReviewed: Date | null;
  createdAt: Date;
  modesUsed: ReviewMode[];
}

export const DAY_MS = 86400000;

export const isoDay = (date: Date) => date.toISOString().split("T")[0];

export const daysAgo = (days: number) => new Date(Date.now() - days * DAY_MS);

export const isDue = (card: Card, now = new Date()) => card.nextReview <= now;

function calculateNextReview(card: Card, quality: QualityRating) {
  const ef = Math.max(1.3, card.ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  const now = new Date();
  if (quality < 3) return { ef, interval: 0, repetitions: 0, nextReview: now, lastReviewed: now };
  const interval = [1, 6][card.repetitions] ?? Math.round(card.interval * ef);
  return { ef, interval, repetitions: card.repetitions + 1, nextReview: new Date(now.getTime() + interval * DAY_MS), lastReviewed: now };
}

export function createCard(reference: string, text: string, translation = "NIV"): Card {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    reference,
    text,
    translation,
    ef: 2.5,
    interval: 0,
    repetitions: 0,
    nextReview: now,
    lastReviewed: null,
    createdAt: now,
    modesUsed: [],
  };
}

export function getDueCards(cards: Card[]): Card[] {
  const now = new Date();
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

export function getNextIntervalText(card: Card, quality: QualityRating): string {
  if (quality < 3) return "< 1 min";
  if (card.repetitions === 0) return "1 day";
  if (card.repetitions === 1) return "6 days";
  const days = Math.round(card.interval * card.ef);
  if (days < 30) return `${days} days`;
  if (days < 365) return `${Math.round(days / 30)} months`;
  return `${(days / 365).toFixed(1)} years`;
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
  if (accuracy < 50) return 1;
  return accuracy < 80 && quality > 3 ? 3 : quality;
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
  const updates = calculateNextReview(card, adjusted);
  let celebration: string | null = null;
  if (updates.repetitions === 5) celebration = `${card.reference} mastered!`;
  else if (adjusted === 5 && updates.repetitions > 5) celebration = "Perfect recall!";
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
