import { PDFDownloadLink } from '@react-pdf/renderer'
import { useMutation, useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '../../../api/src/trpc/router'
import { TripPdfDocument } from '../components/TripPdf'
import { trpc } from '../lib/trpc.js'

export const Route = createFileRoute('/trip/$tripId')({ component: TripPage })

type RouterOutputs = inferRouterOutputs<AppRouter>
type TripData = RouterOutputs['discovery']['getTrip']
type Day = TripData['days'][number]
type Activity = Day['activities'][number]

const CATEGORY_META: Record<string, { emoji: string; label: string; color: string }> = {
  hotel:      { emoji: '🏨', label: 'Hébergement', color: 'rgba(108,99,255,.15)' },
  'activité': { emoji: '🗺️', label: 'Activité',    color: 'rgba(46,204,113,.12)' },
  restaurant: { emoji: '🍽️', label: 'Restaurant',  color: 'rgba(255,160,60,.12)' },
}

function categoryMeta(cat: string | null) {
  return CATEGORY_META[cat ?? ''] ?? { emoji: '📍', label: cat ?? '', color: 'rgba(255,255,255,.06)' }
}

function TripPage() {
  const { tripId } = Route.useParams()

  const tripQuery = useQuery(trpc.discovery.getTrip.queryOptions({ tripId }))

  const generateMutation = useMutation(
    trpc.discovery.generateItinerary.mutationOptions({
      onSuccess: () => tripQuery.refetch(),
    }),
  )

  if (tripQuery.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#12121e] text-white">
        <div className="text-sm text-[#9a9ac0]">Chargement…</div>
      </div>
    )
  }

  if (tripQuery.isError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#12121e] text-white">
        <p className="text-sm text-[#e74c3c]">Voyage introuvable.</p>
        <Link to="/discovery" className="text-sm text-[#6c63ff] underline">
          Retour à la découverte
        </Link>
      </div>
    )
  }

  const { trip, days, isGenerated } = tripQuery.data

  return (
    <div className="min-h-screen bg-[#12121e] text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#1a1a2e]">
        <div className="mx-auto max-w-2xl px-4 py-5">
          <Link
            to="/discovery"
            className="mb-4 inline-flex items-center gap-1.5 text-xs text-[#9a9ac0] hover:text-white"
          >
            ← Retour
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold">{trip.title ?? 'Mon voyage'}</h1>
              {trip.destination && (
                <p className="mt-0.5 text-sm text-[#9a9ac0]">📍 {trip.destination}</p>
              )}
              {trip.startDate && (
                <p className="mt-0.5 text-xs text-[#9a9ac0]">
                  {formatDate(trip.startDate)}
                  {trip.durationDays ? ` · ${trip.durationDays} jour${trip.durationDays > 1 ? 's' : ''}` : ''}
                </p>
              )}
            </div>
            <StatusBadge status={trip.status} />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-6">
        {/* Generate button — only shown before first generation */}
        {!isGenerated && (
          <div className="mb-6">
            <button
              onClick={() => generateMutation.mutate({ tripId })}
              disabled={generateMutation.isPending}
              className="w-full rounded-2xl bg-linear-to-r from-[#6c63ff] to-[#a78bfa] px-6 py-4 text-sm font-bold text-white shadow-lg transition hover:brightness-110 disabled:opacity-60"
            >
              {generateMutation.isPending ? '✨ Génération en cours…' : '✨ Générer mon itinéraire'}
            </button>
            {generateMutation.isError && (
              <p className="mt-2 text-center text-xs text-[#e74c3c]">
                {(generateMutation.error as any)?.message ?? 'Erreur lors de la génération.'}
              </p>
            )}
            {!generateMutation.isPending && (
              <p className="mt-2 text-center text-xs text-[#9a9ac0]">
                Organise tes lieux likés en un planning cohérent jour par jour.
              </p>
            )}

            {/* Preview of liked items before generation */}
            {days.length > 0 && days[0].activities.length > 0 && (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/3 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#9a9ac0]">
                  {days[0].activities.length} lieu{days[0].activities.length > 1 ? 'x' : ''} liké{days[0].activities.length > 1 ? 's' : ''}
                </p>
                <div className="flex flex-wrap gap-2">
                  {days[0].activities.map((act) => (
                    <span
                      key={act.id}
                      className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-xs text-[#9a9ac0]"
                    >
                      {categoryMeta(act.category).emoji} {act.title}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Itinerary days */}
        {isGenerated && (
          <>
            {/* PDF download button */}
            <div className="mb-4 flex justify-end">
              <PDFDownloadLink
                document={<TripPdfDocument trip={trip} days={days} />}
                fileName={`${trip.destination ?? 'voyage'}-itineraire.pdf`}
              >
                {({ loading }) => (
                  <button
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/4 px-4 py-2 text-xs font-semibold text-[#9a9ac0] transition hover:bg-white/8 hover:text-white disabled:opacity-50"
                  >
                    {loading ? '⏳ Préparation…' : '📄 Télécharger le PDF'}
                  </button>
                )}
              </PDFDownloadLink>
            </div>

            <div className="flex flex-col gap-5">
              {days.map((day) => (
                <DayCard key={day.id} day={day} />
              ))}
            </div>
          </>
        )}

        {/* Loading overlay during generation */}
        {generateMutation.isPending && (
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/3 p-6 text-center">
            <div className="mb-2 text-2xl">✨</div>
            <p className="text-sm text-[#9a9ac0]">
              Analyse de tes préférences et optimisation géographique…
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function DayCard({ day }: { day: Day }) {
  const hotel = day.activities.find((a) => a.category === 'hotel')
  const activities = day.activities.filter((a) => a.category === 'activité')
  const restaurants = day.activities.filter((a) => a.category === 'restaurant')
  const others = day.activities.filter(
    (a) => a.category !== 'hotel' && a.category !== 'activité' && a.category !== 'restaurant',
  )

  const ordered = [...(hotel ? [hotel] : []), ...activities, ...restaurants, ...others]

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#1a1a2e]">
      <div className="border-b border-white/10 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-[rgba(108,99,255,.2)] px-2.5 py-0.5 text-xs font-bold text-[#a9a2ff]">
              Jour {day.dayIndex}
            </span>
            {day.targetDate && (
              <span className="text-xs text-[#9a9ac0]">{formatDate(day.targetDate)}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#9a9ac0]">
            {hotel && <span title="Hébergement">🏨</span>}
            {activities.length > 0 && <span title="Activités">🗺️ ×{activities.length}</span>}
            {restaurants.length > 0 && <span title="Restaurant">🍽️</span>}
          </div>
        </div>
      </div>

      <div className="divide-y divide-white/5">
        {ordered.map((act, idx) => (
          <ActivityRow key={act.id} activity={act} index={idx} />
        ))}
        {ordered.length === 0 && (
          <p className="px-4 py-3 text-xs text-[#9a9ac0]">Aucune activité ce jour.</p>
        )}
      </div>
    </div>
  )
}

function ActivityRow({ activity, index }: { activity: Activity; index: number }) {
  const meta = categoryMeta(activity.category)
  const desc = activity.description ? cleanDesc(activity.description) : null

  return (
    <div className="flex gap-3 px-4 py-3.5">
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[rgba(108,99,255,.15)] text-[0.65rem] font-bold text-[#a9a2ff]">
        {index + 1}
      </div>

      {activity.mainMediaUrl ? (
        <img
          src={activity.mainMediaUrl}
          alt={activity.title}
          className="h-16 w-16 shrink-0 rounded-xl object-cover"
        />
      ) : (
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl text-2xl"
          style={{ background: meta.color }}
        >
          {meta.emoji}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold leading-tight">{activity.title}</p>
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-white/70"
            style={{ background: meta.color }}
          >
            {meta.label}
          </span>
        </div>

        {activity.locationName && activity.locationName !== activity.title && (
          <p className="mt-0.5 text-xs text-[#9a9ac0]">📍 {activity.locationName}</p>
        )}

        {desc && (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#7a7a9a]">{desc}</p>
        )}

        {activity.sourceUrl && (
          <a
            href={activity.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1.5 inline-block text-xs font-medium text-[#a9a2ff] underline decoration-[#a9a2ff]/40 underline-offset-2 hover:text-white"
          >
            Voir l'offre ↗
          </a>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string | null }) {
  const styles: Record<string, string> = {
    draft:     'bg-[rgba(155,155,200,.1)] text-[#9a9ac0] border-[rgba(155,155,200,.2)]',
    finalized: 'bg-[rgba(46,204,113,.1)] text-[#2ecc71] border-[rgba(46,204,113,.2)]',
    archived:  'bg-[rgba(231,76,60,.1)] text-[#e74c3c] border-[rgba(231,76,60,.2)]',
  }
  const labels: Record<string, string> = { draft: 'Brouillon', finalized: 'Finalisé', archived: 'Archivé' }
  const s = status ?? 'draft'
  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${styles[s] ?? styles['draft']}`}>
      {labels[s] ?? s}
    </span>
  )
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function cleanDesc(desc: string): string {
  return desc.replace(/\*\*/g, '').replace(/\*/g, '').trim()
}
