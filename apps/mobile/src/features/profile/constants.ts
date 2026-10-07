import type { Segment } from '@/ui';

export const PROFILE_COPY = {
  guest: {
    overline: 'Ton profil',
    title: 'Garde tes voyages sous la main',
    description:
      'Crée un compte pour enregistrer tes itinéraires et les retrouver sur tous tes appareils.',
    signIn: 'Se connecter',
    signUp: 'Créer un compte',
  },
  memberSince: 'Membre depuis le',
  fallbackName: 'Voyageur',
  stats: {
    trips: { singular: 'Voyage créé', plural: 'Voyages créés' },
    likes: { singular: 'Lieu liké', plural: 'Lieux likés' },
  },
  editName: {
    title: 'Ton prénom',
    label: 'Prénom affiché',
    save: 'Enregistrer',
    saved: 'C’est noté, ton prénom est à jour.',
    error: 'Impossible d’enregistrer pour le moment. Réessaie dans un instant.',
  },
  signOut: 'Se déconnecter',
  segments: { trips: 'Voyages', inspirations: 'Inspirations' },
  settings: { title: 'Paramètres', back: 'Retour' },
  loadError: {
    title: 'Profil indisponible',
    message: 'On n’arrive pas à charger ton profil. Vérifie ta connexion, puis on réessaie.',
  },
} as const;

export type ProfileSegment = 'trips' | 'inspirations';

export const PROFILE_SEGMENTS: readonly Segment<ProfileSegment>[] = [
  { value: 'trips', label: PROFILE_COPY.segments.trips },
  { value: 'inspirations', label: PROFILE_COPY.segments.inspirations },
];
