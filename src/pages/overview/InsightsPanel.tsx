import { MdArrowForward } from 'react-icons/md'
import { href } from '../../router/hashRouter'
import type { Insight, InsightTone } from './insights'

const TONE: Record<InsightTone, { label: string; cls: string }> = {
  attention: { label: 'Needs attention', cls: 'border-bad-border bg-bad-bg text-bad' },
  watch: { label: 'Watch', cls: 'border-warn-border bg-warn-bg text-warn' },
  positive: { label: 'Positive', cls: 'border-good-border bg-good-bg text-good' },
}
const MAX_CARDS = 6

export function InsightsPanel({ insights }: { insights: Insight[] }) {
  return (
    <section aria-label="Actionable insights">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-title-lg text-on-surface">Actionable insights</h2>
        <span className="text-label-md text-on-surface-variant">
          {insights.length} {insights.length === 1 ? 'signal' : 'signals'} · rule-based
        </span>
      </div>
      {insights.length === 0 ? (
        <div className="rounded-card border border-outline-variant bg-surface-container-lowest p-6 text-body-sm text-on-surface-variant">
          No signals this period.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {insights.slice(0, MAX_CARDS).map((i) => (
            <article key={`${i.squadId}-${i.title}`} className="flex flex-col rounded-card border border-outline-variant bg-surface-container-lowest p-5">
              <span className={`self-start rounded-full border px-2 py-0.5 text-label-sm ${TONE[i.tone].cls}`}>{TONE[i.tone].label}</span>
              <h3 className="mt-2 text-body-md font-semibold text-on-surface">{i.title}</h3>
              <p className="mt-1 text-body-sm text-on-surface-variant">{i.body}</p>
              <p className="mt-2 text-body-sm italic text-on-surface-variant">{i.prompt}</p>
              <a href={href(`/teams/${i.squadId}`)} className="mt-auto inline-flex items-center gap-1 pt-3 text-body-sm font-semibold text-primary hover:underline">
                Open team <MdArrowForward size={16} aria-hidden />
              </a>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
