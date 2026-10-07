import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import {
  Check,
  ExternalLink,
  Folder,
  FolderPlus,
  Loader2,
  MapPin,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { trpc, type RouterOutputs } from '../lib/trpc';
import { ConfirmDialog } from './ConfirmDialog';

type Inspiration = RouterOutputs['inspiration']['listMine'][number];

interface InspirationListProps {
  enabled?: boolean;
  emptyAction?: ReactNode;
  className?: string;
}

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

// 'all' = toutes, 'none' = sans groupe, sinon l'id du groupe.
type GroupFilter = 'all' | 'none' | string;

export function InspirationList({
  enabled = true,
  emptyAction,
  className = '',
}: InspirationListProps) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tripId, setTripId] = useState('');
  const [groupTarget, setGroupTarget] = useState('');
  const [activeGroup, setActiveGroup] = useState<GroupFilter>('all');
  const [newGroupName, setNewGroupName] = useState('');
  const [addedTo, setAddedTo] = useState<{ tripId: string; count: number } | null>(null);
  // Confirmation de suppression (publication ou groupe), dans la DA du projet.
  const [confirm, setConfirm] = useState<
    { kind: 'inspiration'; id: string } | { kind: 'group'; id: string; name: string } | null
  >(null);

  const invalidateMine = () =>
    queryClient.invalidateQueries(trpc.inspiration.listMine.queryFilter());
  const invalidateGroups = () =>
    queryClient.invalidateQueries(trpc.inspiration.listGroups.queryFilter());

  const importsQuery = useQuery({ ...trpc.inspiration.listMine.queryOptions(), enabled });
  const tripsQuery = useQuery({ ...trpc.user.getTrips.queryOptions(), enabled });
  const groupsQuery = useQuery({ ...trpc.inspiration.listGroups.queryOptions(), enabled });

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
        setConfirm(null);
        invalidateMine();
      },
    }),
  );

  const createGroupMutation = useMutation(
    trpc.inspiration.createGroup.mutationOptions({
      onSuccess: () => {
        setNewGroupName('');
        invalidateGroups();
      },
    }),
  );

  const deleteGroupMutation = useMutation(
    trpc.inspiration.deleteGroup.mutationOptions({
      onSuccess: () => {
        setConfirm(null);
        setActiveGroup('all');
        invalidateGroups();
        invalidateMine();
      },
    }),
  );

  const addToGroupMutation = useMutation(
    trpc.inspiration.addToGroup.mutationOptions({
      onSuccess: () => {
        setSelected(new Set());
        invalidateMine();
      },
    }),
  );

  const removeFromGroupMutation = useMutation(
    trpc.inspiration.removeFromGroup.mutationOptions({ onSuccess: invalidateMine }),
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

  const confirmDelete = () => {
    if (!confirm) return;
    if (confirm.kind === 'inspiration') {
      const id = confirm.id;
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      deleteMutation.mutate({ id });
    } else {
      deleteGroupMutation.mutate({ id: confirm.id });
    }
  };

  const groups = groupsQuery.data ?? [];
  const groupName = (id: string) => groups.find((g) => g.id === id)?.name ?? 'Groupe';
  const trips = tripsQuery.data ?? [];
  const tripLabel = (t: (typeof trips)[number]) => t.title || t.destination || 'Voyage sans titre';
  const effectiveTripId = tripId || trips[0]?.id || '';
  const effectiveGroupTarget = groupTarget || groups[0]?.id || '';

  // `groupIds` est toujours renvoyé par l'API, mais on se protège d'une réponse
  // ancienne/partielle pour ne jamais crasher l'affichage de la liste.
  const all = (importsQuery.data ?? []).map((i) => ({ ...i, groupIds: i.groupIds ?? [] }));
  const countFor = (f: GroupFilter) =>
    f === 'all'
      ? all.length
      : f === 'none'
        ? all.filter((i) => i.groupIds.length === 0).length
        : all.filter((i) => i.groupIds.includes(f)).length;

  const visible = all.filter((i) =>
    activeGroup === 'all'
      ? true
      : activeGroup === 'none'
        ? i.groupIds.length === 0
        : i.groupIds.includes(activeGroup),
  );

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

  const chip = (f: GroupFilter, label: string, deletable?: { id: string; name: string }) => {
    const isActive = activeGroup === f;
    return (
      <span
        key={f}
        className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
          isActive
            ? 'border-[#FF4D4D] bg-[#FF4D4D] text-white'
            : 'border-[#ddd] bg-white text-[#555] hover:border-[#FF4D4D]'
        }`}
      >
        <button type="button" onClick={() => setActiveGroup(f)} className="cursor-pointer">
          {label} ({countFor(f)})
        </button>
        {deletable && isActive && (
          <button
            type="button"
            onClick={() => setConfirm({ kind: 'group', id: deletable.id, name: deletable.name })}
            aria-label={`Supprimer le groupe ${deletable.name}`}
            className="cursor-pointer rounded-full p-0.5 hover:bg-white/20"
          >
            <X className="h-3 w-3" strokeWidth={3} />
          </button>
        )}
      </span>
    );
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Barre des groupes */}
      <div className="flex flex-wrap items-center gap-2">
        {chip('all', 'Tous')}
        {chip('none', 'Sans groupe')}
        {groups.map((g) => chip(g.id, g.name, { id: g.id, name: g.name }))}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (newGroupName.trim()) createGroupMutation.mutate({ name: newGroupName.trim() });
          }}
          className="flex items-center gap-1"
        >
          <input
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="Nouveau groupe"
            maxLength={60}
            className="w-32 rounded-full border border-[#ddd] bg-white px-3 py-1.5 text-xs text-[#1a1a1a] outline-none focus:border-[#FF4D4D]"
          />
          <button
            type="submit"
            disabled={!newGroupName.trim() || createGroupMutation.isPending}
            aria-label="Créer le groupe"
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-[#ddd] bg-white text-[#555] transition hover:border-[#FF4D4D] hover:text-[#FF4D4D] disabled:opacity-40"
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>

      {/* Liste filtrée */}
      {visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[#ddd] bg-white p-6 text-center text-sm text-[#888]">
          Aucune publication dans ce groupe.
        </p>
      ) : (
        visible.map((item) => {
          const selectable = item.places.length > 0;
          const isSelected = selected.has(item.id);
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
                      <span className="rounded-full bg-[#fee] px-3 py-1 text-xs font-bold text-[#FF4D4D] capitalize">
                        {item.platform}
                      </span>
                      <button
                        type="button"
                        onClick={() => setConfirm({ kind: 'inspiration', id: item.id })}
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

                  {item.groupIds.length > 0 && (
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      {item.groupIds.map((gid) => (
                        <span
                          key={gid}
                          className="inline-flex items-center gap-1 rounded-full bg-[#eef3ff] px-2.5 py-1 text-xs font-semibold text-[#3b5bdb]"
                        >
                          {groupName(gid)}
                          <button
                            type="button"
                            onClick={() =>
                              removeFromGroupMutation.mutate({
                                inspirationIds: [item.id],
                                groupId: gid,
                              })
                            }
                            aria-label={`Retirer de ${groupName(gid)}`}
                            className="cursor-pointer rounded-full p-0.5 transition hover:bg-[#3b5bdb]/15"
                          >
                            <X className="h-3 w-3" strokeWidth={3} />
                          </button>
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
        <div className="sticky bottom-3 z-10 space-y-4 rounded-2xl border border-[#eee] bg-white/95 p-4 shadow-lg backdrop-blur">
          <div className="flex items-center justify-between gap-3">
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

          {/* Section 1 — organisation en groupes */}
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#888]">
              <Folder className="h-3.5 w-3.5" />
              Organiser dans un groupe
            </p>
            {groups.length === 0 ? (
              <p className="text-xs font-medium text-[#888]">
                Crée un groupe plus haut pour pouvoir classer ces publications.
              </p>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={effectiveGroupTarget}
                  onChange={(e) => setGroupTarget(e.target.value)}
                  className="max-w-[45vw] cursor-pointer truncate rounded-xl border border-[#ddd] bg-white px-3 py-2 text-sm text-[#1a1a1a] outline-none focus:border-[#FF4D4D] sm:max-w-[160px]"
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!effectiveGroupTarget || addToGroupMutation.isPending}
                  onClick={() =>
                    addToGroupMutation.mutate({
                      inspirationIds: [...selected],
                      groupId: effectiveGroupTarget,
                    })
                  }
                  className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#FF4D4D] px-3 py-2 text-sm font-bold text-[#FF4D4D] transition hover:bg-[#FF4D4D] hover:text-white active:scale-95 disabled:opacity-50"
                >
                  {addToGroupMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" strokeWidth={3} />
                  )}
                  Classer ici
                </button>
                <button
                  type="button"
                  disabled={!effectiveGroupTarget || removeFromGroupMutation.isPending}
                  onClick={() =>
                    removeFromGroupMutation.mutate({
                      inspirationIds: [...selected],
                      groupId: effectiveGroupTarget,
                    })
                  }
                  className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#ddd] px-3 py-2 text-sm font-semibold text-[#555] transition hover:border-[#1a1a1a]/30 active:scale-95 disabled:opacity-50"
                >
                  Retirer
                </button>
              </div>
            )}
          </div>

          <div className="border-t border-[#eee]" />

          {/* Section 2 — ajout à un voyage */}
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#888]">
              <MapPin className="h-3.5 w-3.5" />
              Ajouter les lieux à un voyage
            </p>
            {trips.length === 0 ? (
              <p className="text-xs font-medium text-[#888]">
                Crée d'abord un voyage pour y ajouter ces lieux.
              </p>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={effectiveTripId}
                  onChange={(e) => setTripId(e.target.value)}
                  className="max-w-[45vw] cursor-pointer truncate rounded-xl border border-[#ddd] bg-white px-3 py-2 text-sm text-[#1a1a1a] outline-none focus:border-[#FF4D4D] sm:max-w-[200px]"
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
        </div>
      )}

      {(addToTripMutation.isError ||
        addToGroupMutation.isError ||
        removeFromGroupMutation.isError ||
        deleteMutation.isError) && (
        <p className="text-center text-xs font-medium text-[#FF4D4D]">
          Une action a échoué, réessaie.
        </p>
      )}

      {confirm && (
        <ConfirmDialog
          title={
            confirm.kind === 'inspiration' ? 'Supprimer la publication ?' : 'Supprimer le groupe ?'
          }
          message={
            confirm.kind === 'inspiration'
              ? 'Cette publication analysée sera retirée de ta liste. Les lieux déjà ajoutés à tes voyages sont conservés.'
              : `« ${confirm.name} » sera supprimé. Les publications qu'il contient seront déclassées, pas supprimées.`
          }
          loading={
            confirm.kind === 'inspiration'
              ? deleteMutation.isPending
              : deleteGroupMutation.isPending
          }
          onConfirm={confirmDelete}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
