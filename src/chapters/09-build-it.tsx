import type { ReactNode } from 'react'

import { useT } from '../i18n/useT'
import type { TranslationKey } from '../i18n'
import { ChapterShell } from '../shell/ChapterShell'

/*
 * The last step is out of the browser.
 *
 * Everything before this was a simulation; a shoebox, some foil and a needle
 * turn it into a thing the child owns. No printable, no PDF, no download —
 * five objects and six sentences, readable straight off a tablet propped
 * against the kitchen table.
 */

const MATERIALS: readonly { key: TranslationKey; icon: ReactNode }[] = [
  {
    key: 'chapter.build-it.material.box',
    icon: (
      <>
        <rect x={5} y={16} width={38} height={26} rx={3} />
        <path d="M5 16 14 6h24l5 10" />
      </>
    ),
  },
  {
    key: 'chapter.build-it.material.foil',
    icon: (
      <>
        <rect x={7} y={9} width={34} height={30} rx={2} />
        <path d="M13 39 20 9M27 39l7-30" />
      </>
    ),
  },
  {
    key: 'chapter.build-it.material.tracing',
    icon: (
      <>
        <rect x={10} y={7} width={28} height={34} rx={2} />
        <path d="M17 17h14M17 24h14M17 31h9" />
      </>
    ),
  },
  {
    key: 'chapter.build-it.material.needle',
    icon: (
      <>
        <path d="M12 40 36 12" />
        <circle cx={38} cy={9} r={4} />
      </>
    ),
  },
  {
    key: 'chapter.build-it.material.tape',
    icon: (
      <>
        <circle cx={24} cy={24} r={15} />
        <circle cx={24} cy={24} r={5} />
      </>
    ),
  },
]

const STEPS: readonly TranslationKey[] = [
  'chapter.build-it.step.1',
  'chapter.build-it.step.2',
  'chapter.build-it.step.3',
  'chapter.build-it.step.4',
  'chapter.build-it.step.5',
  'chapter.build-it.step.6',
]

export function BuildItChapter() {
  const t = useT()

  return (
    <ChapterShell slug="build-it" narration={t('chapter.build-it.say')}>
      <div className="h-full w-full max-w-2xl overflow-y-auto px-1">
        <h2 className="mb-3 text-xl font-bold text-ray">{t('chapter.build-it.materials')}</h2>
        <ul className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {MATERIALS.map((material) => (
            <li
              key={material.key}
              className="flex flex-col items-center gap-2 rounded-2xl border-2 border-edge bg-chamber p-3 text-center"
            >
              <svg
                viewBox="0 0 48 48"
                className="size-12 stroke-ray"
                fill="none"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                {material.icon}
              </svg>
              <span className="text-sm font-semibold">{t(material.key)}</span>
            </li>
          ))}
        </ul>

        <h2 className="mb-3 text-xl font-bold text-ray">{t('chapter.build-it.steps')}</h2>
        <ol className="mb-6 flex flex-col gap-3">
          {STEPS.map((step, index) => (
            <li key={step} className="flex items-center gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-ray text-xl font-extrabold text-night">
                {index + 1}
              </span>
              <span className="text-lg">{t(step)}</span>
            </li>
          ))}
        </ol>

        <p className="mb-3 rounded-2xl border-2 border-mark-c/50 bg-chamber p-4 text-base">
          {t('chapter.build-it.tip')}
        </p>
        <p className="pb-2 text-sm text-muted">{t('chapter.build-it.grownup')}</p>
      </div>
    </ChapterShell>
  )
}
