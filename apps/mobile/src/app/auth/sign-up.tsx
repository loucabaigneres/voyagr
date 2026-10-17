import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { SignUpForm } from '@/features/auth/components/SignUpForm';

export default function SignUpScreen() {
  return (
    <AuthLayout
      overline="Bienvenue"
      title="Garde tes escapades sous la main"
      subtitle="Un compte pour retrouver tes voyages sur tous tes appareils."
      switchPrompt="Déjà un compte ?"
      switchCta="Se connecter"
      switchHref="/auth/sign-in"
    >
      <SignUpForm />
    </AuthLayout>
  );
}
