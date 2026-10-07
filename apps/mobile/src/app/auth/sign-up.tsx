import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { SignUpForm } from '@/features/auth/components/SignUpForm';
import { AUTH_COPY } from '@/features/auth/constants';

export default function SignUpScreen() {
  return (
    <AuthLayout copy={AUTH_COPY.signUp} switchHref="/auth/sign-in">
      <SignUpForm />
    </AuthLayout>
  );
}
