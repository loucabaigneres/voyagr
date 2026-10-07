import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { SignInForm } from '@/features/auth/components/SignInForm';
import { AUTH_COPY } from '@/features/auth/constants';

export default function SignInScreen() {
  return (
    <AuthLayout copy={AUTH_COPY.signIn} switchHref="/auth/sign-up">
      <SignInForm />
    </AuthLayout>
  );
}
