import { useCallback } from "react";
import confetti from "canvas-confetti";

export function useConfetti() {
  const fireConfetti = useCallback(() => {
    // Fire confetti from the center-bottom of the screen
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.7 },
      colors: ['#4CAF50', '#2196F3', '#FFC107', '#E91E63', '#9C27B0'],
      ticks: 200,
    });
  }, []);

  return fireConfetti;
}
