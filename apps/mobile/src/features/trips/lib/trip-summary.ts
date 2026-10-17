export type TripStatus = 'draft' | 'finalized' | 'archived';

export interface TripStatusMeta {
  label: string;
  tone: 'neutral' | 'success' | 'brand';
}

const STATUS_META: Record<TripStatus, TripStatusMeta> = {
  draft: { label: 'Brouillon', tone: 'neutral' },
  finalized: { label: 'Finalisé', tone: 'success' },
  archived: { label: 'Archivé', tone: 'brand' },
};

export function tripStatusMeta(status: string | null | undefined): TripStatusMeta {
  return STATUS_META[status as TripStatus] ?? STATUS_META.draft;
}

export function tripDisplayTitle(trip: {
  title?: string | null;
  destination?: string | null;
}): string {
  const title = trip.title?.trim();
  if (title) return title;
  const destination = trip.destination?.trim();
  return destination ? `Voyage à ${destination}` : 'Voyage sans destination';
}
