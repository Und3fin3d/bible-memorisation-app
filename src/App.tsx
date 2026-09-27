import { useState, useEffect, useLayoutEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { loadCards, saveCards, loadStreak, saveStreak, loadReviewLog, addReviewToLog, loadCustomGroups, saveCustomGroups, loadLastSelection, saveLastSelection } from "./lib/storage";
import { getDueCards, applyReview, resolveSelection } from "./lib/sm2";
import { sampleVerses } from "./lib/sampleData";
import { getOrganizedGroups } from "./lib/verseGroups";
import { AddVerseForm } from "./components/AddVerseForm";
import { ReviewCard } from "./components/ReviewCard";
import { TypingReviewCard } from "./components/TypingReviewCard";
import { FirstLetterReviewCard } from "./components/FirstLetterReviewCard";
import { ReviewModeSelector } from "./components/ReviewModeSelector";
import { ReviewSelectionScreen } from "./components/ReviewSelectionScreen";
import { VerseList } from "./components/VerseList";
import { ProgressStats } from "./components/ProgressStats";
import { CelebrationOverlay } from "./components/CelebrationOverlay";
import { QuickStartTutorial } from "./components/QuickStartTutorial";
import type { Card, QualityRating, ReviewMode } from "./lib/sm2";
import type { StreakData, DailyReviewLog, CustomGroup, ReviewSelection } from "./lib/storage";
import { BookOpen, Plus, List, BarChart2, Flame, Sparkles, ArrowLeft, Sun, Moon, CircleHelp } from "lucide-react";

type Tab = "review" | "add" | "list" | "stats";
type ReviewState = "selecting-filter" | "selecting-mode" | "reviewing";

const TUTORIAL_STORAGE_KEY = "bible-memory-quick-start-v1";

const reviewCards = { flashcard: ReviewCard, typing: TypingReviewCard, "first-letter": FirstLetterReviewCard };

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "review", label: "Review", icon: BookOpen },
  { id: "add", label: "Add", icon: Plus },
  { id: "list", label: "Verses", icon: List },
  { id: "stats", label: "Progress", icon: BarChart2 },
];

