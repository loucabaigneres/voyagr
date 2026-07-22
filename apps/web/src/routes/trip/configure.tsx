import { useMutation, useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { TripForm } from '../../components/TripForm.js'
import { trpc } from '../../lib/trpc.js'
import type { TripFormValues } from '../../lib/validations/trip.js'

export const Route = createFileRoute('/trip/configure')({
  validateSearch: z.object({
    tripId: z.uuid().optional(),
  }),
  component: TripConfigurePage,
})

function TripConfigurePage() {
  const navigate = useNavigate()
  const { tripId } = Route.useSearch()

  // When arriving from the swipe flow, the trip already exists (destination +
  // liked places) — load it to prefill the form and update it instead of forking a new trip.
  const existingTripQuery = useQuery({
    ...trpc.getTripConfiguration.queryOptions({ tripId: tripId! }),
    enabled: !!tripId,
  })

  const submitTripMutation = useMutation(trpc.submitTripConfiguration.mutationOptions())
  const generateMutation = useMutation(trpc.discovery.generateItinerary.mutationOptions())

  const isLoading = submitTripMutation.isPending || generateMutation.isPending

  const handleFormSubmit = async (data: TripFormValues) => {
    const finalDietary = [...data.dietaryOptions, data.dietaryCustom].filter(Boolean).join(', ')
    const finalMedical = [...data.medicalOptions, data.medicalCustom].filter(Boolean).join(', ')

    try {
      const result = await submitTripMutation.mutateAsync({
        ...data,
        ages: data.ages.map((a) => a.value),
        dietaryRestrictions: finalDietary,
        medicalConditions: finalMedical,
        tripId,
      })
      await generateMutation.mutateAsync({ tripId: result.tripId })
      navigate({ to: '/trip/$tripId', params: { tripId: result.tripId } })
    } catch (error) {
      console.error('❌ Erreur lors de la création du voyage :', error)
      alert('Une erreur est survenue, regarde la console.')
    }
  }

  if (tripId && existingTripQuery.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <p className="text-muted">Chargement…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface px-4 py-8 sm:px-6 desktop:py-12">
      <div className="mx-auto max-w-2xl desktop:max-w-3xl">
        <div className="mb-2 flex items-center gap-2 px-1 text-ink-soft">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-base text-white">✈️</span>
          <span className="text-base font-extrabold tracking-tight text-ink">Voyagr</span>
        </div>
        <TripForm
          initialDestination={existingTripQuery.data?.destination ?? 'Paris'}
          onSubmit={handleFormSubmit}
          isLoading={isLoading}
        />
      </div>
    </div>
  )
}
