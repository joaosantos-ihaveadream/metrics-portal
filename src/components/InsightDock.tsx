import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { MdAutoAwesome, MdClose, MdDeleteOutline, MdSend } from 'react-icons/md'
import { useScoped } from '../filters/FilterContext'
import { answerFor, SUGGESTIONS } from '../pages/overview/insightAnswer'
import { buildInsights } from '../pages/overview/insights'
import { teamRows } from '../pages/overview/teamRows'
import { usePath } from '../router/hashRouter'

interface Message { from: 'you' | 'insight'; text: string }
const THINKING_MS = 900

/** Floating preview of the insight assistant. Answers come from the insight rules; no model is called. */
export function InsightDock() {
  const view = useScoped()
  const path = usePath()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [reading, setReading] = useState(false)
  const [draft, setDraft] = useState('')
  const timer = useRef<number>(undefined)

  const insights = useMemo(
    () => (view ? buildInsights(teamRows(view.dataset, view.squadIds, view.period)) : []),
    [view],
  )

  const reset = () => { window.clearTimeout(timer.current); setMessages([]); setReading(false); setDraft('') }
  useEffect(reset, [path])
  useEffect(() => () => window.clearTimeout(timer.current), [])

  if (!view) return null

  const ask = (question: string) => {
    const q = question.trim()
    if (!q || reading) return
    setMessages((m) => [...m, { from: 'you', text: q }])
    setDraft('')
    setReading(true)
    timer.current = window.setTimeout(() => {
      setMessages((m) => [...m, { from: 'insight', text: answerFor(q, insights, view.label, view.period) }])
      setReading(false)
    }, THINKING_MS)
  }
  const submit = (e: FormEvent) => { e.preventDefault(); ask(draft) }

  if (!open) {
    return (
      <button
        type="button" onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-30 inline-flex items-center gap-2 rounded-full bg-on-surface px-4 py-3 text-label-md text-white shadow-lg"
      >
        <MdAutoAwesome size={18} aria-hidden /> Insight about this page
      </button>
    )
  }
  return (
    <aside aria-label="Insight about this page" className="fixed bottom-6 right-6 z-30 flex max-h-[80vh] w-[420px] max-w-[calc(100vw-2rem)] flex-col rounded-card border border-outline-variant bg-white shadow-xl">
      <div className="flex items-start justify-between gap-2 border-b border-outline-variant p-4">
        <div>
          <h2 className="text-title-lg text-on-surface">Insight about this page</h2>
          <p className="text-label-sm text-outline">Preview · example answers, no model connected</p>
        </div>
        <div className="flex gap-1">
          <button type="button" onClick={reset} aria-label="Start over" className="rounded-control p-1.5 hover:bg-surface-container-low"><MdDeleteOutline size={18} /></button>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="rounded-control p-1.5 hover:bg-surface-container-low"><MdClose size={18} /></button>
        </div>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
        {messages.length === 0 && (
          <ul className="space-y-2">
            {SUGGESTIONS.map((s) => (
              <li key={s}>
                <button type="button" onClick={() => ask(s)} className="w-full rounded-control border border-outline-variant px-3 py-2 text-left text-body-sm hover:bg-surface-container-low">{s}</button>
              </li>
            ))}
          </ul>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.from === 'you' ? 'ml-8 rounded-control bg-primary-container px-3 py-2 text-body-sm text-white' : 'mr-8 whitespace-pre-line rounded-control bg-surface-container-low px-3 py-2 text-body-sm text-on-surface'}>{m.text}</div>
        ))}
        {reading && <div className="text-body-sm italic text-on-surface-variant">Reading the page…</div>}
      </div>
      <form onSubmit={submit} className="flex gap-2 border-t border-outline-variant p-3">
        <input
          value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="Ask about this page" placeholder="Ask about this page"
          className="h-9 flex-1 rounded-control border border-outline-variant px-3 text-body-sm"
        />
        <button type="submit" aria-label="Send" disabled={reading || !draft.trim()} className="rounded-control bg-primary-container px-3 text-white disabled:opacity-40"><MdSend size={16} /></button>
      </form>
    </aside>
  )
}
