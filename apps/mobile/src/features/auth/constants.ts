export const AUTH_COPY = {
  signIn: {
    overline: 'Content de te revoir',
    title: 'Reprends ton voyage',
    subtitle: 'Connecte-toi pour retrouver et enregistrer tes itinéraires.',
    submit: 'Se connecter',
    switchPrompt: 'Pas encore de compte ?',
    switchCta: 'Créer un compte',
  },
  signUp: {
    overline: 'Bienvenue',
    title: 'Garde tes escapades sous la main',
    subtitle: 'Un compte pour retrouver tes voyages sur tous tes appareils.',
    submit: 'Créer mon compte',
    switchPrompt: 'Déjà un compte ?',
    switchCta: 'Se connecter',
  },
  fields: {
    name: { label: 'Prénom', placeholder: 'Léa' },
    email: { label: 'Email', placeholder: 'lea@exemple.fr' },
    password: { label: 'Mot de passe', placeholder: '8 caractères minimum' },
  },
  google: {
    separator: 'ou',
    cta: 'Continuer avec Google',
  },
  close: 'Fermer',
} as const;
