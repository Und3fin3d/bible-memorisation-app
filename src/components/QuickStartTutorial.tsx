import { useEffect, useEffectEvent, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

interface QuickStartTutorialProps {
  open: boolean;
  onClose: () => void;
  onStartReview: () => void;
}

const steps = [
  {
    title: "Start with a few familiar verses",
    description:
      "We’ve added sample verses so you can try the app immediately. Add your own whenever you’re ready.",
    takeaway: "Choose all verses or a smaller collection before each session.",
  },
  {
    title: "Remember first, then reveal",
    description:
      "When you see a reference, pause and say the verse from memory. Reveal it only after you’ve made a real attempt.",
    takeaway: "The effort to retrieve the words is what strengthens your memory.",
  },
  {
    title: "Rate the attempt honestly",
    description:
      "Again, Hard, Good, and Easy decide when the verse returns. An honest rating builds the right practice rhythm.",
    takeaway: "You don’t need to be perfect—short, consistent reviews win.",
  },
];

export function QuickStartTutorial({ open, onClose, onStartReview }: QuickStartTutorialProps) {
  const [step, setStep] = useState(0);

  const handleClose = () => {
    setStep(0);
    onClose();
  };

  const handleStartReview = () => {
    setStep(0);
    onStartReview();
  };

  const closeFromKeyboard = useEffectEvent(handleClose);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeFromKeyboard();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const current = steps[step];
  const isLastStep = step === steps.length - 1;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 p-0 sm:p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="presentation"
        >
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-start-title"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="glass !bg-background w-full max-w-lg max-h-[100dvh] sm:max-h-[calc(100dvh-2rem)] rounded-b-none sm:rounded-2xl overflow-y-auto"
          >
            <div className="flex items-center justify-between px-5 sm:px-7 pt-5 sm:pt-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Quick start · {step + 1} of {steps.length}
                </p>
                <div className="flex gap-1.5 mt-2" aria-hidden="true">
                  {steps.map((_, index) => (
                    <span
                      key={index}
                      className={`h-1 rounded-full transition-all ${
                        index === step ? "w-7 bg-foreground" : "w-3 bg-border"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <button
                onClick={handleClose}
                className="w-9 h-9 rounded-full flex items-center justify-center bg-muted text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close quick start"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 sm:px-7 py-7 sm:py-9">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.16 }}
                >
                  <h2 id="quick-start-title" className="font-serif text-2xl sm:text-3xl font-semibold text-foreground">
                    {current.title}
                  </h2>
                  <p className="mt-3 text-sm sm:text-base leading-relaxed text-muted-foreground max-w-md mx-auto">
                    {current.description}
                  </p>
                  <p className="mt-6 pt-5 border-t border-border/60 text-sm leading-relaxed text-foreground">
                    {current.takeaway}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="border-t border-border/60 px-5 sm:px-7 py-4 flex items-center gap-3">
              {step > 0 ? (
                <button onClick={() => setStep(step - 1)} className="btn-muted px-3" aria-label="Previous tutorial step">
                  <ChevronLeft className="w-4 h-4" />
                </button>
              ) : (
                <button onClick={handleClose} className="btn-ghost px-2">
                  Skip for now
                </button>
              )}
              <button
                onClick={() => (isLastStep ? handleStartReview() : setStep(step + 1))}
                className="btn-primary flex-1 py-3"
              >
                {isLastStep ? "Try a guided review" : "Next"}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
