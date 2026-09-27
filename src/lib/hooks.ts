import { useEffect, useEffectEvent } from "react";

type KeyHandler = (e: KeyboardEvent) => void;

export function useKeyboardShortcuts(handlers: Record<string, KeyHandler>) {
  const handler = useEffectEvent((e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

    const keyHandler = handlers[e.key.toLowerCase()];
    if (!keyHandler) return;
    e.preventDefault();
    keyHandler(e);
  });

  useEffect(() => {
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
