import { useState, useEffect, useLayoutEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { loadCards, saveCards, loadStreak, saveStreak, loadReviewLog, addReviewToLog, loadCustomGroups, saveCustomGroups, loadLastSelection, saveLastSelection, sampleVerses } from "./lib/storage";
import { getDueCards, applyReview, resolveSelection } from "./lib/scheduling";
import { getOrganizedGroups } from "./lib/verseGroups";
import { AddVerseForm } from "./components/AddVerseForm";
import { ReviewCard, TypingReviewCard, FirstLetterReviewCard } from "./components/ReviewCard";
import { ReviewModeSelector, ReviewSelectionScreen } from "./components/ReviewSelectionScreen";
import { VerseList } from "./components/VerseList";
import { ProgressStats } from "./components/ProgressStats";
import type { Card, QualityRating, ReviewMode } from "./lib/scheduling";
import type { CustomGroup, ReviewSelection } from "./lib/storage";
import { BookOpen, Plus, List, BarChart2, Flame, ArrowLeft, Sun, Moon, Award } from "lucide-react";

type Tab = "review" | "add" | "list" | "stats";
type ReviewState = "selecting-filter" | "selecting-mode" | "reviewing";

const iconButtonClass = "w-9 h-9 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors";
const backButtonClass = "flex items-center gap-1 text-sm font-medium transition-colors text-muted-foreground hover:text-foreground";

const reviewCards = { flashcard: ReviewCard, typing: TypingReviewCard, "first-letter": FirstLetterReviewCard };

const tabs = [
  { id: "review", label: "Review", icon: BookOpen },
  { id: "add", label: "Add", icon: Plus },
  { id: "list", label: "Verses", icon: List },
  { id: "stats", label: "Progress", icon: BarChart2 },
] as const;

function App() {
  const [cards, setCards] = useState<Card[]>(
    () => loadCards()?.map((card) => ({ ...card, modesUsed: card.modesUsed || [] })) ?? sampleVerses
  );
  const [activeTab, setActiveTab] = useState<Tab>("review");
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains("dark"));
  const [streak, setStreak] = useState(loadStreak);
  const [reviewLog, setReviewLog] = useState(loadReviewLog);
  const [celebration, setCelebration] = useState<string | null>(null);
  const [reviewState, setReviewState] = useState<ReviewState>("selecting-filter");
  const [currentReviewMode, setCurrentReviewMode] = useState<ReviewMode | null>(null);
  const [customGroups, setCustomGroups] = useState(loadCustomGroups);
  const [currentReviewSelection, setCurrentReviewSelection] = useState<ReviewSelection | null>(null);
  const [lastSelection, setLastSelection] = useState(loadLastSelection);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useLayoutEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => saveCards(cards), [cards]);
  useEffect(() => saveCustomGroups(customGroups), [customGroups]);

  useEffect(() => {
    if (!celebration) return;
    const timer = setTimeout(() => setCelebration(null), 2500);
    return () => clearTimeout(timer);
  }, [celebration]);

  const allDueCards = useMemo(() => getDueCards(cards, now), [cards, now]);
  const { sequentialGroups } = useMemo(() => getOrganizedGroups(cards), [cards]);
  const filteredCards = useMemo(
    () => resolveSelection(currentReviewSelection, cards, customGroups, sequentialGroups),
    [cards, currentReviewSelection, customGroups, sequentialGroups]
  );
  const dueCards = useMemo(() => getDueCards(filteredCards, now), [filteredCards, now]);
  const currentCard = dueCards[0];

  const handleTabClick = (tab: Tab) => {
    if (tab === "review") handleBackToFilterSelection();
    setActiveTab(tab);
  };

  const handleAddCard = (newCards: Card[]) => {
    setCards((prev) => [...prev, ...newCards]);
    setActiveTab("list");
  };

  const replaceCard = (id: string, update: (card: Card) => Card) => {
    setCards((prev) => prev.map((c) => (c.id === id ? update(c) : c)));
  };

  const handleRateCard = (quality: QualityRating, accuracy?: number) => {
    if (!currentCard || !currentReviewMode) return;
    const outcome = applyReview(currentCard, currentReviewMode, quality, accuracy, streak);
    replaceCard(currentCard.id, () => outcome.card);
    setStreak(outcome.streak);
    saveStreak(outcome.streak);
    setReviewLog(addReviewToLog);
    if (outcome.celebration) setCelebration(outcome.celebration);
  };

  const handleSkipCard = () => {
    if (currentCard) replaceCard(currentCard.id, (c) => ({ ...c, nextReview: new Date(Date.now() + 5 * 60 * 1000) }));
  };

  const handleDeleteCard = (id: string) => {
    setCards((prev) => prev.filter((c) => c.id !== id));
    setCustomGroups((prev) => prev.map((g) => ({ ...g, cardIds: g.cardIds.filter((cid) => cid !== id) })));
  };

  const handleStartReview = () => {
    if (currentReviewMode) setReviewState("reviewing");
  };

  const handleBackToModeSelection = () => {
    setReviewState("selecting-mode");
    setCurrentReviewMode(null);
  };

  const handleBackToFilterSelection = () => {
    setReviewState("selecting-filter");
    setCurrentReviewMode(null);
    setCurrentReviewSelection(null);
  };

  const handleStudyGroup = (cardIds: string[], label: string) => {
    const existing = new Set(cards.map((c) => c.id));
    setCurrentReviewSelection({ type: "ad-hoc", name: label, cardIds: cardIds.filter((id) => existing.has(id)) });
    setActiveTab("review");
    handleBackToModeSelection();
  };

  const chooseSelection = (selection: ReviewSelection) => {
    setCurrentReviewSelection(selection);
    setLastSelection(selection);
    saveLastSelection(selection);
  };

  const handleSelectReviewFilter = (selection: ReviewSelection) => {
    chooseSelection(selection);
    setReviewState("selecting-mode");
  };

  const updateCustomGroup = (groupId: string, changes: Partial<CustomGroup>) => {
    setCustomGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, ...changes } : g)));
  };

  const handleCreateCustomGroup = (name: string) => {
    setCustomGroups((prev) => [...prev, { id: crypto.randomUUID(), name, cardIds: [], createdAt: new Date().toISOString() }]);
  };

  const SelectedReviewCard = reviewCards[currentReviewMode ?? "flashcard"];
  const reviewedPercent = ((filteredCards.length - dueCards.length) / Math.max(filteredCards.length, 1)) * 100;

  function renderReviewContent() {
    if (allDueCards.length === 0) {
      return (
        <div className="text-center py-16">
          <h2 className="text-2xl font-semibold mb-2 text-foreground font-serif">All caught up</h2>
          <p className="max-w-md mx-auto mb-6 text-sm text-muted-foreground">
            No verses are due. Add a verse or come back later.
          </p>
          <button onClick={() => setActiveTab("add")} className="btn-primary px-5">
            <Plus className="w-4 h-4" />
            Add a verse
          </button>
        </div>
      );
    }
    if (reviewState === "selecting-filter") {
      return (
        <ReviewSelectionScreen
          cards={cards}
          customGroups={customGroups}
          sequentialGroups={sequentialGroups}
          lastSelection={lastSelection}
          onSelect={handleSelectReviewFilter}
        />
      );
    }
    if (reviewState === "selecting-mode") {
      return (
        <>
          <button onClick={handleBackToFilterSelection} className={backButtonClass}>
            <ArrowLeft className="w-4 h-4" />
            Change selection
          </button>
          <ReviewModeSelector
            selectedMode={currentReviewMode}
            onSelectMode={setCurrentReviewMode}
            onStart={handleStartReview}
            scopeLabel={currentReviewSelection?.name}
            scopeCardCount={filteredCards.length}
          />
        </>
      );
    }
    return (
      <>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <button onClick={handleBackToModeSelection} className={backButtonClass}>
            <ArrowLeft className="w-4 h-4" />
            Change mode
          </button>
          <div className="flex items-center gap-3 text-sm">
            <button onClick={handleBackToFilterSelection} className="transition-colors text-muted-foreground hover:text-foreground">
              Change selection
            </button>
            <p className="text-muted-foreground tabular-nums">
              {dueCards.length} verse{dueCards.length !== 1 ? "s" : ""} due
            </p>
          </div>
        </div>
        <div className="w-full rounded-full h-1.5 max-w-xs mx-auto overflow-hidden bg-muted">
          <div className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out" style={{ width: `${reviewedPercent}%` }} />
        </div>
        {currentCard ? (
          <SelectedReviewCard card={currentCard} onRate={handleRateCard} onSkip={handleSkipCard} />
        ) : (
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold mb-2 text-foreground font-serif">All done</h3>
            <p className="text-sm mb-4 text-muted-foreground">
              No more verses are due in this selection.
            </p>
            <button onClick={handleBackToFilterSelection} className="btn-muted">
              Choose another selection
            </button>
          </div>
        )}
      </>
    );
  }

  const tabContent = {
    review: <div className="space-y-5">{renderReviewContent()}</div>,
    add: (
      <div className="max-w-xl mx-auto">
        <AddVerseForm onAdd={handleAddCard} onCancel={() => setActiveTab("review")} />
      </div>
    ),
    list: (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground">Your Verses</h2>
          <span className="text-sm text-muted-foreground">{cards.length} total</span>
        </div>
        <VerseList
          cards={cards}
          onDelete={handleDeleteCard}
          customGroups={customGroups}
          onStudyGroup={handleStudyGroup}
          onCreateCustomGroup={handleCreateCustomGroup}
          onUpdateCustomGroup={(groupId, cardIds) => updateCustomGroup(groupId, { cardIds })}
          onRenameCustomGroup={(groupId, name) => updateCustomGroup(groupId, { name })}
          onDeleteCustomGroup={(groupId) => setCustomGroups((prev) => prev.filter((g) => g.id !== groupId))}
        />
      </div>
    ),
    stats: <ProgressStats cards={cards} streak={streak} reviewLog={reviewLog} />,
  };

  return (
    <div className="min-h-screen pb-28">
      <AnimatePresence>
        {celebration && (
          <motion.div
            className="fixed inset-x-4 top-20 z-50 pointer-events-none flex justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="surface overlay-shadow px-5 py-3 flex items-center gap-3"
              initial={{ y: -6, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -6, opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              <Award className="w-5 h-5 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">{celebration}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <svg width="30" height="30" viewBox="0 0 30 30" fill="none" aria-hidden="true" className="text-foreground flex-shrink-0">
              <path d="M3 7C3 7 9 5 15 7V25C15 25 9 23 3 25V7Z" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
              <path d="M27 7C27 7 21 5 15 7V25C15 25 21 23 27 25V7Z" fill="currentColor" fillOpacity="0.06" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
              <line x1="15" y1="7" x2="15" y2="25" stroke="currentColor" strokeWidth="1.4" />
              <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <line x1="21" y1="12" x2="21" y2="20" />
                <line x1="18" y1="15.5" x2="24" y2="15.5" />
              </g>
            </svg>
            <span className="text-base font-semibold tracking-[-0.01em] text-foreground font-serif">Bible Memory</span>
          </div>
          <div className="flex items-center gap-2">
            {streak.currentStreak > 0 && (
              <div className="flex items-center gap-1 h-9 px-2" title={`${streak.currentStreak}-day streak`}>
                <Flame className="w-3.5 h-3.5 text-yv-orange-30" />
                <span className="text-sm font-semibold text-foreground tabular-nums">{streak.currentStreak}</span>
              </div>
            )}
            <button
              onClick={() => setDarkMode((d) => !d)}
              className={iconButtonClass}
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
            {tabContent[activeTab]}
          </motion.div>
        </AnimatePresence>
      </main>
      <nav className="fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-20 flex justify-center px-4">
        <div className="dock rounded-full flex items-center p-1.5">
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
                  <motion.div layoutId="dock-pill" className="absolute inset-0 rounded-full bg-primary" transition={{ duration: 0.18, ease: "easeOut" }} />
                )}
                <div className="relative">
                  <tab.icon className="w-5 h-5" />
                  {tab.id === "review" && allDueCards.length > 0 && (
                    <span
                      className={`absolute -top-1 -right-2.5 min-w-[16px] h-4 px-1 flex items-center justify-center text-[10px] font-semibold rounded-full tabular-nums ${
                        isActive ? "bg-primary-foreground text-primary" : "bg-foreground text-background"
                      }`}
                    >
                      {allDueCards.length}
                    </span>
                  )}
                </div>
                <span className="relative text-xs font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default App;
