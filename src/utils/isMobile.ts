export function isMobile(): boolean {
  if (typeof window === "undefined") return false;

  const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;

  const isSmallScreen = window.matchMedia("(max-width: 768px)").matches;

  return isTouch && isSmallScreen;
}
