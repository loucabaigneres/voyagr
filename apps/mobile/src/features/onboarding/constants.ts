import {
  BankIcon,
  BarnIcon,
  BuildingsIcon,
  CloudSunIcon,
  CoffeeIcon,
  ForkKnifeIcon,
  HeartIcon,
  MartiniIcon,
  MountainsIcon,
  PersonSimpleHikeIcon,
  SnowflakeIcon,
  SunIcon,
  UserIcon,
  UsersFourIcon,
  UsersThreeIcon,
  WavesIcon,
  type AppIcon,
} from '@/ui/icons';

import type { QuizOption, QuizQuestion } from './lib/quiz';

export interface QuestionOption<Q extends QuizQuestion> {
  value: QuizOption<Q>;
  title: string;
  description: string;
  icon: AppIcon;
}

export interface QuestionCopy<Q extends QuizQuestion> {
  title: string;
  subtitle: string;
  options: QuestionOption<Q>[];
}

export const QUESTIONS: { [Q in QuizQuestion]: QuestionCopy<Q> } = {
  landscapes: {
    title: 'Quels décors t’inspirent ?',
    subtitle: 'Choisis un ou plusieurs environnements pour ton séjour.',
    options: [
      {
        value: 'city',
        title: 'Cité vibrante & histoire',
        description: 'Architecture, ruelles vivantes, musées et effervescence urbaine.',
        icon: BuildingsIcon,
      },
      {
        value: 'coast',
        title: 'Littoral & grand large',
        description: 'Plages, côtes sauvages, brise marine et couchers de soleil.',
        icon: WavesIcon,
      },
      {
        value: 'nature',
        title: 'Montagne & grands espaces',
        description: 'Sentiers d’altitude, air pur, forêts et panoramas ouverts.',
        icon: MountainsIcon,
      },
      {
        value: 'countryside',
        title: 'Terroir & campagne',
        description: 'Villages préservés, vignobles et quiétude.',
        icon: BarnIcon,
      },
    ],
  },
  vibes: {
    title: 'Quelles atmosphères recherches-tu ?',
    subtitle: 'Sélectionne les expériences qui te font envie.',
    options: [
      {
        value: 'culture',
        title: 'Culture & patrimoine',
        description: 'Monuments, expositions et immersion locale.',
        icon: BankIcon,
      },
      {
        value: 'food',
        title: 'Gastronomie & terroir',
        description: 'Marchés typiques, spécialités régionales et tables gourmandes.',
        icon: ForkKnifeIcon,
      },
      {
        value: 'outdoor',
        title: 'Outdoor & aventure',
        description: 'Randonnées, activités de plein air et sensations.',
        icon: PersonSimpleHikeIcon,
      },
      {
        value: 'relax',
        title: 'Farniente & déconnexion',
        description: 'Rythme lent, terrasses paisibles et détente au calme.',
        icon: CoffeeIcon,
      },
      {
        value: 'nightlife',
        title: 'Vie nocturne & sorties',
        description: 'Bars animés, concerts et ambiance festive le soir.',
        icon: MartiniIcon,
      },
    ],
  },
  travelWith: {
    title: 'Avec qui voyages-tu ?',
    subtitle: 'Précise la dynamique de ton groupe.',
    options: [
      {
        value: 'solo',
        title: 'En solo',
        description: 'Liberté complète et découvertes à ton rythme.',
        icon: UserIcon,
      },
      {
        value: 'couple',
        title: 'En couple',
        description: 'Escapade intime et moments à deux.',
        icon: HeartIcon,
      },
      {
        value: 'friends',
        title: 'Entre potes',
        description: 'Sorties, fous rires et road trip partagé.',
        icon: UsersThreeIcon,
      },
      {
        value: 'family',
        title: 'En famille',
        description: 'Des activités pour les petits comme pour les grands.',
        icon: UsersFourIcon,
      },
    ],
  },
  climates: {
    title: 'Quel climat préfères-tu ?',
    subtitle: 'Dernière question pour orienter la géographie du voyage.',
    options: [
      {
        value: 'warm',
        title: 'Grand soleil & chaleur',
        description: 'Chaleur estivale, idéal pour vivre dehors.',
        icon: SunIcon,
      },
      {
        value: 'mild',
        title: 'Douceur tempérée',
        description: 'Températures agréables, parfaites pour explorer à pied.',
        icon: CloudSunIcon,
      },
      {
        value: 'cold',
        title: 'Fraîcheur & hiver',
        description: 'Air vif, plaids et paysages de neige.',
        icon: SnowflakeIcon,
      },
    ],
  },
};

export const ONBOARDING_COPY = {
  step: (current: number, total: number) => `Question ${current} sur ${total}`,
  hint: 'Plusieurs choix possibles',
  back: 'Revenir à la question précédente',
  continue: 'Continuer',
  submit: 'Découvrir mes destinations',
  analyzing: {
    title: 'On analyse tes envies…',
    subtitle: 'On sélectionne les destinations et les lieux qui te ressemblent.',
  },
  error: 'Impossible d’enregistrer tes réponses pour le moment. Vérifie ta connexion et réessaie.',
} as const;
