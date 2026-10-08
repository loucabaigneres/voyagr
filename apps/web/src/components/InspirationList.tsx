import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Check, ChevronDown, ExternalLink, Loader2, MapPin, Plus, Trash2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { trpc, type RouterOutputs } from '../lib/trpc';
import { ConfirmDialog } from './ConfirmDialog';

type Inspiration = RouterOutputs['inspiration']['listMine'][number];

interface InspirationListProps {
  enabled?: boolean;
  emptyAction?: ReactNode;
  className?: string;
}

// Types proposés au filtre (alignés sur le champ `type` renvoyé par l'IA).
const TYPE_OPTIONS = [
  { value: 'hotel', label: 'Hôtel' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'activité', label: 'Activité' },
] as const;

const typeLabel = (type: string | null): string =>
  TYPE_OPTIONS.find((o) => o.value === type)?.label ?? '';

// Un titre lisible à partir de l'analyse, à la place de l'URL brute.
function inspirationTitle(item: Inspiration): string {
  if (item.places.length > 0) {
    const first = item.places[0]!.name;
    return item.places.length > 1 ? `${first} +${item.places.length - 1}` : first;
  }
  if (item.report) {
    return item.report.length > 60 ? `${item.report.slice(0, 60).trimEnd()}…` : item.report;
  }
  return item.platform === 'tiktok' ? 'Publication TikTok' : 'Publication Instagram';
}

