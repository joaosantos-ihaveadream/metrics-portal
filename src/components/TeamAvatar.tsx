const TONES = ['bg-series-1', 'bg-series-2', 'bg-series-3', 'bg-series-4']

/** Coloured tile with the team's first letter; the colour is stable per name. */
export function TeamAvatar({ name, size = 28 }: { name: string; size?: number }) {
  const tone = TONES[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % TONES.length]
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-control font-semibold text-white ${tone}`}
      style={{ width: size, height: size, fontSize: size * 0.45 }}
      aria-hidden
    >
      {name.charAt(0).toUpperCase()}
    </span>
  )
}
