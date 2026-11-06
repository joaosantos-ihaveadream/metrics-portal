/** Minimal CSV reader: quoted fields, doubled quotes, CRLF, BOM; delimiter is detected from the header line. */
export interface CsvTable {
  headers: string[]
  rows: string[][]
}

function detectDelimiter(headerLine: string): string {
  const counts = [',', ';', '\t'].map((d) => [d, headerLine.split(d).length] as const)
  return counts.reduce((best, c) => (c[1] > best[1] ? c : best))[0]
}

export function parseCsv(text: string): CsvTable {
  const src = text.replace(/^﻿/, '')
  const delimiter = detectDelimiter(src.split(/\r?\n/, 1)[0] ?? '')
  const records: string[][] = []
  let field = ''
  let record: string[] = []
  let quoted = false
  const endField = () => {
    record.push(field)
    field = ''
  }
  const endRecord = () => {
    endField()
    if (record.some((f) => f.trim() !== '')) records.push(record)
    record = []
  }
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === delimiter) endField()
    else if (c === '\n') endRecord()
    else if (c === '\r') { /* handled with \n */ }
    else field += c
  }
  if (field !== '' || record.length) endRecord()
  const [headers = [], ...rows] = records
  return { headers: headers.map((h) => h.trim()), rows }
}

const needsQuotes = /[",\n\r;]/
export const csvCell = (v: string | number | null): string => {
  const s = v === null ? '' : String(v)
  return needsQuotes.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
export const toCsv = (headers: string[], rows: (string | number | null)[][]): string =>
  [headers, ...rows].map((r) => r.map(csvCell).join(',')).join('\n') + '\n'
