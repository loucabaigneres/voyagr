import { PDFDownloadLink } from '@react-pdf/renderer'
import { useMutation, useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
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
  hotel:      { emoji: '🏨', label: 'Hébergement', color: 'rgba(255,77,77,.12)' },
  'activité': { emoji: '🗺️', label: 'Activité',    color: 'rgba(46,204,113,.12)' },
  restaurant: { emoji: '🍽️', label: 'Restaurant',  color: 'rgba(255,160,60,.14)' },
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

  const chooseHotelMutation = useMutation(
    trpc.discovery.chooseHotel.mutationOptions({
      onSuccess: () => tripQuery.refetch(),
    }),
  )

  if (tripQuery.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F2EDE8]">
        <div className="text-sm text-[#888]">Chargement…</div>
      </div>
    )
  }

  if (tripQuery.isError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F2EDE8]">
        <p className="text-sm text-[#FF4D4D]">Voyage introuvable.</p>
        <Link to="/discovery" className="text-sm font-semibold text-[#FF4D4D] underline">
          Retour à la découverte
        </Link>
      </div>
    )
  }

  const { trip, days, isGenerated } = tripQuery.data

  // Day 0 holds the places liked while swiping and day -1 the alternative
  // hotels; neither belongs in the day-by-day planning.
  const itineraryDays = days.filter((d) => d.dayIndex > 0)
  const likedDay = days.find((d) => d.dayIndex === 0)
  const alternativeHotels = days.find((d) => d.dayIndex === -1)?.activities ?? []

  return (
    <div className="min-h-screen bg-[#F2EDE8] text-[#1a1a1a]">
      {/* Header */}
      <div className="border-b border-[#e5ded6] bg-white">
        <div className="mx-auto max-w-2xl px-4 py-5">
          <Link
            to="/discovery"
            className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-[#888] hover:text-[#FF4D4D]"
          >
            ← Retour
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold">{trip.title ?? 'Mon voyage'}</h1>
              {trip.destination && (
                <p className="mt-0.5 flex items-center gap-1 text-sm text-[#888]">
                  <svg className="h-4 w-4 text-[#FF4D4D]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                  </svg>
                  {trip.destination}
                </p>
              )}
              {trip.startDate && (
                <p className="mt-0.5 text-xs text-[#aaa]">
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
              className="w-full rounded-2xl bg-[#FF4D4D] px-6 py-4 text-sm font-bold text-white shadow-lg shadow-red-500/25 transition hover:brightness-105 active:scale-[0.99] disabled:opacity-60"
            >
              {generateMutation.isPending ? '✨ Génération en cours…' : '✨ Générer mon itinéraire'}
            </button>
            {generateMutation.isError && (
              <p className="mt-2 text-center text-xs text-[#FF4D4D]">
                {(generateMutation.error as any)?.message ?? 'Erreur lors de la génération.'}
              </p>
            )}
            {!generateMutation.isPending && (
              <p className="mt-2 text-center text-xs text-[#888]">
                Organise tes lieux likés en un planning cohérent jour par jour.
              </p>
            )}

            {/* Preview of liked items before generation */}
            {likedDay && likedDay.activities.length > 0 && (
              <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#888]">
                  {likedDay.activities.length} lieu{likedDay.activities.length > 1 ? 'x' : ''} liké{likedDay.activities.length > 1 ? 's' : ''}
                </p>
                <div className="flex flex-wrap gap-2">
                  {likedDay.activities.map((act) => (
                    <span
                      key={act.id}
                      className="inline-flex items-center gap-1 rounded-full bg-[#F2EDE8] px-2.5 py-1 text-xs text-[#555]"
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
                    className="inline-flex items-center gap-2 rounded-xl border border-[#ddd] bg-white px-4 py-2 text-xs font-semibold text-[#555] transition hover:border-[#FF4D4D] hover:text-[#FF4D4D] disabled:opacity-50"
                  >
                    {loading ? '⏳ Préparation…' : '📄 Télécharger le PDF'}
                  </button>
                )}
              </PDFDownloadLink>
            </div>

            <div className="flex flex-col gap-5">
              {itineraryDays.map((day) => (
                <DayCard key={day.id} day={day} />
              ))}
            </div>

            {alternativeHotels.length > 0 && (
              <div className="mt-5 overflow-hidden rounded-2xl bg-white shadow-sm">
                <div className="border-b border-[#f0eae3] px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#888]">
                    🏨 Autres hôtels à proximité
                  </p>
                  <p className="mt-1 text-xs text-[#aaa]">
                    Choisis-en un pour remplacer l'hébergement de ton itinéraire.
                  </p>
                </div>
                <div className="divide-y divide-[#f5f0ea]">
                  {alternativeHotels.map((hotel, idx) => (
                    <ActivityRow
                      key={hotel.id}
                      activity={hotel}
                      index={idx}
                      action={
                        <button
                          onClick={() =>
                            chooseHotelMutation.mutate({ tripId, activityId: hotel.id })
                          }
                          disabled={chooseHotelMutation.isPending}
                          className="rounded-lg border border-[#FF4D4D] px-3 py-1.5 text-xs font-semibold text-[#FF4D4D] transition hover:bg-[#FF4D4D] hover:text-white disabled:opacity-50"
                        >
                          {chooseHotelMutation.isPending &&
                          chooseHotelMutation.variables?.activityId === hotel.id
                            ? 'Changement…'
                            : 'Choisir cet hôtel'}
                        </button>
                      }
                    />
                  ))}
                </div>
                {chooseHotelMutation.isError && (
                  <p className="px-4 py-3 text-xs text-[#FF4D4D]">
                    {(chooseHotelMutation.error as { message?: string })?.message ??
                      "Impossible de changer d'hôtel."}
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {/* Loading overlay during generation */}
        {generateMutation.isPending && (
          <div className="mt-4 rounded-2xl bg-white p-6 text-center shadow-sm">
            <div className="mb-2 text-2xl">✨</div>
            <p className="text-sm text-[#888]">
              Analyse de tes préférences et optimisation géographique…
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function DayCard({ day }: { day: Day }) {
  const [isOpen, setIsOpen] = useState(true)

  const activities = day.activities.filter((a) => a.category === 'activité')
  const restaurants = day.activities.filter((a) => a.category === 'restaurant')

  // The planner emits each day as a real route (hotel → matin → déjeuner →
  // après-midi → dîner), so `orderIndex` is the order to display.
  const ordered = [...day.activities].sort((a, b) => a.orderIndex - b.orderIndex)

  const summary = [
    activities.length > 0 && `${activities.length} activité${activities.length > 1 ? 's' : ''}`,
    restaurants.length > 0 && `${restaurants.length} restaurant${restaurants.length > 1 ? 's' : ''}`,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-[#faf7f4]"
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 rounded-lg bg-[#FF4D4D] px-2.5 py-0.5 text-xs font-bold text-white">
            Jour {day.dayIndex}
          </span>
          {day.targetDate && (
            <span className="shrink-0 text-xs text-[#888]">{formatDate(day.targetDate)}</span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {summary && <span className="text-xs text-[#aaa]">{summary}</span>}
          <svg
            className={`h-4 w-4 text-[#bbb] transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isOpen && (
        <div className="divide-y divide-[#f5f0ea] border-t border-[#f0eae3]">
          {ordered.map((act, idx) => (
            <ActivityRow key={act.id} activity={act} index={idx} />
          ))}
          {ordered.length === 0 && (
            <p className="px-4 py-3 text-xs text-[#888]">Aucune activité ce jour.</p>
          )}
        </div>
      )}
    </div>
  )
}

function ActivityRow({
  activity,
  index,
  action,
}: {
  activity: Activity
  index: number
  /** Optional control rendered under the description (e.g. "choose this hotel"). */
  action?: React.ReactNode
}) {
  const meta = categoryMeta(activity.category)
  const desc = activity.description ? cleanDesc(activity.description) : null

  return (
    <div className="flex gap-3 px-4 py-3.5">
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[rgba(255,77,77,.12)] text-[0.65rem] font-bold text-[#FF4D4D]">
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
          <p className="font-semibold leading-tight text-[#1a1a1a]">{activity.title}</p>
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-[#555]"
            style={{ background: meta.color }}
          >
            {meta.label}
          </span>
        </div>

        {activity.locationName && activity.locationName !== activity.title && (
          <p className="mt-0.5 text-xs text-[#888]">📍 {activity.locationName}</p>
        )}

        {desc && (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#999]">{desc}</p>
        )}

        {activity.sourceUrl && (
          <a
            href={activity.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1.5 inline-block text-xs font-medium text-[#FF4D4D] underline decoration-[#FF4D4D]/40 underline-offset-2 hover:decoration-[#FF4D4D]"
          >
            Voir l'offre ↗
          </a>
        )}

        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string | null }) {
  const styles: Record<string, string> = {
    draft:     'bg-[#F2EDE8] text-[#888] border-[#ddd]',
    finalized: 'bg-[rgba(46,204,113,.1)] text-[#27ae60] border-[rgba(46,204,113,.25)]',
    archived:  'bg-[rgba(255,77,77,.08)] text-[#FF4D4D] border-[rgba(255,77,77,.25)]',
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
