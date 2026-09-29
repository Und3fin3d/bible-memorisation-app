import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Popover, ToggleGroup } from "radix-ui";
import { Command } from "cmdk";
import { createCard, type Card } from "../lib/sm2";
import { BIBLE_BOOKS, TRANSLATIONS, parseVerseRange, type BibleBook, type TranslationId } from "../lib/bibleData";
import { lookupSelection, preloadTranslation, type LookupResult } from "../lib/bibleLocal";
import { BookPlus, X, AlertCircle, Search, Loader2, Check, ChevronsUpDown } from "lucide-react";

const inputClass = "w-full px-4 py-2.5 bg-input border border-border rounded-xl focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition-all text-foreground";
const hintClass = "text-xs font-normal text-muted-foreground";
const slide = (dx: number) => ({ initial: { opacity: 0, x: dx }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -dx } });

interface FieldProps {
  label: React.ReactNode;
  htmlFor?: string;
  id?: string;
  children: React.ReactNode;
}

function Field({ label, htmlFor, id, children }: FieldProps) {
  return (
    <div>
      <label id={id} htmlFor={htmlFor} className="block text-sm font-medium mb-1.5 text-foreground">{label}</label>
      {children}
    </div>
  );
}

interface BookSelectorProps {
  selectedBook?: BibleBook;
  onSelectBook: (bookId: string) => void;
}

function BookSelector({ selectedBook, onSelectBook }: BookSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Field label="Book" id="book-label" htmlFor="book-selector">
      <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
        <Popover.Trigger
          id="book-selector"
          aria-labelledby="book-label book-value"
          className={`w-full px-4 py-2.5 bg-input border border-border rounded-xl text-left outline-none transition-colors hover:border-foreground/30 flex items-center justify-between ${selectedBook ? "text-foreground" : "text-muted-foreground"}`}
        >
          <span id="book-value">{selectedBook?.name ?? "Select a book..."}</span>
          <ChevronsUpDown className="w-4 h-4 text-muted-foreground" />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={4}
            className="z-50 w-(--radix-popover-trigger-width) rounded-xl border border-border bg-popover text-popover-foreground overlay-shadow outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[side=bottom]:slide-in-from-top-1"
          >
            <Command className="flex flex-col overflow-hidden rounded-xl">
              <div className="flex items-center gap-2 border-b border-border px-3">
                <Search className="w-4 h-4 shrink-0 text-muted-foreground" />
                <Command.Input placeholder="Search books..." aria-label="Search books" className="h-10 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground" />
              </div>
              <Command.List className="max-h-64 overflow-y-auto overscroll-contain p-1">
                <Command.Empty className="py-6 text-center text-sm text-muted-foreground">No book found</Command.Empty>
                {BIBLE_BOOKS.map((book) => (
                  <Command.Item
                    key={book.id}
                    value={book.id}
                    keywords={[book.name]}
                    onSelect={() => {
                      onSelectBook(book.id);
                      setIsOpen(false);
                    }}
                    className="flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none data-[selected=true]:bg-muted"
                  >
                    <span className="font-medium text-foreground">{book.name}</span>
                    <span className="text-xs text-muted-foreground">{book.testament === "old" ? "OT" : "NT"} · {book.chapters} ch</span>
                    {selectedBook?.id === book.id && <Check className="w-4 h-4 ml-auto text-foreground" />}
                  </Command.Item>
                ))}
              </Command.List>
            </Command>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </Field>
  );
}

interface TranslationSelectorProps {
  translation: TranslationId;
  onSelectTranslation: (translation: TranslationId) => void;
}

