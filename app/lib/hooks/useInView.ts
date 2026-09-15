"use client";

import { useEffect, useRef, useState } from 'react';

/**
 * True once the element has scrolled into view, and stays true afterward
 * (a one-shot reveal, not a repeated flicker on every scroll past it).
 * Respects prefers-reduced-motion by not being the caller's concern — callers
 * that animate on this flag should also gate the animation itself on
 * `motion-reduce:` so the content is simply visible immediately either way.
 */
export function useInView<T extends HTMLElement>(threshold = 0.15) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView };
}
