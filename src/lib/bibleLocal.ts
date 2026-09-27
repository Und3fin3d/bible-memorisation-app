import { BIBLE_BOOKS, parseVerseRange } from "./bibleData";
import type { TranslationId } from "./bibleData";

type BibleJson = Record<string, Record<string, Record<string, string>>>;

const cache = new Map<TranslationId, Promise<BibleJson>>();

async function loadTranslation(translation: TranslationId): Promise<BibleJson> {
  const cached = cache.get(translation);
  if (cached) return cached;
  const load = fetch(`/bibles/${translation}.json`)
    .then((res) => {
      if (!res.ok) throw new Error(`Failed to load ${translation} Bible (${res.status})`);
      return res.json() as Promise<BibleJson>;
    })
    .catch((error) => {
      cache.delete(translation);
      throw error;
    });

  cache.set(translation, load);
  return load;
}

export interface LookupResult {
  text: string;
  reference: string;
}

async function resolveChapter(
  bookId: string,
  chapter: number,
  translation: TranslationId
): Promise<{ book: (typeof BIBLE_BOOKS)[number]; chapterData: Record<string, string> }> {
  const bookIndex = BIBLE_BOOKS.findIndex((b) => b.id === bookId);
  if (bookIndex === -1) throw new Error(`Unknown book ID: ${bookId}`);

  const book = BIBLE_BOOKS[bookIndex];
  const bible = await loadTranslation(translation);

  const bookData = bible[bookIndex + 1];
  if (!bookData) throw new Error(`${book.name} not found in ${translation} data`);

  const chapterData = bookData[chapter];
  if (!chapterData)
    throw new Error(`${book.name} chapter ${chapter} not found in ${translation}`);

  return { book, chapterData };
}

function chapterVerseNumbers(chapterData: Record<string, string>): number[] {
  return Object.keys(chapterData)
    .map((k) => parseInt(k, 10))
    .filter((n) => !isNaN(n))
    .sort((a, b) => a - b);
}

export async function lookupSelection(
  bookId: string,
  chapterRange: string,
  verseRange: string,
  translation: TranslationId
): Promise<LookupResult[]> {
  const chapters = parseVerseRange(chapterRange);
  if (chapters.length === 0) throw new Error(`Invalid chapter range: "${chapterRange}"`);

  const explicitVerses = chapters.length === 1 ? parseVerseRange(verseRange) : [];
  const results: LookupResult[] = [];
  for (const chapter of chapters) {
    const { book, chapterData } = await resolveChapter(bookId, chapter, translation);
    const verseNums = explicitVerses.length ? explicitVerses : chapterVerseNumbers(chapterData);
    for (const v of verseNums) {
      const text = chapterData[v];
      if (!text) throw new Error(`${book.name} ${chapter}:${v} not found in ${translation}`);
      results.push({ text, reference: `${book.name} ${chapter}:${v} (${translation})` });
    }
  }
  return results;
}

export function preloadTranslation(translation: TranslationId): void {
  loadTranslation(translation).catch(() => undefined);
}
