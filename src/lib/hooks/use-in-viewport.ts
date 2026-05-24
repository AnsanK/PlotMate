"use client";

import { useEffect, useRef, useState } from "react";

interface UseInViewportOptions {
  rootMargin?: string;
  threshold?: number;
}

export function useInViewport<T extends HTMLElement>(
  options: UseInViewportOptions = {},
): { ref: React.RefObject<T | null>; inViewport: boolean } {
  const ref = useRef<T | null>(null);
  const [inViewport, setInViewport] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setInViewport(true); // SSR/test fallback: assume visible
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInViewport(true);
          observer.disconnect(); // mount once, keep mounted across scroll
        }
      },
      {
        rootMargin: options.rootMargin ?? "200px",
        threshold: options.threshold ?? 0,
      },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [options.rootMargin, options.threshold]);

  return { ref, inViewport };
}
