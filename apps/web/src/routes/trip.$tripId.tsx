import { PDFDownloadLink } from '@react-pdf/renderer'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'

import type { inferRouterOutputs } from '@trpc/server'
import { useEffect, useRef, useState } from 'react'
import type { AppRouter } from '../../../api/src/trpc/router'
import { ErrorBanner } from '../components/ErrorBanner'
import { GenerationPanel } from '../components/GenerationPanel'
import { PinIcon } from '../components/PinIcon'
import { TripCover } from '../components/TripCover'
import { TripDetails } from '../components/TripDetails'
import { TripMap } from '../components/TripMap'
import { TripPdfDocument } from '../components/TripPdf'
import { authClient } from '../lib/auth-client'
import { formatDate, formatPeriod } from '../lib/dates'
import { errorMessage, isClientError } from '../lib/errors'
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
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: session } = authClient.useSession()

  // 'claimed': a guest trip picked up right after signing in.
  const [savedNotice, setSavedNotice] = useState<'saved' | 'claimed' | null>(null)

  useEffect(() => {
    if (!savedNotice) return
    const id = setTimeout(() => setSavedNotice(null), 5000)
    return () => clearTimeout(id)
  }, [savedNotice])

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

  const saveMutation = useMutation(
    trpc.user.saveTripToAccount.mutationOptions({
      // Awaiting the refetch keeps the button busy until the page shows the
      // saved state, instead of flashing back to "Enregistrer".
      onSuccess: async () => {
        queryClient.invalidateQueries(trpc.user.getProfile.queryFilter())
        queryClient.invalidateQueries(trpc.user.getTrips.queryFilter())
        await tripQuery.refetch()
      },
    }),
  )

  const { mutate: saveToProfile, isPending: isSavingTrip } = saveMutation

  // Claim a guest trip once the visitor is signed in. One attempt per trip:
  // retrying on every settle looped forever whenever the save failed.
  const autoSavedFor = useRef<string | null>(null)
  useEffect(() => {
    if (autoSavedFor.current === tripId) return
    if (session?.user && tripQuery.data && !tripQuery.data.ownedByAccount) {
      autoSavedFor.current = tripId
      saveToProfile({ tripId }, { onSuccess: () => setSavedNotice('claimed') })
    }
  }, [session?.user, tripQuery.data, tripId, saveToProfile])

  if (tripQuery.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F2EDE8] px-4">
        <div className="flex w-full max-w-[520px] flex-col items-center gap-3 rounded-[28px] border border-[#eee] bg-white px-8 py-14 text-center shadow-sm">
          <span className="animate-pulse text-4xl" aria-hidden>🧭</span>
          <p className="text-sm font-semibold text-[#888]">Chargement de ton voyage…</p>
        </div>
      </div>
    )
  }

  if (tripQuery.isError) {
    // A bad or unknown id won't fix itself; anything else is worth a retry.
    const notFound = isClientError(tripQuery.error)
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F2EDE8] px-4">
        <div
          role="alert"
          className="flex w-full max-w-[520px] flex-col items-center rounded-[28px] border border-[#eee] bg-white px-8 py-12 text-center shadow-sm"
        >
          <span
            className="flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(255,77,77,.1)] text-3xl"
            aria-hidden
          >
            {notFound ? '🧳' : '📡'}
          </span>
          <h1 className="mt-4 text-lg font-bold text-[#1a1a1a]">
            {notFound ? 'Voyage introuvable' : 'Impossible de charger ton voyage'}
          </h1>
          <p className="mt-1.5 max-w-[320px] text-sm leading-relaxed text-[#888]">
            {notFound
              ? "Ce lien ne correspond à aucun voyage. Il a peut-être été supprimé, ou l'adresse est incomplète."
              : errorMessage(tripQuery.error, 'Le serveur a rencontré un problème. Réessaie dans un instant.')}
          </p>

          <div className="mt-6 flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            {!notFound && (
              <button
                type="button"
                onClick={() => tripQuery.refetch()}
                disabled={tripQuery.isFetching}
                className="cursor-pointer rounded-full bg-[#FF4D4D] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-red-500/25 transition hover:brightness-105 active:scale-95 disabled:opacity-60"
              >
                {tripQuery.isFetching ? 'Nouvelle tentative…' : 'Réessayer'}
              </button>
            )}
            <Link
              to="/discovery"
              className={`rounded-full px-6 py-3 text-sm font-semibold transition active:scale-95 ${
                notFound
                  ? 'bg-[#FF4D4D] text-white shadow-lg shadow-red-500/25 hover:brightness-105'
                  : 'border border-[#ddd] bg-white text-[#1a1a1a] hover:border-[#FF4D4D]'
              }`}
            >
              Retour à la découverte
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const { trip, days, isGenerated, ownedByAccount } = tripQuery.data
  const isOwner = !!session?.user && trip.userId === session.user.id
  const isFinalized = trip.status === 'finalized'
  // Signed-out visitors keep the sign-in button: they may be the owner.
  const saveState: 'saved' | 'foreign' | 'savable' =
    isOwner && isFinalized
      ? 'saved'
      : session?.user && ownedByAccount && !isOwner
        ? 'foreign'
        : 'savable'

  const handleSaveTrip = () => {
    if (!session?.user) {
      navigate({
        to: '/login',
        search: { redirect: `/trip/${tripId}` },
      })
      return
    }
    saveToProfile({ tripId }, { onSuccess: () => setSavedNotice('saved') })
  }

  // Day 0 holds the places liked while swiping and day -1 the alternative
  // hotels; neither belongs in the day-by-day planning.
  const itineraryDays = days.filter((d) => d.dayIndex > 0)
  const likedDay = days.find((d) => d.dayIndex === 0)
  const alternativeHotels = days.find((d) => d.dayIndex === -1)?.activities ?? []

  // The hotel is repeated on every day it covers, so count places, not rows.
  const placeCount = new Set(
    itineraryDays.flatMap((d) => d.activities.map((a) => a.discoveryContentId ?? a.title)),
  ).size
  // Cover candidates, best first. Sights come before hotels and restaurants:
  // each day opens on its hotel, which made a room photo the cover of every trip.
  const sightsFirst = (acts: Activity[]) => [
    ...acts.filter((a) => a.category === 'activité'),
    ...acts.filter((a) => a.category !== 'activité'),
  ]
  const coverUrls = [
    ...new Set(
      [
        ...sightsFirst(itineraryDays.flatMap((d) => d.activities)),
        ...sightsFirst(likedDay?.activities ?? []),
      ].flatMap((a) => (a.mainMediaUrl ? [a.mainMediaUrl] : [])),
    ),
  ]

  return (
    <div className="min-h-screen bg-[#F2EDE8] text-[#1a1a1a]">
      <div className="mx-auto w-full max-w-[520px] px-4 pb-12 pt-3 md:pt-5">
        {/* ── Hero ── */}
        <div className="relative overflow-hidden rounded-[28px] bg-[#1a1a1a] shadow-[0_24px_50px_-24px_rgba(26,26,26,0.55)]">
          <div className="relative h-[260px] w-full">
            <TripCover urls={coverUrls} />

            <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/50 to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

            <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3.5">
              <button
                type="button"
                onClick={() => window.history.back()}
                className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-black/35 px-3.5 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-black/55 active:scale-95"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Retour
              </button>
              <StatusBadge status={trip.status} />
            </div>

            <div className="absolute inset-x-0 bottom-0 p-5">
              {trip.destination && (
                <p className="flex items-center gap-1.5 text-[13px] font-medium text-white/85">
                  <PinIcon className="h-4 w-4 shrink-0 text-[#FF4D4D]" />
                  <span className="truncate">{trip.destination}</span>
                </p>
              )}
              <h1 className="mt-1 line-clamp-2 text-[28px] font-bold leading-[1.15] text-white">
                {trip.title ?? 'Mon voyage'}
              </h1>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {trip.startDate && (
                  <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-md">
                    {formatPeriod(trip.startDate, trip.durationDays ?? 1)}
                  </span>
                )}
                {trip.durationDays ? (
                  <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-md">
                    {trip.durationDays} jour{trip.durationDays > 1 ? 's' : ''}
                  </span>
                ) : null}
                {placeCount > 0 && (
                  <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-md">
                    {placeCount} lieu{placeCount > 1 ? 'x' : ''}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <TripDetails
          numberOfPeople={trip.numberOfPeople}
          intensity={trip.intensity}
          averagePrice={trip.averagePrice}
        />

        {/* ── Sauvegarde ── */}
        {saveState === 'savable' && (
          <div>
            <button
              type="button"
              onClick={handleSaveTrip}
              disabled={isSavingTrip}
              aria-busy={isSavingTrip}
              className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#FF4D4D] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-500/25 transition hover:brightness-105 active:scale-[0.98] disabled:cursor-wait disabled:opacity-80"
            >
              {isSavingTrip ? (
                <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden>
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".3" strokeWidth="3" />
                  <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              ) : session?.user ? (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 4.5h12a1 1 0 0 1 1 1v14l-7-3.5L5 19.5v-14a1 1 0 0 1 1-1Z" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 10V7a5 5 0 0 1 10 0v3M6 10h12v10H6V10Z" />
                </svg>
              )}
              {isSavingTrip
                ? 'Enregistrement en cours…'
                : session?.user
                  ? 'Enregistrer dans mon profil'
                  : 'Se connecter pour enregistrer'}
            </button>

            {saveMutation.isError && (
              <ErrorBanner
                className="mt-3"
                message={errorMessage(saveMutation.error, "Ton voyage n'a pas pu être enregistré.")}
                onRetry={handleSaveTrip}
                retrying={isSavingTrip}
                onDismiss={() => saveMutation.reset()}
              />
            )}

            {!session?.user && (
              <p className="mt-3 text-center text-xs text-[#888]">
                Pas encore de compte ?{' '}
                <Link
                  to="/register"
                  search={{ redirect: `/trip/${tripId}` }}
                  className="font-bold text-[#FF4D4D] hover:underline"
                >
                  Créer un compte
                </Link>
              </p>
            )}
          </div>
        )}

        {saveState === 'saved' && (
          <div className="mt-4 flex items-center justify-between gap-2 rounded-full border border-[rgba(46,204,113,.3)] bg-[rgba(46,204,113,.12)] py-2 pl-4 pr-2 text-xs font-semibold text-[#27ae60]">
            <span className="flex items-center gap-1.5">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
              </svg>
              Sauvegardé dans ton profil
            </span>
            <Link
              to="/profile"
              className="shrink-0 rounded-full bg-white px-3 py-1 text-[#27ae60] transition hover:bg-[#27ae60] hover:text-white"
            >
              Voir mon profil
            </Link>
          </div>
        )}

        {saveState === 'foreign' && (
          <p className="mt-4 flex items-center justify-center gap-1.5 rounded-full border border-[#e5ded6] bg-white px-4 py-2.5 text-xs font-semibold text-[#888]">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden>
              <circle cx="12" cy="8" r="3.5" />
              <path strokeLinecap="round" d="M5 20a7 7 0 0 1 14 0" />
            </svg>
            Voyage partagé par un autre voyageur
          </p>
        )}

        {savedNotice && (
          <div
            role="status"
            className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-[rgba(46,204,113,.3)] bg-[#e8f8f0] p-4 text-sm font-semibold text-[#27ae60] shadow-sm"
          >
            <span className="flex items-center gap-2">
              <span aria-hidden>🎉</span>
              <span>
                {savedNotice === 'claimed'
                  ? 'Te voilà connecté ! Ton voyage a été enregistré dans ton profil.'
                  : 'Voyage enregistré dans ton profil.'}
              </span>
            </span>
            <button
              type="button"
              onClick={() => setSavedNotice(null)}
              className="shrink-0 cursor-pointer rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-[#27ae60] transition hover:bg-white"
            >
              Fermer
            </button>
          </div>
        )}

        {/* ── Génération ── */}
        {!isGenerated && (
          <GenerationPanel
            tripId={tripId}
            destination={trip.destination}
            startDate={trip.startDate}
            durationDays={trip.durationDays}
            intensity={trip.intensity}
            likedPlaces={likedDay?.activities ?? []}
            isPending={generateMutation.isPending}
            onGenerate={() => generateMutation.mutate({ tripId })}
          >
            {generateMutation.isError && (
              <ErrorBanner
                className="mt-3"
                message={errorMessage(generateMutation.error, "La génération de l'itinéraire a échoué.")}
                onRetry={() => generateMutation.mutate({ tripId })}
                retrying={generateMutation.isPending}
              />
            )}
          </GenerationPanel>
        )}

        {/* ── Itinéraire ── */}
        {isGenerated && (
          <>
            <div className="mt-6 flex items-center justify-between gap-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#888]">
                Jour par jour
              </h2>
              <PDFDownloadLink
                document={<TripPdfDocument trip={trip} days={days} />}
                fileName={`${trip.destination ?? 'voyage'}-itineraire.pdf`}
              >
                {({ loading }) => (
                  <button
                    type="button"
                    disabled={loading}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[#ddd] bg-white px-4 py-2 text-xs font-semibold text-[#1a1a1a] transition hover:border-[#FF4D4D] hover:text-[#FF4D4D] active:scale-95 disabled:opacity-50"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v11m0 0 4-4m-4 4-4-4M5 19h14" />
                    </svg>
                    {loading ? 'Préparation…' : 'PDF'}
                  </button>
                )}
              </PDFDownloadLink>
            </div>

            <div className="mt-3">
              <TripMap days={itineraryDays} />
            </div>

            <div className="mt-4 flex flex-col gap-4">
              {itineraryDays.map((day) => (
                <DayCard key={day.id} day={day} />
              ))}
            </div>

            {alternativeHotels.length > 0 && (
              <>
                <h2 className="mt-8 text-xs font-bold uppercase tracking-wider text-[#888]">
                  Autres hôtels à proximité
                </h2>
                <div className="mt-3 overflow-hidden rounded-[28px] border border-[#eee] bg-white shadow-sm">
                  <p className="border-b border-[#f0eae3] px-4 py-3 text-xs text-[#888]">
                    Choisis-en un pour remplacer l'hébergement de ton itinéraire.
                  </p>
                  <div className="space-y-2.5 bg-[#FBF8F5] p-3">
                    {alternativeHotels.map((hotel, idx) => (
                      <ActivityRow
                        key={hotel.id}
                        activity={hotel}
                        index={idx}
                        action={
                          <button
                            type="button"
                            onClick={() =>
                              chooseHotelMutation.mutate({ tripId, activityId: hotel.id })
                            }
                            disabled={chooseHotelMutation.isPending}
                            className="cursor-pointer rounded-full border border-[#FF4D4D] px-3.5 py-1.5 text-xs font-semibold text-[#FF4D4D] transition hover:bg-[#FF4D4D] hover:text-white active:scale-95 disabled:opacity-50"
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
                    <ErrorBanner
                      className="m-3 mt-0"
                      message={errorMessage(chooseHotelMutation.error, "Impossible de changer d'hôtel.")}
                      onDismiss={() => chooseHotelMutation.reset()}
                    />
                  )}
                </div>
              </>
            )}
          </>
        )}

        {generateMutation.isPending && (
          <div className="mt-4 flex flex-col items-center gap-2 rounded-[28px] border border-[#eee] bg-white px-8 py-10 text-center shadow-sm">
            <span className="animate-pulse text-4xl" aria-hidden>✨</span>
            <p className="text-sm font-semibold text-[#888]">
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
    <div className="overflow-hidden rounded-[28px] border border-[#eee] bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-[#faf7f4]"
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex h-7 shrink-0 items-center rounded-full bg-[#FF4D4D] px-3 text-xs font-bold text-white">
            Jour {day.dayIndex}
          </span>
          {day.targetDate && (
            <span className="shrink-0 text-xs font-medium text-[#888]">
              {formatDate(day.targetDate)}
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {summary && <span className="hidden text-xs text-[#aaa] sm:block">{summary}</span>}
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[#ddd] text-[#888]">
            <svg
              className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </div>
      </button>

      {isOpen && (
        <div className="space-y-2.5 border-t border-[#f0eae3] bg-[#FBF8F5] p-3">
          {ordered.map((act, idx) => (
            <ActivityRow key={act.id} activity={act} index={idx} />
          ))}
          {ordered.length === 0 && (
            <p className="rounded-2xl border border-[#eee] bg-white px-4 py-3 text-xs text-[#888]">
              Aucune activité ce jour.
            </p>
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
    <div className="flex gap-3 rounded-2xl border border-[#eee] bg-white p-3 transition hover:border-[#FF4D4D]">
      <div className="relative h-[76px] w-[76px] shrink-0 overflow-hidden rounded-xl">
        {activity.mainMediaUrl ? (
          <img
            src={activity.mainMediaUrl}
            alt={activity.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-2xl"
            style={{ background: meta.color }}
            aria-hidden
          >
            {meta.emoji}
          </div>
        )}
        <span className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/45 text-[10px] font-bold text-white backdrop-blur-md">
          {index + 1}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[15px] font-semibold leading-tight text-[#1a1a1a]">{activity.title}</p>
          <span
            className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#555]"
            style={{ background: meta.color }}
          >
            {meta.label}
          </span>
        </div>

        {activity.locationName && activity.locationName !== activity.title && (
          <p className="mt-1 flex items-center gap-1 text-xs text-[#888]">
            <PinIcon className="h-3.5 w-3.5 shrink-0 text-[#FF4D4D]" />
            <span className="truncate">{activity.locationName}</span>
          </p>
        )}

        {desc && (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#999]">{desc}</p>
        )}

        {activity.sourceUrl && (
          <a
            href={activity.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-[#FF4D4D] hover:underline"
          >
            Voir l'offre
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </a>
        )}

        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string | null }) {
  const dots: Record<string, string> = {
    draft:     'bg-white/70',
    finalized: 'bg-[#2ecc71]',
    archived:  'bg-[#FF4D4D]',
  }
  const labels: Record<string, string> = { draft: 'Brouillon', finalized: 'Finalisé', archived: 'Archivé' }
  const s = status ?? 'draft'
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-black/35 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur-md">
      <span className={`h-1.5 w-1.5 rounded-full ${dots[s] ?? dots['draft']}`} aria-hidden />
      {labels[s] ?? s}
    </span>
  )
}

function cleanDesc(desc: string): string {
  return desc.replace(/\*\*/g, '').replace(/\*/g, '').trim()
}
