import { BIBLE_BOOKS, parseVerseRange } from "./bibleData";
import type { TranslationId } from "./bibleData";

type BibleJson = Record<string, Record<string, Record<string, string>>>;

export interface LookupResult {
  text: string;
  reference: string;
}

const cache = new Map<TranslationId, Promise<BibleJson>>();

function loadTranslation(translation: TranslationId): Promise<BibleJson> {
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

const verseNumbers = (chapterData: Record<string, string>) =>
  Object.keys(chapterData)
    .map((k) => parseInt(k, 10))
    .filter((n) => !isNaN(n))
    .sort((a, b) => a - b);

export async function lookupSelection(
  bookId: string,
  chapterRange: string,
  verseRange: string,
  translation: TranslationId
): Promise<LookupResult[]> {
  const chapters = parseVerseRange(chapterRange);
  if (chapters.length === 0) throw new Error(`Invalid chapter range: "${chapterRange}"`);
  const bookIndex = BIBLE_BOOKS.findIndex((b) => b.id === bookId);
  if (bookIndex === -1) throw new Error(`Unknown book ID: ${bookId}`);
  const book = BIBLE_BOOKS[bookIndex];
  const bookData = (await loadTranslation(translation))[bookIndex + 1];
  if (!bookData) throw new Error(`${book.name} not found in ${translation} data`);

  const explicitVerses = chapters.length === 1 ? parseVerseRange(verseRange) : [];
  return chapters.flatMap((chapter) => {
    const chapterData = bookData[chapter];
    if (!chapterData) throw new Error(`${book.name} chapter ${chapter} not found in ${translation}`);
    const verses = explicitVerses.length ? explicitVerses : verseNumbers(chapterData);
    return verses.map((v) => {
      const text = chapterData[v];
      if (!text) throw new Error(`${book.name} ${chapter}:${v} not found in ${translation}`);
      return { text, reference: `${book.name} ${chapter}:${v} (${translation})` };
    });
  });
}

export function preloadTranslation(translation: TranslationId): void {
  loadTranslation(translation).catch(() => undefined);
}
