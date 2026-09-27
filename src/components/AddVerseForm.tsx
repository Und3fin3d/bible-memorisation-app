import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createCard, type Card } from "../lib/sm2";
import {
  BIBLE_BOOKS,
  TRANSLATIONS,
  parseVerseRange,
  type BibleBook,
  type TranslationId,
} from "../lib/bibleData";
import { lookupSelection, preloadTranslation, type LookupResult } from "../lib/bibleLocal";
import { BookPlus, X, AlertCircle, Search, Loader2, Check, BookOpen } from "lucide-react";

interface AddVerseFormProps {
  onAdd: (cards: Card[]) => void;
  onCancel?: () => void;
}

type FormState = "input" | "confirm" | "manual";

interface BookSelectorProps {
  selectedBook?: BibleBook;
  onSelect: (bookId: string) => void;
}

function BookSelector({ selectedBook, onSelect }: BookSelectorProps) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const query = search.toLowerCase();
  const books = query
    ? BIBLE_BOOKS.filter(
        (book) =>
          book.name.toLowerCase().includes(query) || book.id.toLowerCase().includes(query)
      )
    : BIBLE_BOOKS;

  useEffect(() => {
    if (!isOpen) return;
    const close = () => setIsOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [isOpen]);

  const selectBook = (bookId: string) => {
    onSelect(bookId);
    setSearch("");
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <label className="block text-sm font-medium mb-1.5 text-foreground">Book</label>
      <div className="relative" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full px-4 py-2.5 bg-background border border-border rounded-xl text-left focus:ring-2 focus:ring-ring outline-none transition-all flex items-center justify-between ${
            selectedBook ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          <span>{selectedBook?.name ?? "Select a book..."}</span>
          <BookOpen className="w-4 h-4 text-muted-foreground" />
        </button>

        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute z-20 w-full mt-1 bg-popover border border-border rounded-xl shadow-lg max-h-60 overflow-auto"
          >
            <div className="p-2 sticky top-0 bg-popover border-b border-border">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search books..."
                className="w-full px-3 py-1.5 bg-input border border-border rounded-xl text-sm focus:ring-2 focus:ring-ring outline-none"
                autoFocus
              />
            </div>
            <div className="py-1">
              {books.map((book) => (
                <button
                  key={book.id}
                  type="button"
                  onClick={() => selectBook(book.id)}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-muted transition-colors ${
                    selectedBook?.id === book.id ? "bg-muted" : ""
                  }`}
                >
                  <span className="font-medium text-foreground">{book.name}</span>
                  <span className="text-xs ml-2 text-muted-foreground">
                    {book.testament === "old" ? "OT" : "NT"} · {book.chapters} ch
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

interface TranslationSelectorProps {
  translation: TranslationId;
  onSelect: (translation: TranslationId) => void;
}

function TranslationSelector({ translation, onSelect }: TranslationSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {TRANSLATIONS.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onSelect(t.id)}
          className={`px-3.5 py-1.5 text-sm font-medium rounded-full border transition-colors ${
            translation === t.id
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-muted text-muted-foreground border-border hover:bg-accent hover:text-foreground"
          }`}
        >
          {t.id}
        </button>
      ))}
    </div>
  );
}

interface VerseImportConfirmationProps {
  results: LookupResult[];
  onEdit: (text: string) => void;
  onConfirm: () => void;
  onBack: () => void;
}

function VerseImportConfirmation({ results, onEdit, onConfirm, onBack }: VerseImportConfirmationProps) {
  return (
    <motion.div
      key="confirm"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-5"
    >
      <div className="flex items-center gap-2 bg-yv-green-10 text-yv-green-30 p-3 rounded-xl">
        <Check className="w-5 h-5" />
        <span className="font-medium">
          {results.length === 1
            ? "Verse fetched successfully!"
            : `${results.length} verses fetched — each will be added as its own card`}
        </span>
      </div>

      {results.length === 1 ? (
        <>
          <div>
            <label className="block text-sm font-medium mb-1.5 text-foreground">Reference</label>
            <div className="px-4 py-2.5 bg-muted border border-border rounded-xl font-medium text-foreground">
              {results[0].reference}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5 text-foreground">
              Verse Text
              <span className="text-xs font-normal ml-2 text-muted-foreground">(editable — correct if needed)</span>
            </label>
            <textarea
              value={results[0].text}
              onChange={(e) => onEdit(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 bg-background border border-border rounded-xl verse-text focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition-all resize-none text-foreground"
            />
          </div>
        </>
      ) : (
        <div>
          <label className="block text-sm font-medium mb-1.5 text-foreground">
            Verses preview
            <span className="text-xs font-normal ml-2 text-muted-foreground">
              — will be grouped automatically
            </span>
          </label>
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="max-h-56 overflow-y-auto divide-y divide-border">
              {results.map((r, i) => (
                <div key={i} className="px-4 py-2.5 hover:bg-muted transition-colors">
                  <p className="text-xs font-semibold mb-0.5 text-foreground">{r.reference}</p>
                  <p className="text-sm verse-text line-clamp-2 text-muted-foreground">{r.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={onConfirm}
          className="btn-primary flex-1 py-3 shadow-sm"
        >
          <BookPlus className="w-4 h-4" />
          {results.length === 1 ? "Add Verse" : `Add ${results.length} Verses`}
        </motion.button>
        <button onClick={onBack} className="btn-muted px-4 py-3">
          Back
        </button>
      </div>
    </motion.div>
  );
}

export function AddVerseForm({ onAdd, onCancel }: AddVerseFormProps) {
  const [selectedBook, setSelectedBook] = useState("");
  const [chapter, setChapter] = useState("");
  const [verseRange, setVerseRange] = useState("");
  const [translation, setTranslation] = useState<TranslationId>("ESV");
  const [manualReference, setManualReference] = useState("");
  const [manualText, setManualText] = useState("");
  const [formState, setFormState] = useState<FormState>("input");
  const [fetchedResults, setFetchedResults] = useState<LookupResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedBookData = BIBLE_BOOKS.find((book) => book.id === selectedBook);

  const handleBookSelect = (bookId: string) => {
    setSelectedBook(bookId);
    setChapter("");
    setVerseRange("");
    preloadTranslation(translation);
  };

  const multiChapter = parseVerseRange(chapter).length > 1;

  const handleFetchVerse = async () => {
    setError("");

    if (!selectedBook || !chapter.trim()) {
      setError("Please select a book and chapter");
      return;
    }

    const chapters = parseVerseRange(chapter);
    if (chapters.length === 0) {
      setError("Please enter a valid chapter or chapter range (e.g., 1 or 1-3)");
      return;
    }

    setIsLoading(true);
    try {
      const results = await lookupSelection(selectedBook, chapter, verseRange, translation);
      setFetchedResults(results);
      setFormState("confirm");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch verse. Try manual entry.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmAdd = () => {
    if (fetchedResults.length === 0) return;
    const cards = fetchedResults.map((r) => createCard(r.reference, r.text.trim(), translation));
    onAdd(cards);
    resetForm();
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!manualReference.trim()) {
      setError("Please enter a verse reference");
      return;
    }
    if (!manualText.trim()) {
      setError("Please enter the verse text");
      return;
    }
    const card = createCard(manualReference.trim(), manualText.trim(), translation);
    onAdd([card]);
    resetForm();
  };

  const resetForm = () => {
    setSelectedBook("");
    setChapter("");
    setVerseRange("");
    setTranslation("ESV");
    setManualReference("");
    setManualText("");
    setFetchedResults([]);
    setFormState("input");
    setError("");
  };

  const switchToManual = () => {
    setFormState("manual");
    setManualReference(selectedBookData ? `${selectedBookData.name} ${chapter}:${verseRange}` : "");
    setFetchedResults([]);
    setError("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="glass p-6 sm:p-8"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2 text-foreground font-serif">
          <BookPlus className="w-5 h-5 text-foreground" />
          Add New Verse
        </h2>
        {onCancel && (
          <button
            onClick={onCancel}
            className="transition-colors p-1 rounded-lg hover:bg-muted text-muted-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mb-4 p-3 bg-destructive/10 text-destructive rounded-xl text-sm flex items-center gap-2 border border-destructive/20"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {formState === "input" && (
          <motion.div
            key="input"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-5"
          >
            <BookSelector selectedBook={selectedBookData} onSelect={handleBookSelect} />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5 text-foreground">
                  Chapter(s)
                </label>
                <input
                  type="text"
                  value={chapter}
                  onChange={(e) => setChapter(e.target.value)}
                  placeholder="1 or 1-3"
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition-all text-foreground"
                />
                <p className="text-xs mt-1 text-muted-foreground">
                  {selectedBookData ? `Range: 1-3 · Max ${selectedBookData.chapters}` : "Range: 1-3 or single: 5"}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-foreground">
                  Verse(s)
                  <span className="text-xs font-normal ml-1.5 text-muted-foreground">(optional)</span>
                </label>
                <input
                  type="text"
                  value={verseRange}
                  onChange={(e) => setVerseRange(e.target.value)}
                  placeholder="All verses"
                  disabled={multiChapter}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition-all text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p className="text-xs mt-1 text-muted-foreground">
                  {multiChapter ? "Whole chapters imported" : "Blank = whole chapter"}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5 text-foreground">
                Translation
              </label>
              <TranslationSelector translation={translation} onSelect={setTranslation} />
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={handleFetchVerse}
              disabled={isLoading}
              className="btn-primary w-full py-3 shadow-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Fetching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Import from Bible
                </>
              )}
            </motion.button>

            <div className="text-center">
              <button
                type="button"
                onClick={switchToManual}
                className="text-sm underline transition-colors text-muted-foreground hover:text-foreground"
              >
                Or enter verse manually
              </button>
            </div>
          </motion.div>
        )}

        {formState === "confirm" && (
          <VerseImportConfirmation
            key="confirm"
            results={fetchedResults}
            onEdit={(text) => setFetchedResults([{ ...fetchedResults[0], text }])}
            onConfirm={handleConfirmAdd}
            onBack={() => setFormState("input")}
          />
        )}

        {formState === "manual" && (
          <motion.form
            key="manual"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onSubmit={handleManualSubmit}
            className="space-y-5"
          >
            <div>
              <label htmlFor="manual-reference" className="block text-sm font-medium mb-1.5 text-foreground">
                Reference
              </label>
              <input
                type="text"
                id="manual-reference"
                value={manualReference}
                onChange={(e) => setManualReference(e.target.value)}
                placeholder="e.g. John 3:16"
                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition-all text-foreground"
              />
            </div>

            <div>
              <label htmlFor="manual-translation" className="block text-sm font-medium mb-1.5 text-foreground">
                Translation
              </label>
              <TranslationSelector translation={translation} onSelect={setTranslation} />
            </div>

            <div>
              <label htmlFor="manual-text" className="block text-sm font-medium mb-1.5 text-foreground">
                Verse Text
              </label>
              <textarea
                id="manual-text"
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="Enter the verse text..."
                rows={4}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition-all resize-none verse-text text-foreground"
              />
            </div>

            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="submit"
                className="btn-primary flex-1 py-3 shadow-sm"
              >
                <BookPlus className="w-4 h-4" />
                Add Verse
              </motion.button>
              <button type="button" onClick={() => setFormState("input")} className="btn-muted px-4 py-3">
                Back
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
