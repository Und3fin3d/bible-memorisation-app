import { isDue } from "./scheduling";
import type { Card } from "./scheduling";
import { parseVerseRange } from "./bibleData";

interface ParsedReference {
  book: string;
  chapter: number;
  verses: number[];
}

interface ParsedCard {
  card: Card;
  parsed: ParsedReference;
}

export interface VerseGroup {
  id: string;
  reference: string;
  cards: Card[];
  isMiscellaneous: boolean;
}

function parseReference(reference: string): ParsedReference | null {
  const match = reference.match(/^(?:(\d)\s+)?(.+?)\s+(\d+):(.+)$/);
  if (!match) return null;
  const [, prefix, book, chapter, verses] = match;
  return {
    book: prefix ? `${prefix} ${book.trim()}` : book.trim(),
    chapter: parseInt(chapter, 10),
    verses: parseVerseRange(verses),
  };
}

const compareParsed = (a: ParsedReference, b: ParsedReference) =>
  a.book.localeCompare(b.book) || a.chapter - b.chapter || Math.min(...a.verses) - Math.min(...b.verses);

const areSequential = (a: ParsedReference, b: ParsedReference) =>
  a.book === b.book && a.chapter === b.chapter && Math.min(...b.verses) === Math.max(...a.verses) + 1;

function formatRunReference({ book, chapter, verses }: ParsedReference): string {
  if (!chapter) return "";
  const sorted = [...verses].sort((a, b) => a - b);
  const isContinuous = sorted.every((v, i) => i === 0 || v === sorted[i - 1] + 1);
  return `${book} ${chapter}:${isContinuous ? `${sorted[0]}-${sorted[sorted.length - 1]}` : sorted.join(",")}`;
}

function collectRuns(cards: Card[]): ParsedCard[][] {
  const parsedCards = cards.flatMap((card) => {
    const parsed = parseReference(card.reference);
    return parsed ? [{ card, parsed }] : [];
  });
  parsedCards.sort((a, b) => compareParsed(a.parsed, b.parsed));
  const runs: ParsedCard[][] = [];
  for (const item of parsedCards) {
    const run = runs.at(-1);
    if (run && areSequential(run[run.length - 1].parsed, item.parsed)) run.push(item);
    else runs.push([item]);
  }
  return runs;
}

export function getOrganizedGroups(cards: Card[]): {
  sequentialGroups: VerseGroup[];
  miscellaneousGroup: VerseGroup | null;
} {
  const runs = collectRuns(cards);
  const sequentialGroups = runs
    .filter((run) => run.length > 1)
    .map((run) => ({
      id: `group-${run[0].card.id}`,
      reference: formatRunReference({ ...run[0].parsed, verses: run.flatMap((item) => item.parsed.verses) }),
      cards: run.map((item) => item.card),
      isMiscellaneous: false,
    }));
  const miscCards = [
    ...runs.filter((run) => run.length === 1).map(([item]) => item.card),
    ...cards.filter((card) => !parseReference(card.reference)),
  ];
  const miscellaneousGroup = miscCards.length
    ? { id: "group-miscellaneous", reference: "Miscellaneous", cards: miscCards, isMiscellaneous: true }
    : null;
  return { sequentialGroups, miscellaneousGroup };
}

export const isGroupDue = (group: VerseGroup) => group.cards.some((card) => isDue(card));
