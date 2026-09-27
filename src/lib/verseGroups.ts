import type { Card } from "./sm2";
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
  book: string;
  chapter: number;
  startVerse: number;
  endVerse: number;
  cards: Card[];
  isMiscellaneous: boolean;
}

export function parseReference(reference: string): ParsedReference | null {
  const match = reference.match(/^(?:(\d)\s+)?(.+?)\s+(\d+):(.+)$/);
  if (!match) return null;
  const [, prefix, book, chapter, verses] = match;
  return {
    book: prefix ? `${prefix} ${book.trim()}` : book.trim(),
    chapter: parseInt(chapter, 10),
    verses: parseVerseRange(verses),
  };
}

function areSequential(
  ref1: ParsedReference | undefined,
  ref2: ParsedReference
): boolean {
  if (!ref1) return false;
  return ref1.book === ref2.book && ref1.chapter === ref2.chapter
    && Math.min(...ref2.verses) === Math.max(...ref1.verses) + 1;
}

function formatReference(parsed: ParsedReference): string {
  if (!parsed.chapter) return "";

  const { book, chapter, verses } = parsed;

  if (verses.length === 0) return `${book} ${chapter}`;
  if (verses.length === 1) return `${book} ${chapter}:${verses[0]}`;
  const sorted = [...verses].sort((a, b) => a - b);
  const isContinuous = sorted.every((v, i) => i === 0 || v === sorted[i - 1] + 1);

  if (isContinuous) {
    return `${book} ${chapter}:${sorted[0]}-${sorted[sorted.length - 1]}`;
  }
  return `${book} ${chapter}:${sorted.join(",")}`;
}

export function groupVerses(cards: Card[]): VerseGroup[] {
  const parsedCards = cards.flatMap((card): ParsedCard[] => {
    const parsed = parseReference(card.reference);
    return parsed ? [{ card, parsed }] : [];
  });
  parsedCards.sort((a, b) => {
    if (a.parsed.book !== b.parsed.book) {
      return a.parsed.book.localeCompare(b.parsed.book);
    }
    if (a.parsed.chapter !== b.parsed.chapter) {
      return a.parsed.chapter - b.parsed.chapter;
    }
    return Math.min(...a.parsed.verses) - Math.min(...b.parsed.verses);
  });

  const groups: ParsedCard[][] = [];
  for (const item of parsedCards) {
    const previous = groups[groups.length - 1];
    if (areSequential(previous?.[previous.length - 1].parsed, item.parsed)) previous.push(item);
    else groups.push([item]);
  }
  return groups.map(createGroupFromCards);
}

function createGroupFromCards(items: ParsedCard[]): VerseGroup {
  const verses = items.flatMap(item => item.parsed.verses);
  const { card, parsed } = items[0];
  return {
    id: `group-${card.id}`,
    reference: formatReference({ ...parsed, verses }),
    book: parsed.book,
    chapter: parsed.chapter || 0,
    startVerse: Math.min(...verses),
    endVerse: Math.max(...verses),
    cards: items.map(item => item.card),
    isMiscellaneous: items.length === 1,
  };
}

export function getOrganizedGroups(cards: Card[]): {
  sequentialGroups: VerseGroup[];
  miscellaneousGroup: VerseGroup | null;
} {
  const groups = groupVerses(cards);

  const sequentialGroups = groups.filter(g => !g.isMiscellaneous);
  const miscCards = groups
    .filter(g => g.isMiscellaneous)
    .flatMap(g => g.cards)
    .concat(cards.filter(card => !parseReference(card.reference)));

  let miscellaneousGroup: VerseGroup | null = null;

  if (miscCards.length > 0) {
    miscellaneousGroup = {
      id: "group-miscellaneous",
      reference: "Miscellaneous",
      book: "",
      chapter: 0,
      startVerse: 0,
      endVerse: 0,
      cards: miscCards,
      isMiscellaneous: true,
    };
  }

  return { sequentialGroups, miscellaneousGroup };
}

export function isCardDue(card: Card): boolean {
  return new Date(card.nextReview) <= new Date();
}

export function isGroupDue(group: VerseGroup): boolean {
  return group.cards.some(isCardDue);
}
