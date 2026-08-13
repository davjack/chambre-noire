import type { CSSProperties } from 'react'

/**
 * A 0–1 readout in the form a six-year-old can read without numbers: a bar
 * that fills.
 *
 * It is a real `<meter>`. The element carries the semantics for free — screen
 * readers announce it as a gauge with its value — and styling it costs a few
 * vendor pseudo-elements, which is cheaper than reimplementing what it already
 * knows how to be.
 */
export function Meter({
  label,
  value,
  colour,
}: {
  label: string
  value: number
  colour: string
}) {
  const clamped = Math.min(1, Math.max(0, value))
  const percent = Math.round(clamped * 100)
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-sm font-semibold text-muted">{label}</span>
      <meter
        className="app-meter h-3.5 flex-1"
        min={0}
        max={1}
        value={clamped}
        aria-label={label}
        style={{ '--meter-colour': colour } as CSSProperties}
      >
        {percent}%
      </meter>
      {/* The `<meter>` fallback content only renders where the element is
          unsupported, so it reaches nobody here. This span is how a screen
          reader — and anyone comparing two runs — gets the number. */}
      <span className="w-12 shrink-0 text-right font-mono text-sm text-muted tabular-nums">
        {percent}%
      </span>
    </div>
  )
}
