import { MdArrowDownward, MdArrowUpward, MdRemove } from 'react-icons/md'
import type { Improvement } from '../metrics/catalogue'

/** Change vs the previous window. `text` is the visible change, e.g. "+3 pts". */
export function DeltaChip({ delta, improvement, text }: { delta: number | null; improvement: Improvement; text: string }) {
  if (delta === null) return <span className="text-label-sm text-outline">No comparison</span>
  const dir = improvement === 'unchanged' || delta === 0 ? 'flat' : delta > 0 ? 'up' : 'down'
  const Icon = dir === 'up' ? MdArrowUpward : dir === 'down' ? MdArrowDownward : MdRemove
  const tone =
    improvement === 'better' ? 'text-good' : improvement === 'worse' ? 'text-bad' : 'text-on-surface-variant'
  const sr = improvement === 'better' || improvement === 'worse' ? `${dir}, ${improvement}` : dir
  return (
    <span className={`inline-flex items-center gap-0.5 text-label-md ${tone}`}>
      <Icon size={14} aria-hidden />
      {text}
      <span className="sr-only">{sr}</span>
    </span>
  )
}
