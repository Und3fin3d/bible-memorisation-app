const fs = require("fs");
const path = require("path");

const BIBLES_DIR = path.join(__dirname, "../bibles");
const OUTPUT_DIR = path.join(__dirname, "../public/bibles");

const FILE_TO_TRANSLATION = {
  "EnglishCSBBible.xml": "CSB",
  "EnglishESVBible.xml": "ESV",
  "EnglishKJVBible.xml": "KJV",
  "EnglishNASBBible.xml": "NASB",
  "EnglishNIVBible.xml": "NIV",
  "EnglishNLTBible.xml": "NLT",
};

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

for (const [filename, translation] of Object.entries(FILE_TO_TRANSLATION)) {
  const xmlPath = path.join(BIBLES_DIR, filename);

  if (!fs.existsSync(xmlPath)) {
    console.warn(`  ⚠  ${filename} not found, skipping`);
    continue;
  }

  process.stdout.write(`Converting ${filename} → ${translation}.json ...`);

  const content = fs.readFileSync(xmlPath, "utf-8");
  const bible = {};

  for (const [, bookNum, bookText] of content.matchAll(/<book number="(\d+)">([\s\S]*?)<\/book>/g)) {
    const book = bible[bookNum] = {};
    for (const [, chapterNum, chapterText] of bookText.matchAll(
      /<chapter number="(\d+)">([\s\S]*?)<\/chapter>/g
    )) {
      const chapter = book[chapterNum] = {};
      for (const [, verseNum, verseText] of chapterText.matchAll(
        /<verse number="(\d+)">([\s\S]*?)<\/verse>/g
      )) {
        chapter[verseNum] = decodeEntities(verseText.trim());
      }
    }
  }

  const bookCount = Object.keys(bible).length;
  const outPath = path.join(OUTPUT_DIR, `${translation}.json`);
  fs.writeFileSync(outPath, JSON.stringify(bible));

  const kb = Math.round(fs.statSync(outPath).size / 1024);
  console.log(` ✓  (${bookCount} books, ${kb} KB)`);
}

console.log("\nAll done! Files are in public/bibles/");
