import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router';
import React, { useState } from 'react';
import { AuthShell, GoogleButton } from '../components/AuthShell';
import { authClient, signIn } from '../lib/auth-client';

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession();
    if (session) {
      throw redirect({ to: '/' });
    }
  },
  component: function Login() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ email: '', password: '' });

    const handleSignIn = async (e: React.SyntheticEvent) => {
      e.preventDefault();
      await signIn.email({ email: formData.email, password: formData.password });
      navigate({ to: '/' });
    };

    const handleGoogleSignIn = async () => {
      await signIn.social({
        provider: 'google',
        callbackURL: window.location.origin,
      })
    }

    return (
      <AuthShell
        title="Bon retour"
        subtitle="Connecte-toi à ton compte Voyagr"
        footer={
          <>
            Pas encore de compte ?{' '}
            <Link to="/register" className="font-semibold text-primary hover:text-primary-dark hover:underline">
              S'inscrire
            </Link>
          </>
        }
      >
        <form onSubmit={handleSignIn} className="space-y-3">
          <input
            type="email" placeholder="Email" required autoComplete="email"
            value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
            className="min-h-12 w-full rounded-2xl border border-border bg-white px-4 py-3.5 text-ink placeholder-muted transition outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
          />
          <input
            type="password" placeholder="Mot de passe" required autoComplete="current-password"
            value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })}
            className="min-h-12 w-full rounded-2xl border border-border bg-white px-4 py-3.5 text-ink placeholder-muted transition outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
          />
          <button
            type="submit"
            className="min-h-12 w-full rounded-2xl bg-primary py-3.5 font-semibold text-white shadow-lg shadow-primary/25 transition hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.98]"
          >
            Se connecter
          </button>
        </form>

        <div className="relative flex items-center py-1">
          <div className="grow border-t border-border"></div>
          <span className="mx-4 shrink-0 text-sm text-muted">Ou</span>
          <div className="grow border-t border-border"></div>
        </div>

        <GoogleButton onClick={handleGoogleSignIn} />
      </AuthShell>
    );
  }
});
