import { recordReview } from "./storage";
import type { StreakData, CustomGroup, ReviewSelection } from "./storage";
import type { VerseGroup } from "./verseGroups";

export type ReviewMode = "flashcard" | "typing" | "first-letter";

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

export type QualityRating = 0 | 1 | 2 | 3 | 4 | 5;

export interface ReviewUpdate {
  ef: number;
  interval: number;
  repetitions: number;
  nextReview: Date;
  lastReviewed: Date;
}

export function calculateNextReview(card: Card, quality: QualityRating): ReviewUpdate {
  const ef = Math.max(1.3, card.ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  let repetitions = 0;
  let interval = 0;
  const now = new Date();
  let nextReview = now;
  if (quality >= 3) {
    repetitions = card.repetitions + 1;
    if (repetitions === 1) interval = 1;
    else if (repetitions === 2) interval = 6;
    else interval = Math.round(card.interval * ef);
    nextReview = new Date(now.getTime() + interval * 86400000);
  }

  return {
    ef,
    interval,
    repetitions,
    nextReview,
    lastReviewed: now,
  };
}

export function createCard(
  reference: string,
  text: string,
  translation: string = "NIV"
): Card {
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
  return cards
    .filter((card) => new Date(card.nextReview) <= now)
    .sort((a, b) => new Date(a.nextReview).getTime() - new Date(b.nextReview).getTime());
}

export interface ReviewStats {
  total: number;
  due: number;
  mastered: number;
  learning: number;
  new: number;
}

export function getReviewStats(cards: Card[]): ReviewStats {
  const now = new Date();
  const due = cards.filter((c) => new Date(c.nextReview) <= now).length;
  const mastered = cards.filter((c) => c.repetitions >= 5).length;
  const learning = cards.filter(
    (c) => c.repetitions < 5 && (c.repetitions > 0 || c.lastReviewed !== null)
  ).length;
  const newCards = cards.filter(
    (c) => c.repetitions === 0 && !c.lastReviewed
  ).length;

  return { total: cards.length, due, mastered, learning, new: newCards };
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

export function normalizeText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").replace(/[^\w\s]/g, "").trim();
}

export function calculateAccuracy(input: string, expected: string): number {
  const normalizedInput = normalizeText(input);
  const normalizedExpected = normalizeText(expected);

  if (normalizedExpected.length === 0) return 0;
  const distance = levenshteinDistance(normalizedInput, normalizedExpected);
  const maxLength = Math.max(normalizedInput.length, normalizedExpected.length);

  return Math.max(0, Math.round(((maxLength - distance) / maxLength) * 100));
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

export interface ReviewOutcome {
  card: Card;
  streak: StreakData;
  celebration: string | null;
}

export function adjustQuality(
  quality: QualityRating,
  mode: ReviewMode,
  accuracy?: number
): QualityRating {
  if ((mode === "typing" || mode === "first-letter") && accuracy !== undefined) {
    if (accuracy < 50) return 1;
    if (accuracy < 80 && quality > 3) return 3;
  }
  return quality;
}

export function applyReview(
  card: Card,
  mode: ReviewMode,
  quality: QualityRating,
  accuracy: number | undefined,
  streak: StreakData
): ReviewOutcome {
  const adjusted = adjustQuality(quality, mode, accuracy);
  const updates = calculateNextReview(card, adjusted);

  let celebration: string | null = null;
  if (updates.repetitions === 5) {
    celebration = `${card.reference} mastered!`;
  } else if (adjusted === 5 && updates.repetitions > 5) {
    celebration = "Perfect recall!";
  }

  return {
    card: { ...card, ...updates, modesUsed: card.modesUsed.includes(mode) ? card.modesUsed : [...card.modesUsed, mode] },
    streak: recordReview(streak),
    celebration,
  };
}

export function resolveSelection(
  selection: ReviewSelection | null,
  cards: Card[],
  customGroups: CustomGroup[],
  sequentialGroups: VerseGroup[]
): Card[] {
  if (!selection || selection.type === "all") return cards;

  let ids: string[] | undefined;
  if (selection.type === "custom-group") {
    ids = customGroups.find((g) => g.id === selection.id)?.cardIds;
  } else if (selection.type === "sequential-group") {
    ids = sequentialGroups.find((g) => g.reference === selection.id)?.cards.map((c) => c.id);
  } else if (selection.type === "ad-hoc") {
    ids = selection.cardIds;
  }
  if (!ids) return cards;

  const idSet = new Set(ids);
  return cards.filter((c) => idSet.has(c.id));
}
