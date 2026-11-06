import { MdCheckCircle, MdErrorOutline, MdWarningAmber } from 'react-icons/md'
import type { Signal } from '../metrics/catalogue'

const STYLES = {
  'on-track': { label: 'On track', Icon: MdCheckCircle, cls: 'border-good-border bg-good-bg text-good' },
  watch: { label: 'Watch', Icon: MdWarningAmber, cls: 'border-warn-border bg-warn-bg text-warn' },
  'needs-attention': { label: 'Needs attention', Icon: MdErrorOutline, cls: 'border-bad-border bg-bad-bg text-bad' },
} as const

export function StatusBadge({ signal }: { signal: Signal }) {
  const { label, Icon, cls } = STYLES[signal]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-label-sm ${cls}`}>
      <Icon size={14} aria-hidden />
      {label}
    </span>
  )
}
