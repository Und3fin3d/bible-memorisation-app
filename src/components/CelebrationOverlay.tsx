import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import { Award } from "lucide-react";

interface CelebrationOverlayProps {
  show: boolean;
  message?: string;
  onComplete?: () => void;
}

export function CelebrationOverlay({
  show,
  message = "Well done!",
  onComplete,
}: CelebrationOverlayProps) {
  useEffect(() => {
    if (show && onComplete) {
      const timer = setTimeout(onComplete, 2500);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-x-4 top-20 z-50 pointer-events-none flex justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="glass px-5 py-3 flex items-center gap-3"
            initial={{ y: -6, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -6, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <div className="text-muted-foreground">
              <Award className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-foreground">
              {message}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
