import { useEffect, useState } from "react";

/**
 * False during SSR and the first client render, true once React has hydrated.
 * Use it to disable buttons that would otherwise perform a native form submit
 * (reloading the page) when tapped before hydration finishes.
 */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