export function InspirationList({
  enabled = true,
  emptyAction,
  className = '',
}: InspirationListProps) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tripId, setTripId] = useState('');
  const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set());
  const [addedTo, setAddedTo] = useState<{ tripId: string; count: number } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const importsQuery = useQuery({ ...trpc.inspiration.listMine.queryOptions(), enabled });
  const tripsQuery = useQuery({ ...trpc.user.getTrips.queryOptions(), enabled });

  const addToTripMutation = useMutation(
    trpc.inspiration.addToTrip.mutationOptions({
      onSuccess: (data) => {
        setAddedTo({ tripId: data.tripId, count: data.added });
        setSelected(new Set());
        queryClient.invalidateQueries(trpc.discovery.getTrip.queryFilter({ tripId: data.tripId }));
      },
    }),
  );

  const deleteMutation = useMutation(
    trpc.inspiration.delete.mutationOptions({
      onSuccess: () => {
        setConfirmDeleteId(null);
        queryClient.invalidateQueries(trpc.inspiration.listMine.queryFilter());
      },
    }),
  );

  const toggle = (id: string) => {
    setAddedTo(null);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleType = (value: string) =>
    setTypeFilter((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });

  const trips = tripsQuery.data ?? [];
  const tripLabel = (t: (typeof trips)[number]) => t.title || t.destination || 'Voyage sans titre';
  const effectiveTripId = tripId || trips[0]?.id || '';

  const all = importsQuery.data ?? [];
  // Aucun type coché = on affiche tout ; sinon on garde les publications du/des types choisis.
  const visible =
    typeFilter.size === 0 ? all : all.filter((i) => i.type !== null && typeFilter.has(i.type));

  const selectedCount = selected.size;

  if (importsQuery.isLoading) {
    return (
      <p className="p-6 text-center text-sm font-medium text-[#888]">Chargement de tes imports…</p>
    );
  }

  if (all.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-[#ddd] bg-white p-10 text-center shadow-sm">
        <span className="text-4xl">✨</span>
        <p className="text-sm font-semibold text-[#1a1a1a]">
          Tu n'as pas encore importé d'inspiration.
        </p>
        {emptyAction}
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Filtre par type (dropdown multi-sélection) */}
      <details className="relative">
        <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-full border border-[#ddd] bg-white px-4 py-2 text-sm font-semibold text-[#555] transition hover:border-[#FF4D4D] [&::-webkit-details-marker]:hidden">
          <ChevronDown className="h-4 w-4" />
          Filtrer par type
          {typeFilter.size > 0 && (
            <span className="rounded-full bg-[#FF4D4D] px-1.5 text-xs font-bold text-white">
              {typeFilter.size}
            </span>
          )}
        </summary>
        <div className="absolute z-20 mt-2 w-52 space-y-1 rounded-2xl border border-[#eee] bg-white p-2 shadow-lg">
          {TYPE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 text-sm text-[#1a1a1a] hover:bg-[#f6f3f0]"
            >
              <input
                type="checkbox"
                checked={typeFilter.has(opt.value)}
                onChange={() => toggleType(opt.value)}
                className="h-4 w-4 accent-[#FF4D4D]"
              />
              {opt.label}
            </label>
          ))}
          {typeFilter.size > 0 && (
            <button
              type="button"
              onClick={() => setTypeFilter(new Set())}
              className="w-full cursor-pointer rounded-xl px-2 py-1.5 text-left text-xs font-semibold text-[#888] hover:bg-[#f6f3f0] hover:text-[#FF4D4D]"
            >
              Tout afficher
            </button>
          )}
        </div>
      </details>

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[#ddd] bg-white p-6 text-center text-sm text-[#888]">
          Aucune publication de ce type.
        </p>
      ) : (
        visible.map((item) => {
          const selectable = item.places.length > 0;
          const isSelected = selected.has(item.id);
          const label = typeLabel(item.type);
          return (
            <div
              key={item.id}
              className={`rounded-2xl border bg-white p-5 shadow-sm transition ${
                isSelected ? 'border-[#FF4D4D] ring-2 ring-[#FF4D4D]/20' : 'border-[#eee]'
              }`}
            >
              <div className="flex items-start gap-3">
                {selectable ? (
                  <button
                    type="button"
                    onClick={() => toggle(item.id)}
                    aria-pressed={isSelected}
                    aria-label={isSelected ? 'Désélectionner' : 'Sélectionner'}
                    className={`mt-0.5 flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-md border transition ${
                      isSelected
                        ? 'border-[#FF4D4D] bg-[#FF4D4D] text-white'
                        : 'border-[#ccc] bg-white hover:border-[#FF4D4D]'
                    }`}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                  </button>
                ) : (
                  <span
                    className="mt-0.5 h-5 w-5 shrink-0 rounded-md border border-dashed border-[#ddd]"
                    title="Aucun lieu détecté : rien à ajouter à un voyage."
                  />
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[#1a1a1a]">
                        {inspirationTitle(item)}
                      </p>
                      <a
                        href={item.originalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-[#888] hover:text-[#FF4D4D]"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Voir la publication
                      </a>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {label && (
                        <span className="rounded-full bg-[#eef3ff] px-3 py-1 text-xs font-bold text-[#3b5bdb]">
                          {label}
                        </span>
                      )}
                      <span className="rounded-full bg-[#fee] px-3 py-1 text-xs font-bold text-[#FF4D4D] capitalize">
                        {item.platform}
                      </span>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(item.id)}
                        aria-label="Supprimer cette publication"
                        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-[#eee] text-[#bbb] transition hover:border-[#FF4D4D] hover:text-[#FF4D4D]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {item.report ? (
                    <p className="mt-2 line-clamp-4 text-xs leading-relaxed text-[#555]">
                      {item.report}
                    </p>
                  ) : (
                    item.description && (
                      <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-[#555]">
                        {item.description}
                      </p>
                    )
                  )}

                  {item.places.length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {item.places.map((place, index) => (
                        <li
                          key={`${place.name}-${index}`}
                          className="flex items-start gap-2 text-xs"
                        >
                          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#FF4D4D]" />
                          <span className="text-[#1a1a1a]">
                            <span className="font-bold">{place.name}</span>
                            {place.address
                              ? ` — ${place.address}`
                              : [place.city, place.country].filter(Boolean).length > 0
                                ? ` — ${[place.city, place.country].filter(Boolean).join(', ')}`
                                : ''}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {item.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-[#F2EDE8] px-3 py-1 text-xs font-semibold text-[#555]"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}

      {addedTo && (
        <div className="rounded-2xl bg-[#e8f8f0] p-4 text-sm">
          {addedTo.count > 0 ? (
            <p className="font-semibold text-[#2ecc71]">
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
          ) : (
            <p className="font-semibold text-[#888]">Aucun lieu à ajouter dans la sélection.</p>
          )}
        </div>
      )}

      {/* Barre d'actions sur la sélection */}
      {selectedCount > 0 && (
        <div className="sticky bottom-3 z-10 flex flex-col gap-3 rounded-2xl border border-[#eee] bg-white/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-[#1a1a1a]">
              {selectedCount} post{selectedCount > 1 ? 's' : ''} sélectionné
              {selectedCount > 1 ? 's' : ''}
            </span>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="cursor-pointer text-xs font-semibold text-[#888] underline underline-offset-2 transition hover:text-[#FF4D4D]"
            >
              Effacer
            </button>
          </div>

          {trips.length === 0 ? (
            <span className="text-xs font-medium text-[#888]">
              Crée d'abord un voyage pour y ajouter ces lieux.
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <select
                value={effectiveTripId}
                onChange={(e) => setTripId(e.target.value)}
                className="max-w-[55vw] cursor-pointer truncate rounded-xl border border-[#ddd] bg-white px-3 py-2 text-sm text-[#1a1a1a] outline-none focus:border-[#FF4D4D] sm:max-w-[200px]"
              >
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>
                    {tripLabel(t)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!effectiveTripId || addToTripMutation.isPending}
                onClick={() =>
                  addToTripMutation.mutate({
                    tripId: effectiveTripId,
                    inspirationIds: [...selected],
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

      {(addToTripMutation.isError || deleteMutation.isError) && (
        <p className="text-center text-xs font-medium text-[#FF4D4D]">
          Une action a échoué, réessaie.
        </p>
      )}

      {confirmDeleteId && (
        <ConfirmDialog
          title="Supprimer la publication ?"
          message="Cette publication analysée sera retirée de ta liste. Les lieux déjà ajoutés à tes voyages sont conservés."
          loading={deleteMutation.isPending}
          onConfirm={() => {
            const id = confirmDeleteId;
            setSelected((prev) => {
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
            deleteMutation.mutate({ id });
          }}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  );
}
