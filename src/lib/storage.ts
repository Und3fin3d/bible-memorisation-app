import type { Card } from "./sm2";

const STORAGE_KEY = "bible-memorisation-cards";
const STREAK_KEY = "bible-memorisation-streak";
const REVIEW_LOG_KEY = "bible-memorisation-review-log";

function readStored<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
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

export function loadCards(): Card[] | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parsed.map((card: Record<string, unknown>) => ({
      ...card,
      nextReview: new Date(card.nextReview as string),
      lastReviewed: card.lastReviewed
        ? new Date(card.lastReviewed as string)
        : null,
      createdAt: new Date(card.createdAt as string),
    }));
  } catch {
    return null;
  }
}

export function saveCards(cards: Card[]): void {
  saveStored(STORAGE_KEY, cards, "Failed to save cards to localStorage");
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastReviewDate: string | null;
  totalReviews: number;
}

export function loadStreak(): StreakData {
  return readStored(STREAK_KEY, { currentStreak: 0, longestStreak: 0, lastReviewDate: null, totalReviews: 0 });
}

export function saveStreak(streak: StreakData): void {
  saveStored(STREAK_KEY, streak, "Failed to save streak data");
}

export function recordReview(streak: StreakData): StreakData {
  const today = new Date().toISOString().split("T")[0];

  if (streak.lastReviewDate === today) {
    return { ...streak, totalReviews: streak.totalReviews + 1 };
  }

  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const newStreak =
    streak.lastReviewDate === yesterday ? streak.currentStreak + 1 : 1;

  return {
    currentStreak: newStreak,
    longestStreak: Math.max(streak.longestStreak, newStreak),
    lastReviewDate: today,
    totalReviews: streak.totalReviews + 1,
  };
}

export interface DailyReviewLog {
  [date: string]: number;
}

export function loadReviewLog(): DailyReviewLog {
  return readStored(REVIEW_LOG_KEY, {});
}

export function addReviewToLog(log: DailyReviewLog): DailyReviewLog {
  const today = new Date().toISOString().split("T")[0];
  const updated = { ...log, [today]: (log[today] || 0) + 1 };
  const cutoff = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
  for (const key of Object.keys(updated)) {
    if (key < cutoff) delete updated[key];
  }

  saveStored(REVIEW_LOG_KEY, updated);
  return updated;
}

export function getWeeklyData(log: DailyReviewLog): { day: string; count: number }[] {
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(Date.now() - (6 - i) * 86400000);
    return {
      day: date.toLocaleDateString("en", { weekday: "short" }),
      count: log[date.toISOString().split("T")[0]] || 0,
    };
  });
}

export interface CustomGroup {
  id: string;
  name: string;
  cardIds: string[];
  createdAt: string;
}

const CUSTOM_GROUPS_KEY = "bible-memorisation-custom-groups";

export function loadCustomGroups(): CustomGroup[] {
  return readStored(CUSTOM_GROUPS_KEY, []);
}

export function saveCustomGroups(groups: CustomGroup[]): void {
  saveStored(CUSTOM_GROUPS_KEY, groups, "Failed to save custom groups");
}

export interface ReviewSelection {
  type: "all" | "custom-group" | "sequential-group" | "ad-hoc";
  id?: string;
  name?: string;
  cardIds?: string[];
}

const LAST_SELECTION_KEY = "bible-memorisation-last-selection";

export function loadLastSelection(): ReviewSelection | null {
  return readStored(LAST_SELECTION_KEY, null);
}

export function saveLastSelection(selection: ReviewSelection): void {
  saveStored(LAST_SELECTION_KEY, selection, "Failed to save last selection");
}