function TranslationSelector({ translation, onSelectTranslation }: TranslationSelectorProps) {
  return (
    <ToggleGroup.Root
      type="single"
      aria-label="Translation"
      className="grid grid-cols-6 w-full sm:flex sm:w-fit flex-wrap gap-1 p-1 rounded-xl bg-muted"
      value={translation}
      onValueChange={(value) => value && onSelectTranslation(value as TranslationId)}
    >
      {TRANSLATIONS.map((t) => (
        <ToggleGroup.Item
          key={t.id}
          value={t.id}
          className="px-3 py-1.5 text-sm font-medium rounded-lg text-muted-foreground transition-colors hover:text-foreground data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-[0_1px_2px_oklch(0_0_0/0.08)]"
        >
          {t.id}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}

interface FormActionsProps {
  label: string;
  onConfirm?: () => void;
  onBack: () => void;
}

function FormActions({ label, onConfirm, onBack }: FormActionsProps) {
  return (
    <div className="flex gap-3">
      <button type={onConfirm ? "button" : "submit"} onClick={onConfirm} className="btn-primary flex-1 py-3">
        <BookPlus className="w-4 h-4" />
        {label}
      </button>
      <button type="button" onClick={onBack} className="btn-muted px-4 py-3">Back</button>
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
  const single = results.length === 1;
  return (
    <motion.div key="confirm" {...slide(20)} className="space-y-5">
      <div className="flex items-center gap-2 bg-yv-green-10 text-yv-green-30 p-3 rounded-xl">
        <Check className="w-5 h-5" />
        <span className="font-medium">{single ? "Verse fetched successfully!" : `${results.length} verses fetched — each will be added as its own card`}</span>
      </div>
      {single && (
        <>
          <Field label="Reference">
            <div className="px-4 py-2.5 bg-muted border border-border rounded-xl font-medium text-foreground">{results[0].reference}</div>
          </Field>
          <Field label={<>Verse Text<span className={`${hintClass} ml-2`}>(editable — correct if needed)</span></>}>
            <textarea value={results[0].text} onChange={(e) => onEdit(e.target.value)} rows={4} className="w-full px-4 py-3 bg-input border border-border rounded-xl verse-text focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition-all resize-none text-foreground" />
          </Field>
        </>
      )}
      {!single && (
        <Field label={<>Verses preview<span className={`${hintClass} ml-2`}>— will be grouped automatically</span></>}>
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
        </Field>
      )}
      <FormActions label={single ? "Add Verse" : `Add ${results.length} Verses`} onConfirm={onConfirm} onBack={onBack} />
    </motion.div>
  );
}

interface AddVerseFormProps {
  onAdd: (cards: Card[]) => void;
  onCancel?: () => void;
}

export function AddVerseForm({ onAdd, onCancel }: AddVerseFormProps) {
  const [selectedBook, setSelectedBook] = useState("");
  const [chapter, setChapter] = useState("");
  const [verseRange, setVerseRange] = useState("");
  const [translation, setTranslation] = useState<TranslationId>("ESV");
  const [manualReference, setManualReference] = useState("");
  const [manualText, setManualText] = useState("");
  const [formState, setFormState] = useState<"input" | "confirm" | "manual">("input");
  const [fetchedResults, setFetchedResults] = useState<LookupResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedBookData = BIBLE_BOOKS.find((book) => book.id === selectedBook);
  const chapters = parseVerseRange(chapter);
  const multiChapter = chapters.length > 1;

  const handleBookSelect = (bookId: string) => {
    setSelectedBook(bookId);
    setChapter("");
    setVerseRange("");
    preloadTranslation(translation);
  };

  const handleFetchVerse = async () => {
    setError("");
    if (!selectedBook || !chapter.trim()) return setError("Please select a book and chapter");
    if (chapters.length === 0) return setError("Please enter a valid chapter or chapter range (e.g., 1 or 1-3)");
    setIsLoading(true);
    try {
      setFetchedResults(await lookupSelection(selectedBook, chapter, verseRange, translation));
      setFormState("confirm");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch verse. Try manual entry.");
    } finally {
      setIsLoading(false);
    }
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

  const addCards = (entries: { reference: string; text: string }[]) => {
    onAdd(entries.map((entry) => createCard(entry.reference, entry.text.trim(), translation)));
    resetForm();
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualReference.trim()) return setError("Please enter a verse reference");
    if (!manualText.trim()) return setError("Please enter the verse text");
    addCards([{ reference: manualReference.trim(), text: manualText }]);
  };

  const switchToManual = () => {
    setFormState("manual");
    setManualReference(selectedBookData ? `${selectedBookData.name} ${chapter}:${verseRange}` : "");
    setError("");
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="surface p-6 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-foreground font-serif tracking-[-0.01em]">Add New Verse</h2>
        {onCancel && (
          <button onClick={onCancel} className="w-9 h-9 flex items-center justify-center rounded-full transition-colors hover:bg-muted hover:text-foreground text-muted-foreground" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {error && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} role="alert" className="mb-4 p-3 bg-destructive/10 text-destructive rounded-xl text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {formState === "input" && (
          <motion.div key="input" {...slide(-20)} className="space-y-5">
            <BookSelector selectedBook={selectedBookData} onSelectBook={handleBookSelect} />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Chapter(s)">
                <input type="text" value={chapter} onChange={(e) => setChapter(e.target.value)} placeholder="1 or 1-3" className={inputClass} />
                <p className="text-xs mt-1 text-muted-foreground">{selectedBookData ? `Range: 1-3 · Max ${selectedBookData.chapters}` : "Range: 1-3 or single: 5"}</p>
              </Field>
              <Field label={<>Verse(s)<span className={`${hintClass} ml-1.5`}>(optional)</span></>}>
                <input
                  type="text"
                  value={verseRange}
                  onChange={(e) => setVerseRange(e.target.value)}
                  placeholder="All verses"
                  disabled={multiChapter}
                  className={`${inputClass} disabled:opacity-50 disabled:cursor-not-allowed`}
                />
                <p className="text-xs mt-1 text-muted-foreground">{multiChapter ? "Whole chapters imported" : "Blank = whole chapter"}</p>
              </Field>
            </div>
            <Field label="Translation">
              <TranslationSelector translation={translation} onSelectTranslation={setTranslation} />
            </Field>
            <button onClick={handleFetchVerse} disabled={isLoading} className="btn-primary w-full py-3">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {isLoading ? "Fetching..." : "Import from Bible"}
            </button>
            <div className="text-center">
              <button type="button" onClick={switchToManual} className="text-sm underline transition-colors text-muted-foreground hover:text-foreground">
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
            onConfirm={() => fetchedResults.length > 0 && addCards(fetchedResults)}
            onBack={() => setFormState("input")}
          />
        )}

        {formState === "manual" && (
          <motion.form key="manual" {...slide(20)} onSubmit={handleManualSubmit} className="space-y-5">
            <Field label="Reference" htmlFor="manual-reference">
              <input type="text" id="manual-reference" value={manualReference} onChange={(e) => setManualReference(e.target.value)} placeholder="e.g. John 3:16" className={inputClass} />
            </Field>
            <Field label="Translation" htmlFor="manual-translation">
              <TranslationSelector translation={translation} onSelectTranslation={setTranslation} />
            </Field>
            <Field label="Verse Text" htmlFor="manual-text">
              <textarea
                id="manual-text"
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="Enter the verse text..."
                rows={4}
                className={`${inputClass} resize-none verse-text`}
              />
            </Field>
            <FormActions label="Add Verse" onBack={() => setFormState("input")} />
          </motion.form>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
