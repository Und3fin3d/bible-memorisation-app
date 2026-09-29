import { createCard, daysAgo, isoDay } from "./sm2";
import type { Card } from "./sm2";

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastReviewDate: string | null;
  totalReviews: number;
}

export type DailyReviewLog = Record<string, number>;

export interface CustomGroup {
  id: string;
  name: string;
  cardIds: string[];
  createdAt: string;
}

export interface ReviewSelection {
  type: "all" | "custom-group" | "sequential-group" | "ad-hoc";
  id?: string;
  name?: string;
  cardIds?: string[];
}

const keys = {
  cards: "bible-memorisation-cards",
  streak: "bible-memorisation-streak",
  reviewLog: "bible-memorisation-review-log",
  customGroups: "bible-memorisation-custom-groups",
  lastSelection: "bible-memorisation-last-selection",
};

export const sampleVerses = [
  ["John 3:16", "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life."],
  ["Philippians 4:13", "I can do all this through him who gives me strength."],
  ["Romans 8:28", "And we know that in all things God works for the good of those who love him, who have been called according to his purpose."],
  ["Psalm 23:1", "The Lord is my shepherd, I lack nothing."],
  ["Proverbs 3:5-6", "Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight."],
  ["Isaiah 40:31", "But those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint."],
  ["Matthew 11:28", "Come to me, all you who are weary and burdened, and I will give you rest."],
  ["Jeremiah 29:11", "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future."],
].map(([reference, text]) => createCard(reference, text));

function readStored<T>(key: string, fallback: T, revive = (value: unknown) => value as T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? revive(JSON.parse(stored)) : fallback;
  } catch {
    return fallback;
  }
}

function saveStored(key: string, value: unknown, error?: string): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    if (error) console.error(error);
  }
}

const reviveCards = (cards: unknown) =>
  (cards as Card[]).map((card) => ({
    ...card,
    nextReview: new Date(card.nextReview),
    lastReviewed: card.lastReviewed ? new Date(card.lastReviewed) : null,
    createdAt: new Date(card.createdAt),
  }));

export const loadCards = () => readStored<Card[] | null>(keys.cards, null, reviveCards);
export const saveCards = (cards: Card[]) => saveStored(keys.cards, cards, "Failed to save cards to localStorage");

export const loadStreak = () =>
  readStored<StreakData>(keys.streak, { currentStreak: 0, longestStreak: 0, lastReviewDate: null, totalReviews: 0 });
export const saveStreak = (streak: StreakData) => saveStored(keys.streak, streak, "Failed to save streak data");

export const loadCustomGroups = () => readStored<CustomGroup[]>(keys.customGroups, []);
export const saveCustomGroups = (groups: CustomGroup[]) =>
  saveStored(keys.customGroups, groups, "Failed to save custom groups");

export const loadLastSelection = () => readStored<ReviewSelection | null>(keys.lastSelection, null);
export const saveLastSelection = (selection: ReviewSelection) =>
  saveStored(keys.lastSelection, selection, "Failed to save last selection");

export const loadReviewLog = () => readStored<DailyReviewLog>(keys.reviewLog, {});

export function addReviewToLog(log: DailyReviewLog): DailyReviewLog {
  const today = isoDay(new Date());
  const cutoff = isoDay(daysAgo(30));
  const counts = Object.entries({ ...log, [today]: (log[today] || 0) + 1 });
  const updated = Object.fromEntries(counts.filter(([day]) => day >= cutoff));
  saveStored(keys.reviewLog, updated);
  return updated;
}

export function getWeeklyData(log: DailyReviewLog): { day: string; count: number }[] {
  return Array.from({ length: 7 }, (_, i) => {
    const date = daysAgo(6 - i);
    return { day: date.toLocaleDateString("en", { weekday: "short" }), count: log[isoDay(date)] || 0 };
  });
}