function App() {
  const [cards, setCards] = useState<Card[]>(() => {
    const stored = loadCards();
    if (stored === null) return sampleVerses;
    return stored.map((card) => ({ ...card, modesUsed: card.modesUsed || [] }));
  });
  const [activeTab, setActiveTab] = useState<Tab>("review");
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem("theme");
    if (stored) return stored === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  const [streak, setStreak] = useState<StreakData>(loadStreak);
  const [reviewLog, setReviewLog] = useState<DailyReviewLog>(loadReviewLog);
  const [celebration, setCelebration] = useState<string | null>(null);
  const [reviewState, setReviewState] = useState<ReviewState>("selecting-filter");
  const [currentReviewMode, setCurrentReviewMode] = useState<ReviewMode | null>(null);
  const [customGroups, setCustomGroups] = useState<CustomGroup[]>(loadCustomGroups);
  const [currentReviewSelection, setCurrentReviewSelection] = useState<ReviewSelection | null>(null);
  const [lastSelection, setLastSelection] = useState<ReviewSelection | null>(loadLastSelection);
  const [showTutorial, setShowTutorial] = useState(
    () => localStorage.getItem(TUTORIAL_STORAGE_KEY) !== "complete"
  );
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", darkMode);
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => saveCards(cards), [cards]);
  useEffect(() => saveCustomGroups(customGroups), [customGroups]);

  const handleTabClick = (tab: Tab) => {
    if (tab === "review") handleBackToFilterSelection();
    setActiveTab(tab);
  };

  const allDueCards = useMemo(() => getDueCards(cards), [cards]);
  const { sequentialGroups } = useMemo(() => getOrganizedGroups(cards), [cards]);
  const filteredCards = useMemo(
    () => resolveSelection(currentReviewSelection, cards, customGroups, sequentialGroups),
    [cards, currentReviewSelection, customGroups, sequentialGroups]
  );

  const dueCards = useMemo(() => getDueCards(filteredCards), [filteredCards]);
  const currentCard = dueCards[0];

  const handleAddCard = (cards: Card[]) => {
    setCards((prev) => [...prev, ...cards]);
    setActiveTab("list");
  };

  const handleRateCard = (quality: QualityRating, accuracy?: number) => {
    if (!currentCard || !currentReviewMode) return;

    const outcome = applyReview(currentCard, currentReviewMode, quality, accuracy, streak);

    setCards((prev) =>
      prev.map((c) => (c.id === currentCard.id ? outcome.card : c))
    );
    setStreak(outcome.streak);
    saveStreak(outcome.streak);
    setReviewLog((prev) => addReviewToLog(prev));
    if (outcome.celebration) setCelebration(outcome.celebration);
  };

  const handleDeleteCard = (id: string) => {
    setCards((prev) => prev.filter((c) => c.id !== id));
    setCustomGroups((prev) =>
      prev.map((g) => ({ ...g, cardIds: g.cardIds.filter((cid) => cid !== id) }))
    );
  };

  const handleSkipCard = () => {
    if (!currentCard) return;
    setCards((prev) =>
      prev.map((c) =>
        c.id === currentCard.id
          ? { ...c, nextReview: new Date(Date.now() + 5 * 60 * 1000) }
          : c
      )
    );
  };

  const handleStartReview = () => {
    if (currentReviewMode) {
      setReviewState("reviewing");
    }
  };

  const handleBackToModeSelection = () => {
    setReviewState("selecting-mode");
    setCurrentReviewMode(null);
  };

  const handleStudyGroup = (cardIds: string[], label: string) => {
    const existing = new Set(cards.map((c) => c.id));
    const validIds = cardIds.filter((id) => existing.has(id));
    setCurrentReviewSelection({ type: "ad-hoc", name: label, cardIds: validIds });
    setActiveTab("review");
    setReviewState("selecting-mode");
    setCurrentReviewMode(null);
  };
  const handleSelectReviewFilter = (selection: ReviewSelection) => {
    setCurrentReviewSelection(selection);
    setLastSelection(selection);
    saveLastSelection(selection);
    setReviewState("selecting-mode");
  };

  const handleBackToFilterSelection = () => {
    setReviewState("selecting-filter");
    setCurrentReviewMode(null);
    setCurrentReviewSelection(null);
  };

  const handleCreateCustomGroup = (name: string) => {
    const group: CustomGroup = {
      id: crypto.randomUUID(),
      name,
      cardIds: [],
      createdAt: new Date().toISOString(),
    };
    setCustomGroups((prev) => [...prev, group]);
  };

  const handleUpdateCustomGroup = (groupId: string, cardIds: string[]) => {
    setCustomGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, cardIds } : g))
    );
  };

  const handleRenameCustomGroup = (groupId: string, name: string) => {
    setCustomGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, name } : g))
    );
  };

  const handleDeleteCustomGroup = (groupId: string) => {
    setCustomGroups((prev) => prev.filter((g) => g.id !== groupId));
  };

  const closeTutorial = () => {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, "complete");
    setShowTutorial(false);
  };

  const startGuidedReview = () => {
    closeTutorial();
    const selection: ReviewSelection = { type: "all", name: "Study All Verses" };
    setCurrentReviewSelection(selection);
    setLastSelection(selection);
    saveLastSelection(selection);
    setCurrentReviewMode("flashcard");
    setReviewState("reviewing");
    setActiveTab("review");
  };

  const SelectedReviewCard = reviewCards[currentReviewMode ?? "flashcard"];
  const selectionName = currentReviewSelection?.name || "this selection";

  function renderReviewContent() {
    if (allDueCards.length === 0) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-16"
        >
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 glass">
            <Sparkles className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-2 text-foreground font-serif">
            All caught up!
          </h2>
          <p className="max-w-md mx-auto mb-6 text-sm text-muted-foreground">
            No verses due for review. Come back later or add more to your collection.
          </p>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setActiveTab("add")}
            className="btn-primary px-6 py-3 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add a Verse
          </motion.button>
        </motion.div>
      );
    }

    return (
      <>
        {reviewState === "selecting-filter" && (
          <ReviewSelectionScreen
            cards={cards}
            customGroups={customGroups}
            sequentialGroups={sequentialGroups}
            lastSelection={lastSelection}
            onSelect={handleSelectReviewFilter}
          />
        )}

        {reviewState === "selecting-mode" && (
          <>
            <button
              onClick={handleBackToFilterSelection}
              className="flex items-center gap-1 text-sm font-medium transition-colors text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
              Change selection
            </button>
            <ReviewModeSelector
              selectedMode={currentReviewMode}
              onSelectMode={setCurrentReviewMode}
              onStart={handleStartReview}
              scopeLabel={currentReviewSelection?.name}
              scopeCardCount={filteredCards.length}
              onClearScope={currentReviewSelection?.type !== "all" ? handleBackToFilterSelection : undefined}
            />
          </>
        )}

        {reviewState === "reviewing" && (
          <>
            <div className="flex items-center justify-between">
              <button
                onClick={handleBackToModeSelection}
                className="flex items-center gap-1 text-sm font-medium transition-colors text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4" />
                Change mode
              </button>
              <div className="flex items-center gap-3 text-sm">
                <button
                  onClick={handleBackToFilterSelection}
                  className="transition-colors text-muted-foreground hover:text-foreground"
                >
                  Change selection
                </button>
                <p className="text-muted-foreground tabular-nums">
                  {dueCards.length} verse{dueCards.length !== 1 ? "s" : ""} due
                </p>
              </div>
            </div>
            <div className="w-full rounded-full h-1.5 max-w-xs mx-auto overflow-hidden bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
                style={{
                  width: `${((filteredCards.length - dueCards.length) / Math.max(filteredCards.length, 1)) * 100}%`,
                }}
              />
            </div>
            {currentCard ? (
              <SelectedReviewCard card={currentCard} onRate={handleRateCard} onSkip={handleSkipCard} />
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12"
              >
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 glass">
                  <Sparkles className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-foreground">
                  All done for this selection!
                </h3>
                <p className="text-sm mb-4 text-muted-foreground">
                  No more verses due in {selectionName}.
                </p>
                <button onClick={handleBackToFilterSelection} className="btn-muted">
                  Study something else
                </button>
              </motion.div>
            )}
          </>
        )}
      </>
    );
  }

  function renderContent() {
    switch (activeTab) {
      case "review":
        return <div className="space-y-5">{renderReviewContent()}</div>;

      case "add":
        return (
          <div className="max-w-xl mx-auto">
            <AddVerseForm
              onAdd={handleAddCard}
              onCancel={() => setActiveTab("review")}
            />
          </div>
        );

      case "list":
        return (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground">
                Your Verses
              </h2>
              <span className="text-sm text-muted-foreground">
                {cards.length} total
              </span>
            </div>
            <VerseList
              cards={cards}
              onDelete={handleDeleteCard}
              customGroups={customGroups}
              onStudyGroup={handleStudyGroup}
              onCreateCustomGroup={handleCreateCustomGroup}
              onUpdateCustomGroup={handleUpdateCustomGroup}
              onRenameCustomGroup={handleRenameCustomGroup}
              onDeleteCustomGroup={handleDeleteCustomGroup}
            />
          </div>
        );

      case "stats":
        return <ProgressStats cards={cards} streak={streak} reviewLog={reviewLog} />;
    }
  }

  return (
    <div className="min-h-screen pb-28">
      <CelebrationOverlay
        show={!!celebration}
        message={celebration ?? ""}
        onComplete={() => setCelebration(null)}
      />
      <QuickStartTutorial
        open={showTutorial}
        onClose={closeTutorial}
        onStartReview={startGuidedReview}
      />
      <header className="sticky top-0 z-10 glass-chrome border-b border-border/60">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <svg
              width="30" height="30" viewBox="0 0 30 30" fill="none"
              xmlns="http://www.w3.org/2000/svg" aria-hidden="true"
              className="text-foreground flex-shrink-0"
            >
              <path d="M3 7C3 7 9 5 15 7V25C15 25 9 23 3 25V7Z"
                fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
              <path d="M27 7C27 7 21 5 15 7V25C15 25 21 23 27 25V7Z"
                fill="currentColor" fillOpacity="0.06" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
              <line x1="15" y1="7" x2="15" y2="25" stroke="currentColor" strokeWidth="1.4" />
              <line x1="21" y1="12" x2="21" y2="20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="18" y1="15.5" x2="24" y2="15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span className="text-[15px] font-bold tracking-tight text-foreground font-serif">
              Bible Memory
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTutorial(true)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label="Open quick start"
              title="Quick start"
            >
              <CircleHelp className="w-4 h-4" />
            </button>
            {streak.currentStreak > 0 && (
              <div
                className="flex items-center gap-1.5 h-8 px-2.5 rounded-full bg-muted"
                title={`${streak.currentStreak}-day streak`}
              >
                <Flame className="w-3.5 h-3.5 text-yv-orange-30" />
                <span className="text-sm font-semibold text-foreground tabular-nums">
                  {streak.currentStreak}
                </span>
              </div>
            )}
            <button
              onClick={() => setDarkMode(d => !d)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-6 sm:py-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.13 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>
      <nav
        aria-hidden={showTutorial || undefined}
        className={`fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-20 justify-center px-4 ${showTutorial ? "hidden" : "flex"}`}
      >
        <div className="glass glass-dock rounded-full flex items-center p-1.5">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                aria-current={isActive ? "page" : undefined}
                className={`relative flex flex-col items-center justify-center gap-0.5 px-4 sm:px-6 py-2 rounded-full transition-colors ${
                  isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="dock-pill"
                    className="absolute inset-0 rounded-full bg-primary"
                    transition={{ duration: 0.18, ease: "easeOut" }}
                  />
                )}
                <div className="relative">
                  <tab.icon className="w-5 h-5" />
                  {tab.id === "review" && allDueCards.length > 0 && (
                    <span
                      className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 flex items-center justify-center text-[10px] font-medium text-foreground rounded-full bg-muted tabular-nums"
                    >
                      {allDueCards.length}
                    </span>
                  )}
                </div>
                <span className="relative text-xs font-medium">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default App;
