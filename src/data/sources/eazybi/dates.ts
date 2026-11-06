const pad = (s: string) => Number(s)

/** yyyy-mm-dd, yyyy-mm-dd hh:mm(:ss), dd/mm/yyyy (optionally with a time) and ISO. Returns an ISO string, or null. */
export function parseDate(raw: string): string | null {
  const s = raw.trim()
  let y: number, mo: number, d: number, h = 0, mi = 0, sec = 0
  let m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?)?(Z|[+-]\d{2}:?\d{2})?$/.exec(s)
  let offsetMin = 0
  if (m) {
    ;[y, mo, d] = [pad(m[1]), pad(m[2]), pad(m[3])]
    ;[h, mi, sec] = [pad(m[4] ?? '0'), pad(m[5] ?? '0'), pad(m[6] ?? '0')]
    if (m[7] && m[7] !== 'Z') {
      const o = /([+-])(\d{2}):?(\d{2})/.exec(m[7])!
      offsetMin = (o[1] === '-' ? -1 : 1) * (pad(o[2]) * 60 + pad(o[3]))
    }
  } else if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(s))) {
    ;[d, mo, y] = [pad(m[1]), pad(m[2]), pad(m[3])]
    ;[h, mi, sec] = [pad(m[4] ?? '0'), pad(m[5] ?? '0'), pad(m[6] ?? '0')]
  } else return null
  const ms = Date.UTC(y, mo - 1, d, h, mi, sec) - offsetMin * 60_000
  const check = new Date(Date.UTC(y, mo - 1, d, h, mi, sec))
  if (check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d || h > 23 || mi > 59 || sec > 59) return null
  return new Date(ms).toISOString()
}
