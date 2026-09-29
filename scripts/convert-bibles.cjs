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

const NAMED_ENTITIES = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'" };

const decodeEntities = (str) =>
  Object.entries(NAMED_ENTITIES)
    .reduce((text, [entity, char]) => text.replaceAll(entity, char), str)
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));

const parseLevels = (text, [tag, ...inner]) =>
  Object.fromEntries(
    [...text.matchAll(new RegExp(`<${tag} number="(\\d+)">([\\s\\S]*?)</${tag}>`, "g"))].map(([, number, body]) => [
      number,
      inner.length ? parseLevels(body, inner) : decodeEntities(body.trim()),
    ])
  );

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

for (const [filename, translation] of Object.entries(FILE_TO_TRANSLATION)) {
  const xmlPath = path.join(BIBLES_DIR, filename);
  if (!fs.existsSync(xmlPath)) {
    console.warn(`  ⚠  ${filename} not found, skipping`);
    continue;
  }

  process.stdout.write(`Converting ${filename} → ${translation}.json ...`);
  const bible = parseLevels(fs.readFileSync(xmlPath, "utf-8"), ["book", "chapter", "verse"]);
  const outPath = path.join(OUTPUT_DIR, `${translation}.json`);
  fs.writeFileSync(outPath, JSON.stringify(bible));
  const kb = Math.round(fs.statSync(outPath).size / 1024);
  console.log(` ✓  (${Object.keys(bible).length} books, ${kb} KB)`);
}

console.log("\nAll done! Files are in public/bibles/");
