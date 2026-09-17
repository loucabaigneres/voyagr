import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { formatPeriod } from '../lib/dates'

// Mirrors the planner: activities per day by pace, 3 days when unset.
const ACTS_PER_DAY: Record<string, number> = { chill: 1, balanced: 2, intense: 3 }
const DEFAULT_DAYS = 3

const CATEGORY_EMOJI: Record<string, string> = {
  hotel: '🏨',
  'activité': '🗺️',
  restaurant: '🍽️',
}

interface LikedPlace {
  id: string
  title: string
  category: string | null
}

interface GenerationPanelProps {
  tripId: string
  destination: string | null
  startDate: string | null
  durationDays: number | null
  intensity: string | null
  likedPlaces: LikedPlace[]
  isPending: boolean
  onGenerate: () => void
  /** Rendered under the button, e.g. an error banner. */
  children?: ReactNode
}

const iconProps = {
  className: 'h-4 w-4',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.2,
  viewBox: '0 0 24 24',
  'aria-hidden': true,
} as const

function PlanRow({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-center gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[rgba(255,77,77,.1)] text-[#FF4D4D]">
        {icon}
      </span>
      <span className="text-[14px] leading-snug text-[#1a1a1a]">{children}</span>
    </li>
  )
}

function Check({ done, label }: { done: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2.5 text-[14px]">
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
          done ? 'bg-[rgba(46,204,113,.15)] text-[#27ae60]' : 'border-2 border-dashed border-[#ddd]'
        }`}
      >
        {done && (
          <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={3.5} viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
          </svg>
        )}
      </span>
      <span className={done ? 'text-[#888] line-through decoration-[#ccc]' : 'font-semibold text-[#1a1a1a]'}>
        {label}
      </span>
    </li>
  )
}

export function GenerationPanel({
  tripId,
  destination,
  startDate,
  durationDays,
  intensity,
  likedPlaces,
  isPending,
  onGenerate,
  children,
}: GenerationPanelProps) {
  // The planner cannot run without a destination, so send the user to the form first.
  if (!destination) {
    return (
      <div className="mt-5 rounded-[28px] border border-[#eee] bg-white p-5 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#888]">Ton planning</h2>
        <p className="mt-1.5 text-[17px] font-bold text-[#1a1a1a]">Encore quelques infos</p>
        <p className="mt-1 text-[14px] leading-relaxed text-[#555]">
          Pour construire ton planning jour par jour, dis-nous d'abord où et quand tu pars.
        </p>

        <ul className="mt-4 space-y-2.5 rounded-2xl bg-[#FBF8F5] p-4">
          <Check done={false} label="Destination" />
          <Check done={!!startDate} label="Date de départ" />
          <Check done={!!durationDays} label="Durée du séjour" />
        </ul>

        <Link
          to="/trip/configure"
          search={{ tripId }}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#FF4D4D] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-500/25 transition hover:brightness-105 active:scale-[0.98]"
        >
          Compléter mon voyage
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
        <p className="mt-2.5 text-center text-xs text-[#888]">
          Ton itinéraire sera généré dès que le formulaire est validé.
        </p>
      </div>
    )
  }

  const days = durationDays ?? DEFAULT_DAYS
  const actsPerDay = ACTS_PER_DAY[intensity ?? 'balanced'] ?? ACTS_PER_DAY.balanced

  return (
    <div className="mt-5 rounded-[28px] border border-[#eee] bg-white p-5 shadow-sm">
      <h2 className="text-xs font-bold uppercase tracking-wider text-[#888]">Ton planning</h2>
      <p className="mt-1.5 text-[17px] font-bold text-[#1a1a1a]">Voici ce qu'on va préparer</p>

      <ul className="mt-4 space-y-3">
        <PlanRow
          icon={
            <svg {...iconProps}>
              <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
              <path strokeLinecap="round" d="M3.5 10h17M8 3v4M16 3v4" />
            </svg>
          }
        >
          <strong>
            {days} jour{days > 1 ? 's' : ''} à {destination}
          </strong>
          {startDate ? (
            <span className="text-[#888]"> · {formatPeriod(startDate, days)}</span>
          ) : (
            !durationDays && <span className="text-[#888]"> · durée par défaut</span>
          )}
        </PlanRow>
        <PlanRow
          icon={
            <svg {...iconProps}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" />
              <circle cx="12" cy="10" r="2.3" />
            </svg>
          }
        >
          <strong>
            {actsPerDay} activité{actsPerDay > 1 ? 's' : ''} par jour
          </strong>
          <span className="text-[#888]">, regroupées par quartier</span>
        </PlanRow>
        <PlanRow
          icon={
            <svg {...iconProps}>
              <path strokeLinecap="round" d="M7 3v8M5 3v4a2 2 0 0 0 4 0V3M7 11v10M17 21V3c-2 1-3 3-3 6v4h3" />
            </svg>
          }
        >
          <strong>Déjeuner et dîner</strong>
          <span className="text-[#888]"> près de tes visites et de ton hôtel</span>
        </PlanRow>
        <PlanRow
          icon={
            <svg {...iconProps}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 20V9l9-5 9 5v11M9 20v-6h6v6" />
            </svg>
          }
        >
          <strong>Un hébergement</strong>
          <span className="text-[#888]">, avec des alternatives à proximité</span>
        </PlanRow>
      </ul>

      <div className="mt-5 rounded-2xl bg-[#FBF8F5] p-4">
        {likedPlaces.length > 0 ? (
          <>
            <p className="text-xs font-bold uppercase tracking-wider text-[#888]">
              Tes coups de cœur · {likedPlaces.length}
            </p>
            <p className="mt-0.5 text-xs text-[#888]">Ils seront placés en priorité dans ton planning.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {likedPlaces.map((place) => (
                <span
                  key={place.id}
                  className="inline-flex max-w-full items-center gap-1 rounded-full border border-[#ddd] bg-white px-3 py-1.5 text-xs font-semibold text-[#1a1a1a]"
                >
                  <span aria-hidden>{CATEGORY_EMOJI[place.category ?? ''] ?? '📍'}</span>
                  <span className="truncate">{place.title}</span>
                </span>
              ))}
            </div>
          </>
        ) : (
          <p className="text-[13px] leading-relaxed text-[#555]">
            <span className="font-semibold text-[#1a1a1a]">Aucun coup de cœur pour l'instant.</span> On
            choisira pour toi les incontournables de {destination}.
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onGenerate}
        disabled={isPending}
        aria-busy={isPending}
        className="mt-5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#FF4D4D] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-500/25 transition hover:brightness-105 active:scale-[0.98] disabled:cursor-wait disabled:opacity-80"
      >
        {isPending ? (
          <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".3" strokeWidth="3" />
            <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        ) : (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
            <circle cx="12" cy="12" r="9" />
            <path strokeLinejoin="round" d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
          </svg>
        )}
        {isPending ? 'Génération en cours…' : 'Générer mon itinéraire'}
      </button>

      {children}
    </div>
  )
}
