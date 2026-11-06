import { useEffect, useState } from 'react'
import { MdPause, MdPlayArrow, MdSkipNext, MdSkipPrevious } from 'react-icons/md'
import { Sparkline } from '../../components/charts'
import type { Highlight } from './highlights'

const ROTATE_MS = 8000
const BADGE_CLS = {
  drop: 'border-warn-border bg-warn-bg text-warn',
  milestone: 'border-good-border bg-good-bg text-good',
  rise: 'border-good-border bg-good-bg text-good',
} as const

export function Highlights({ items }: { items: Highlight[] }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [hover, setHover] = useState(false)
  const count = items.length
  const at = count ? index % count : 0

  useEffect(() => {
    if (count < 2 || paused || hover) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const t = window.setInterval(() => setIndex((i) => i + 1), ROTATE_MS)
    return () => window.clearInterval(t)
  }, [count, paused, hover])

  const h = items[at]
  const btn = 'rounded-control p-1 text-on-surface-variant hover:bg-surface-container'
  return (
    <section
      aria-label="Highlights"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="rounded-card border border-outline-variant bg-surface-container-lowest p-5 lg:col-span-2"
    >
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-title-lg text-on-surface">
          Highlights
          <span className="rounded-full bg-secondary-fixed px-2 py-0.5 text-label-sm text-on-primary-fixed-variant">Experiment</span>
        </h2>
        {count > 1 && (
          <div className="flex items-center gap-1 text-label-md text-on-surface-variant">
            <button type="button" className={btn} aria-label="Previous highlight" onClick={() => setIndex(at - 1 + count)}><MdSkipPrevious size={18} /></button>
            <button type="button" className={btn} aria-label={paused ? 'Resume rotation' : 'Pause rotation'} onClick={() => setPaused((p) => !p)}>
              {paused ? <MdPlayArrow size={18} /> : <MdPause size={18} />}
            </button>
            <button type="button" className={btn} aria-label="Next highlight" onClick={() => setIndex(at + 1)}><MdSkipNext size={18} /></button>
            <span aria-live="off">{at + 1} / {count}</span>
          </div>
        )}
      </div>
      {!h ? (
        <p className="mt-4 text-body-sm text-on-surface-variant">No highlights yet: they need a previous period to compare with.</p>
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_200px]" aria-live={paused || hover ? 'polite' : 'off'}>
          <div>
            <span className={`inline-block rounded-full border px-2 py-0.5 text-label-sm ${BADGE_CLS[h.kind]}`}>{h.badge}</span>
            <h3 className="mt-2 text-body-md font-semibold text-on-surface">{h.headline}</h3>
            <p className="mt-1 text-body-sm text-on-surface-variant">{h.body}</p>
            <p className="mt-2 text-body-sm italic text-on-surface-variant">{h.prompt}</p>
          </div>
          <div className="rounded-card bg-surface-container-low p-3">
            <div className="text-label-sm uppercase text-outline">Change</div>
            <div className="mt-1 text-title-lg text-on-surface">{h.from} → {h.to}</div>
            <div className="mt-2"><Sparkline values={h.trend.map((p) => p.value)} width={170} height={40} /></div>
            <div className="text-label-sm text-outline">About 6 months</div>
          </div>
        </div>
      )}
    </section>
  )
}
