import { useId, type ReactNode } from 'react'

interface BigSliderProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  /** Spoken and shown instead of the raw number — "4 mm", not "4". */
  valueText?: string
  minIcon?: ReactNode
  maxIcon?: ReactNode
  /** Optional marker on the track, e.g. the sharpest hole. */
  markAt?: number
  markLabel?: string
}

/**
 * The only control in the app, so it is worth getting right: a real
 * `<input type="range">` — keyboard, switch access and screen readers all work
 * for free — dressed up to a 64 px touch target with a 44 px thumb.
 *
 * Rebuilding this on pointer events would have cost all of that and bought
 * nothing a child would notice.
 */
export function BigSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  valueText,
  minIcon,
  maxIcon,
  markAt,
  markLabel,
}: BigSliderProps) {
  const id = useId()
  const markPercent =
    markAt === undefined ? undefined : ((markAt - min) / (max - min)) * 100

  return (
    <div className="w-full">
      <div className="mb-1 flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="text-base font-semibold text-muted">
          {label}
        </label>
        {valueText ? (
          <span className="font-mono text-base text-ray tabular-nums">{valueText}</span>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        {minIcon ? (
          <span aria-hidden="true" className="shrink-0 text-muted">
            {minIcon}
          </span>
        ) : null}

        <div className="relative flex-1">
          {markPercent === undefined ? null : (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 z-0 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${markPercent}%` }}
            >
              <span className="block h-9 w-1 rounded-full bg-mark-c/70" />
              {markLabel ? (
                <span className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap text-xs text-mark-c">
                  {markLabel}
                </span>
              ) : null}
            </span>
          )}
          <input
            id={id}
            type="range"
            className="big-slider relative z-10"
            min={min}
            max={max}
            step={step}
            value={value}
            aria-valuetext={valueText}
            onChange={(event) => onChange(event.currentTarget.valueAsNumber)}
          />
        </div>

        {maxIcon ? (
          <span aria-hidden="true" className="shrink-0 text-muted">
            {maxIcon}
          </span>
        ) : null}
      </div>
    </div>
  )
}
