import { useEffect, useRef, useState } from 'react'

/** Measures the container width so charts fill it. */
export function useWidth<T extends HTMLElement>(fallback = 600) {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(fallback)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    setWidth(el.clientWidth || fallback)
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(120, Math.round(e.contentRect.width))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [fallback])
  return [ref, width] as const
}
