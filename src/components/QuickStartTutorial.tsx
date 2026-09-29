import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./ui";

interface QuickStartTutorialProps {
  open: boolean;
  onClose: () => void;
  onStartReview: () => void;
}

const steps = [
  {
    title: "Start with a few familiar verses",
    description: "We’ve added sample verses so you can try the app immediately. Add your own whenever you’re ready.",
    takeaway: "Choose all verses or a smaller collection before each session.",
  },
  {
    title: "Remember first, then reveal",
    description: "When you see a reference, pause and say the verse from memory. Reveal it only after you’ve made a real attempt.",
    takeaway: "The effort to retrieve the words is what strengthens your memory.",
  },
  {
    title: "Rate the attempt honestly",
    description: "Again, Hard, Good, and Easy decide when the verse returns. An honest rating builds the right practice rhythm.",
    takeaway: "You don’t need to be perfect—short, consistent reviews win.",
  },
];

export function QuickStartTutorial({ open, onClose, onStartReview }: QuickStartTutorialProps) {
  const [step, setStep] = useState(0);

  const finish = (onFinish: () => void) => {
    setStep(0);
    onFinish();
  };

  const current = steps[step];
  const isLastStep = step === steps.length - 1;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && finish(onClose)}>
      <DialogContent
        sheetOnMobile
        className="sm:max-w-lg overflow-y-auto"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          (event.currentTarget as HTMLElement).focus();
        }}
      >
        <div className="px-5 sm:px-7 pt-5 sm:pt-6 pr-16">
          <p className="text-sm font-medium text-muted-foreground tabular-nums">Quick start · {step + 1} of {steps.length}</p>
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

        <div className="px-5 sm:px-7 py-7 sm:py-9">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.16 }}
            >
              <DialogTitle className="font-serif text-2xl sm:text-3xl font-semibold tracking-[-0.01em]">
                {current.title}
              </DialogTitle>
              <DialogDescription className="mt-3 text-base leading-relaxed max-w-md">
                {current.description}
              </DialogDescription>
              <p className="mt-6 pt-5 border-t border-border text-sm leading-relaxed text-foreground">
                {current.takeaway}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="border-t border-border px-5 sm:px-7 py-4 flex items-center gap-3">
          {step > 0 ? (
            <button onClick={() => setStep(step - 1)} className="btn-muted px-3" aria-label="Previous tutorial step">
              <ChevronLeft className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={() => finish(onClose)} className="btn-ghost px-2">Skip for now</button>
          )}
          <button onClick={() => (isLastStep ? finish(onStartReview) : setStep(step + 1))} className="btn-primary flex-1 py-3">
            {isLastStep ? "Try a guided review" : "Next"}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
