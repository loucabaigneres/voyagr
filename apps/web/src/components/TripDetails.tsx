import type { ReactNode } from 'react'

// Wording mirrors the options of the trip form.
const INTENSITY_LABELS: Record<string, string> = {
  chill: 'Relax',
  balanced: 'Équilibré',
  intense: 'Intense',
}

const PRICE_LABELS: Record<string, string> = {
  budget: 'Petit budget',
  mid: 'Moyen',
  premium: 'Premium',
}

interface TripDetailsProps {
  numberOfPeople: number | null
  intensity: string | null
  averagePrice: string | null
}

const iconProps = {
  className: 'h-[18px] w-[18px]',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  viewBox: '0 0 24 24',
  'aria-hidden': true,
} as const

function Tile({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-[#eee] bg-white px-2 py-3 text-center">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(255,77,77,.1)] text-[#FF4D4D]">
        {icon}
      </span>
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#888]">{label}</p>
      <p className="-mt-1 text-[13px] font-semibold leading-tight text-[#1a1a1a]">{value}</p>
    </div>
  )
}

/** The preferences entered in the trip form, which the itinerary was built from. */
export function TripDetails({ numberOfPeople, intensity, averagePrice }: TripDetailsProps) {
  const tiles: Array<{ key: string; icon: ReactNode; label: string; value: string }> = []

  if (numberOfPeople) {
    tiles.push({
      key: 'people',
      label: 'Voyageurs',
      value: `${numberOfPeople} personne${numberOfPeople > 1 ? 's' : ''}`,
      icon: (
        <svg {...iconProps}>
          <circle cx="9" cy="8" r="3.5" />
          <path strokeLinecap="round" d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.8a3.5 3.5 0 0 1 0 6.4M21.5 20a6.5 6.5 0 0 0-4-6" />
        </svg>
      ),
    })
  }
  if (intensity) {
    tiles.push({
      key: 'intensity',
      label: 'Rythme',
      value: INTENSITY_LABELS[intensity] ?? intensity,
      icon: (
        <svg {...iconProps}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h4l3-7 4 14 3-7h4" />
        </svg>
      ),
    })
  }
  if (averagePrice) {
    tiles.push({
      key: 'price',
      label: 'Budget',
      value: PRICE_LABELS[averagePrice] ?? averagePrice,
      icon: (
        <svg {...iconProps}>
          <rect x="3" y="6" width="18" height="13" rx="2.5" />
          <path strokeLinecap="round" d="M3 10.5h18M7 15h3" />
        </svg>
      ),
    })
  }

  if (tiles.length === 0) return null

  return (
    <section
      aria-label="Détails du voyage"
      className="mt-4 grid gap-2.5"
      style={{ gridTemplateColumns: `repeat(${tiles.length}, minmax(0, 1fr))` }}
    >
      {tiles.map(({ key, ...tile }) => (
        <Tile key={key} {...tile} />
      ))}
    </section>
  )
}
