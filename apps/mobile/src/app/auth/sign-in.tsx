import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { SignInForm } from '@/features/auth/components/SignInForm';

export default function SignInScreen() {
  return (
    <AuthLayout
      overline="Content de te revoir"
      title="Reprends ton voyage"
      subtitle="Connecte-toi pour retrouver et enregistrer tes itinéraires."
      switchPrompt="Pas encore de compte ?"
      switchCta="Créer un compte"
      switchHref="/auth/sign-up"
    >
      <SignInForm />
    </AuthLayout>
  );
}
