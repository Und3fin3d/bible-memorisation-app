export interface BibleBook {
  id: string;
  name: string;
  testament: "old" | "new";
  chapters: number;
}

export const BIBLE_BOOKS: BibleBook[] = [
  { id: "GEN", name: "Genesis", testament: "old", chapters: 50 },
  { id: "EXO", name: "Exodus", testament: "old", chapters: 40 },
  { id: "LEV", name: "Leviticus", testament: "old", chapters: 27 },
  { id: "NUM", name: "Numbers", testament: "old", chapters: 36 },
  { id: "DEU", name: "Deuteronomy", testament: "old", chapters: 34 },
  { id: "JOS", name: "Joshua", testament: "old", chapters: 24 },
  { id: "JDG", name: "Judges", testament: "old", chapters: 21 },
  { id: "RUT", name: "Ruth", testament: "old", chapters: 4 },
  { id: "1SA", name: "1 Samuel", testament: "old", chapters: 31 },
  { id: "2SA", name: "2 Samuel", testament: "old", chapters: 24 },
  { id: "1KI", name: "1 Kings", testament: "old", chapters: 22 },
  { id: "2KI", name: "2 Kings", testament: "old", chapters: 25 },
  { id: "1CH", name: "1 Chronicles", testament: "old", chapters: 29 },
  { id: "2CH", name: "2 Chronicles", testament: "old", chapters: 36 },
  { id: "EZR", name: "Ezra", testament: "old", chapters: 10 },
  { id: "NEH", name: "Nehemiah", testament: "old", chapters: 13 },
  { id: "EST", name: "Esther", testament: "old", chapters: 10 },
  { id: "JOB", name: "Job", testament: "old", chapters: 42 },
  { id: "PSA", name: "Psalms", testament: "old", chapters: 150 },
  { id: "PRO", name: "Proverbs", testament: "old", chapters: 31 },
  { id: "ECC", name: "Ecclesiastes", testament: "old", chapters: 12 },
  { id: "SNG", name: "Song of Solomon", testament: "old", chapters: 8 },
  { id: "ISA", name: "Isaiah", testament: "old", chapters: 66 },
  { id: "JER", name: "Jeremiah", testament: "old", chapters: 52 },
  { id: "LAM", name: "Lamentations", testament: "old", chapters: 5 },
  { id: "EZK", name: "Ezekiel", testament: "old", chapters: 48 },
  { id: "DAN", name: "Daniel", testament: "old", chapters: 12 },
  { id: "HOS", name: "Hosea", testament: "old", chapters: 14 },
  { id: "JOL", name: "Joel", testament: "old", chapters: 3 },
  { id: "AMO", name: "Amos", testament: "old", chapters: 9 },
  { id: "OBA", name: "Obadiah", testament: "old", chapters: 1 },
  { id: "JON", name: "Jonah", testament: "old", chapters: 4 },
  { id: "MIC", name: "Micah", testament: "old", chapters: 7 },
  { id: "NAM", name: "Nahum", testament: "old", chapters: 3 },
  { id: "HAB", name: "Habakkuk", testament: "old", chapters: 3 },
  { id: "ZEP", name: "Zephaniah", testament: "old", chapters: 3 },
  { id: "HAG", name: "Haggai", testament: "old", chapters: 2 },
  { id: "ZEC", name: "Zechariah", testament: "old", chapters: 14 },
  { id: "MAL", name: "Malachi", testament: "old", chapters: 4 },
  { id: "MAT", name: "Matthew", testament: "new", chapters: 28 },
  { id: "MRK", name: "Mark", testament: "new", chapters: 16 },
  { id: "LUK", name: "Luke", testament: "new", chapters: 24 },
  { id: "JHN", name: "John", testament: "new", chapters: 21 },
  { id: "ACT", name: "Acts", testament: "new", chapters: 28 },
  { id: "ROM", name: "Romans", testament: "new", chapters: 16 },
  { id: "1CO", name: "1 Corinthians", testament: "new", chapters: 16 },
  { id: "2CO", name: "2 Corinthians", testament: "new", chapters: 13 },
  { id: "GAL", name: "Galatians", testament: "new", chapters: 6 },
  { id: "EPH", name: "Ephesians", testament: "new", chapters: 6 },
  { id: "PHP", name: "Philippians", testament: "new", chapters: 4 },
  { id: "COL", name: "Colossians", testament: "new", chapters: 4 },
  { id: "1TH", name: "1 Thessalonians", testament: "new", chapters: 5 },
  { id: "2TH", name: "2 Thessalonians", testament: "new", chapters: 3 },
  { id: "1TI", name: "1 Timothy", testament: "new", chapters: 6 },
  { id: "2TI", name: "2 Timothy", testament: "new", chapters: 4 },
  { id: "TIT", name: "Titus", testament: "new", chapters: 3 },
  { id: "PHM", name: "Philemon", testament: "new", chapters: 1 },
  { id: "HEB", name: "Hebrews", testament: "new", chapters: 13 },
  { id: "JAS", name: "James", testament: "new", chapters: 5 },
  { id: "1PE", name: "1 Peter", testament: "new", chapters: 5 },
  { id: "2PE", name: "2 Peter", testament: "new", chapters: 3 },
  { id: "1JN", name: "1 John", testament: "new", chapters: 5 },
  { id: "2JN", name: "2 John", testament: "new", chapters: 1 },
  { id: "3JN", name: "3 John", testament: "new", chapters: 1 },
  { id: "JUD", name: "Jude", testament: "new", chapters: 1 },
  { id: "REV", name: "Revelation", testament: "new", chapters: 22 },
];

export const TRANSLATIONS = [
  { id: "ESV", name: "English Standard Version" },
  { id: "NIV", name: "New International Version" },
  { id: "NLT", name: "New Living Translation" },
  { id: "KJV", name: "King James Version" },
  { id: "CSB", name: "Christian Standard Bible" },
  { id: "NASB", name: "New American Standard Bible" },
] as const;

export type TranslationId = typeof TRANSLATIONS[number]["id"];

export function parseVerseRange(range: string): number[] {
  const verses: number[] = [];
  for (const part of range.split(/[,;]/)) {
    const [start, end] = part.split("-").map(n => parseInt(n.trim(), 10));
    if (end === undefined) {
      if (!isNaN(start)) verses.push(start);
      continue;
    }
    for (let verse = start; verse <= end; verse++) verses.push(verse);
  }
  return verses;
}
