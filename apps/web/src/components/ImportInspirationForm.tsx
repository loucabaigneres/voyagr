import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Link2, Loader2, MapPin, Plus, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { trpc, type RouterOutputs } from '../lib/trpc';
import type { ImportInspirationValues } from '../lib/validations/inspiration';
import {
  AI_UNAVAILABLE,
  CAPTION_UNAVAILABLE,
  importInspirationSchema,
} from '../lib/validations/inspiration';

type ImportResult = RouterOutputs['inspiration']['analyzeFromUrl'];

interface ImportInspirationFormProps {
  onSuccess?: (result: ImportResult) => void;
  onCancel?: () => void;
  compact?: boolean;
  className?: string;
}

export function ImportInspirationForm({
  onSuccess,
  onCancel,
  compact = false,
  className = '',
}: ImportInspirationFormProps) {
  const queryClient = useQueryClient();
  const [showCaptionField, setShowCaptionField] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tripId, setTripId] = useState('');
  const [addedTo, setAddedTo] = useState<{ tripId: string; count: number } | null>(null);

  const tripsQuery = useQuery(trpc.user.getTrips.queryOptions());
  const trips = tripsQuery.data ?? [];
  const effectiveTripId = tripId || trips[0]?.id || '';

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ImportInspirationValues>({
    resolver: zodResolver(importInspirationSchema as never),
    defaultValues: { url: '', caption: '' },
  });

  const addToTripMutation = useMutation(
    trpc.inspiration.addToTrip.mutationOptions({
      onSuccess: (data) => {
        setAddedTo({ tripId: data.tripId, count: data.added });
        queryClient.invalidateQueries(trpc.discovery.getTrip.queryFilter({ tripId: data.tripId }));
      },
    }),
  );

  const analyzeMutation = useMutation(
    trpc.inspiration.analyzeFromUrl.mutationOptions({
      onSuccess: (data) => {
        setResult(data);
        setErrorMessage(null);
        setShowCaptionField(false);
        setAddedTo(null);
        reset({ url: '', caption: '' });
        onSuccess?.(data);
      },
      onError: (error) => {
        setResult(null);

        if (error.message === CAPTION_UNAVAILABLE) {
          // La récupération automatique a échoué : on déplie la saisie manuelle.
          setShowCaptionField(true);
          setErrorMessage(
            "Impossible de récupérer le contenu automatiquement. Colle la description ci-dessous pour lancer l'analyse.",
          );
          return;
        }

        if (error.message === AI_UNAVAILABLE) {
          setErrorMessage(
            "L'analyse IA n'est pas disponible pour le moment (configuration serveur manquante).",
          );
          return;
        }

        setErrorMessage(error.message);
      },
    }),
  );

  const onSubmit = (values: ImportInspirationValues) => {
    const caption = values.caption?.trim();
    analyzeMutation.mutate({ url: values.url, caption: caption || undefined });
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={`rounded-3xl border border-[#eee] bg-white shadow-sm ${compact ? 'p-5' : 'p-6 sm:p-8'} ${className}`}
    >
      <div>
        <label htmlFor="inspirationUrl" className="mb-2 block text-sm font-medium text-[#1a1a1a]">
          Lien TikTok ou Instagram
        </label>
        <div className="relative">
          <Link2 className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#bbb]" />
          <input
            id="inspirationUrl"
            type="url"
            inputMode="url"
            autoComplete="off"
            placeholder="https://www.tiktok.com/@compte/video/..."
            className="w-full rounded-xl border border-[#ddd] bg-white p-3 pl-9 text-[#1a1a1a] outline-none transition focus:border-[#FF4D4D] focus:ring-2 focus:ring-[#FF4D4D]/20"
            {...register('url')}
          />
        </div>
        {errors.url && (
          <p className="mt-2 text-xs font-medium text-[#FF4D4D]">{errors.url.message}</p>
        )}
      </div>

      {!showCaptionField && (
        <button
          type="button"
          onClick={() => setShowCaptionField(true)}
          className="mt-2 cursor-pointer text-xs font-semibold text-[#888] underline underline-offset-2 transition hover:text-[#FF4D4D]"
        >
          Un problème ?
        </button>
      )}

      {showCaptionField && (
        <div className="mt-4">
          <label
            htmlFor="inspirationCaption"
            className="mb-2 block text-sm font-medium text-[#1a1a1a]"
          >
            Colle la description du post
          </label>
          <textarea
            id="inspirationCaption"
            rows={compact ? 3 : 4}
            placeholder="Colle ici la légende de la publication, avec ses #hashtags…"
            className="w-full resize-y rounded-xl border border-[#ddd] bg-white p-3 text-[#1a1a1a] outline-none transition focus:border-[#FF4D4D] focus:ring-2 focus:ring-[#FF4D4D]/20"
            {...register('caption')}
          />
          <p className="mt-2 text-xs text-[#888]">
            Certaines publications (surtout sur Instagram) ne peuvent pas être lues automatiquement.
          </p>
          {errors.caption && (
            <p className="mt-2 text-xs font-medium text-[#FF4D4D]">{errors.caption.message}</p>
          )}
        </div>
      )}

      {errorMessage && (
        <div className="mt-4 rounded-xl bg-[#fee] p-3 text-xs font-semibold text-[#FF4D4D]">
          {errorMessage}
        </div>
      )}

      {result && (
        <div className="mt-4 space-y-4 rounded-xl bg-[#e8f8f0] p-4">
          <p className="text-xs font-semibold text-[#2ecc71]">
            ✓ Analysé depuis {result.inspiration.platform === 'tiktok' ? 'TikTok' : 'Instagram'}
          </p>
          {result.alreadyImported && (
            <p className="text-xs font-medium text-[#888]">
              Cette vidéo avait déjà été analysée : voici son analyse (aucun doublon créé).
            </p>
          )}

          {result.inspiration.report && (
            <div>
              <p className="text-xs font-bold tracking-wide text-[#1a1a1a] uppercase">
                Compte rendu
              </p>
              <p className="mt-1 text-sm leading-relaxed text-[#1a1a1a]">
                {result.inspiration.report}
              </p>
            </div>
          )}

          {result.inspiration.places.length > 0 && (
            <div>
              <p className="text-xs font-bold tracking-wide text-[#1a1a1a] uppercase">
                Lieux détectés
              </p>
              <ul className="mt-2 space-y-2">
                {result.inspiration.places.map((place, index) => (
                  <li
                    key={`${place.name}-${index}`}
                    className="flex gap-2 rounded-lg bg-white p-3 shadow-sm"
                  >
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#FF4D4D]" />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#1a1a1a]">{place.name}</p>
                      {place.address ? (
                        <p className="text-xs text-[#555]">{place.address}</p>
                      ) : (
                        [place.city, place.country].filter(Boolean).length > 0 && (
                          <p className="text-xs text-[#555]">
                            {[place.city, place.country].filter(Boolean).join(', ')}
                          </p>
                        )
                      )}
                      {place.description && (
                        <p className="mt-1 text-xs text-[#888]">{place.description}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.inspiration.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {result.inspiration.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#1a1a1a] shadow-sm"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {result.inspiration.places.length > 0 && (
            <div className="border-t border-[#2ecc71]/20 pt-3">
              {addedTo ? (
                <p className="text-xs font-semibold text-[#2ecc71]">
                  ✓ {addedTo.count} lieu{addedTo.count > 1 ? 'x' : ''} ajouté
                  {addedTo.count > 1 ? 's' : ''} à ton voyage.{' '}
                  <Link
                    to="/trip/$tripId"
                    params={{ tripId: addedTo.tripId }}
                    className="font-bold text-[#1a1a1a] underline underline-offset-2 hover:text-[#FF4D4D]"
                  >
                    Voir le voyage
                  </Link>
                </p>
              ) : trips.length === 0 ? (
                <p className="text-xs font-medium text-[#888]">
                  Crée d'abord un voyage pour y ajouter ces lieux.
                </p>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={effectiveTripId}
                    onChange={(e) => setTripId(e.target.value)}
                    className="max-w-[55vw] cursor-pointer truncate rounded-xl border border-[#ddd] bg-white px-3 py-2 text-sm text-[#1a1a1a] outline-none focus:border-[#FF4D4D] sm:max-w-[220px]"
                  >
                    {trips.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title || t.destination || 'Voyage sans titre'}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!effectiveTripId || addToTripMutation.isPending}
                    onClick={() =>
                      addToTripMutation.mutate({
                        tripId: effectiveTripId,
                        inspirationIds: [result.inspiration.id],
                      })
                    }
                    className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#FF4D4D] px-4 py-2 text-sm font-bold text-white shadow-md shadow-red-500/25 transition hover:brightness-105 active:scale-95 disabled:opacity-50"
                  >
                    {addToTripMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" strokeWidth={3} />
                    )}
                    Ajouter au voyage
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="mt-6 flex gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer rounded-2xl border border-[#ddd] bg-white px-5 py-3.5 text-sm font-semibold text-[#888] transition hover:border-[#FF4D4D]/30 hover:text-[#FF4D4D] active:scale-95"
          >
            Annuler
          </button>
        )}
        <button
          type="submit"
          disabled={analyzeMutation.isPending}
          className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#FF4D4D] py-3.5 text-sm font-bold text-white shadow-lg shadow-red-500/25 transition hover:brightness-105 active:scale-95 disabled:opacity-50"
        >
          {analyzeMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyse en cours…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Analyser l'inspiration
            </>
          )}
        </button>
      </div>
    </form>
  );
}
