import { useRef } from "react";

function nextFrame(callback) {
  window.requestAnimationFrame(() => window.requestAnimationFrame(callback));
}

export function useJourneyScroll() {
  const originScroll = useRef(0);
  return {
    open(action) {
      originScroll.current = window.scrollY;
      action();
      nextFrame(() => window.scrollTo(0, 0));
    },
    advance(action) {
      action();
      nextFrame(() => window.scrollTo(0, 0));
    },
    returnTo(action) {
      const position = originScroll.current;
      action();
      nextFrame(() => window.scrollTo(0, position));
    },
  };
}
