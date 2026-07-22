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
  hotel:      { emoji: '🏨', label: 'Hébergement', color: 'rgba(255,78,74,.12)' },
  'activité': { emoji: '🗺️', label: 'Activité',    color: 'rgba(255,123,40,.14)' },
  restaurant: { emoji: '🍽️', label: 'Restaurant',  color: 'rgba(162,16,27,.10)' },
}

function categoryMeta(cat: string | null) {
  return CATEGORY_META[cat ?? ''] ?? { emoji: '📍', label: cat ?? '', color: 'rgba(0,0,0,.05)' }
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
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="text-sm text-muted">Chargement…</div>
      </div>
    )
  }

  if (tripQuery.isError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface">
        <p className="text-sm text-primary">Voyage introuvable.</p>
        <Link to="/discovery" className="text-sm font-semibold text-primary underline">
          Retour à la découverte
        </Link>
      </div>
    )
  }

  const { trip, days, isGenerated } = tripQuery.data

  return (
    <div className="min-h-screen bg-surface text-ink">
      {/* Header */}
      <div className="border-b border-border bg-white">
        <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6">
          <Link
            to="/discovery"
            className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-primary"
          >
            ← Retour
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold">{trip.title ?? 'Mon voyage'}</h1>
              {trip.destination && (
                <p className="mt-0.5 flex items-center gap-1 text-sm text-muted">
                  <svg className="h-4 w-4 text-primary" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                  </svg>
                  {trip.destination}
                </p>
              )}
              {trip.startDate && (
                <p className="mt-0.5 text-xs text-muted">
                  {formatDate(trip.startDate)}
                  {trip.durationDays ? ` · ${trip.durationDays} jour${trip.durationDays > 1 ? 's' : ''}` : ''}
                </p>
              )}
            </div>
            <StatusBadge status={trip.status} />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {/* Generate button — only shown before first generation */}
        {!isGenerated && (
          <div className="mx-auto mb-6 max-w-2xl">
            <button
              onClick={() => generateMutation.mutate({ tripId })}
              disabled={generateMutation.isPending}
              className="min-h-12 w-full rounded-2xl bg-primary px-6 py-4 text-sm font-bold text-white shadow-lg shadow-primary/25 transition hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.99] disabled:opacity-60"
            >
              {generateMutation.isPending ? '✨ Génération en cours…' : '✨ Générer mon itinéraire'}
            </button>
            {generateMutation.isError && (
              <p className="mt-2 text-center text-xs text-primary">
                {(generateMutation.error as any)?.message ?? 'Erreur lors de la génération.'}
              </p>
            )}
            {!generateMutation.isPending && (
              <p className="mt-2 text-center text-xs text-muted">
                Organise tes lieux likés en un planning cohérent jour par jour.
              </p>
            )}

            {/* Preview of liked items before generation */}
            {days.length > 0 && days[0].activities.length > 0 && (
              <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
                  {days[0].activities.length} lieu{days[0].activities.length > 1 ? 'x' : ''} liké{days[0].activities.length > 1 ? 's' : ''}
                </p>
                <div className="flex flex-wrap gap-2">
                  {days[0].activities.map((act) => (
                    <span
                      key={act.id}
                      className="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-xs text-ink-soft"
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
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-xs font-semibold text-ink-soft transition hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
                  >
                    {loading ? '⏳ Préparation…' : '📄 Télécharger le PDF'}
                  </button>
                )}
              </PDFDownloadLink>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:items-start">
              {days.map((day) => (
                <DayCard key={day.id} day={day} />
              ))}
            </div>
          </>
        )}

        {/* Loading overlay during generation */}
        {generateMutation.isPending && (
          <div className="mt-4 rounded-2xl bg-white p-6 text-center shadow-sm">
            <div className="mb-2 text-2xl">✨</div>
            <p className="text-sm text-muted">
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
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-primary px-2.5 py-0.5 text-xs font-bold text-white">
              Jour {day.dayIndex}
            </span>
            {day.targetDate && (
              <span className="text-xs text-muted">{formatDate(day.targetDate)}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted">
            {hotel && <span title="Hébergement">🏨</span>}
            {activities.length > 0 && <span title="Activités">🗺️ ×{activities.length}</span>}
            {restaurants.length > 0 && <span title="Restaurant">🍽️</span>}
          </div>
        </div>
      </div>

      <div className="divide-y divide-border">
        {ordered.map((act, idx) => (
          <ActivityRow key={act.id} activity={act} index={idx} />
        ))}
        {ordered.length === 0 && (
          <p className="px-4 py-3 text-xs text-muted">Aucune activité ce jour.</p>
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
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[0.65rem] font-bold text-primary">
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
          <p className="font-semibold leading-tight text-ink">{activity.title}</p>
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-ink-soft"
            style={{ background: meta.color }}
          >
            {meta.label}
          </span>
        </div>

        {activity.locationName && activity.locationName !== activity.title && (
          <p className="mt-0.5 text-xs text-muted">📍 {activity.locationName}</p>
        )}

        {desc && (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">{desc}</p>
        )}

        {activity.sourceUrl && (
          <a
            href={activity.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1.5 inline-block text-xs font-medium text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
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
    draft:     'bg-surface text-ink-soft border-border',
    finalized: 'bg-accent/10 text-accent border-accent/30',
    archived:  'bg-primary/10 text-primary-dark border-primary/25',
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
