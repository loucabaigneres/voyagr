import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router';
import React, { useState } from 'react';
import { AuthShell, GoogleButton } from '../components/AuthShell';
import { authClient, signIn, signUp } from '../lib/auth-client';

export const Route = createFileRoute('/register')({
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession();
    if (session) {
      throw redirect({ to: '/' });
    }
  },
  component: function Register() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });

    const handleSignUp = async (e: React.SyntheticEvent) => {
      e.preventDefault();
      await signUp.email({
        email: formData.email,
        password: formData.password,
        name: formData.name
      });
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
        title="Rejoindre Voyagr"
        subtitle="Crée ton compte pour commencer"
        footer={
          <>
            Déjà un compte ?{' '}
            <Link to="/login" className="font-semibold text-primary hover:text-primary-dark hover:underline">
              Se connecter
            </Link>
          </>
        }
      >
        <form onSubmit={handleSignUp} className="space-y-3">
          <input
            type="text" placeholder="Nom" required autoComplete="name"
            value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
            className="min-h-12 w-full rounded-2xl border border-border bg-white px-4 py-3.5 text-ink placeholder-muted transition outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
          />
          <input
            type="email" placeholder="Email" required autoComplete="email"
            value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
            className="min-h-12 w-full rounded-2xl border border-border bg-white px-4 py-3.5 text-ink placeholder-muted transition outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
          />
          <input
            type="password" placeholder="Mot de passe" required autoComplete="new-password"
            value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })}
            className="min-h-12 w-full rounded-2xl border border-border bg-white px-4 py-3.5 text-ink placeholder-muted transition outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
          />
          <button
            type="submit"
            className="min-h-12 w-full rounded-2xl bg-primary py-3.5 font-semibold text-white shadow-lg shadow-primary/25 transition hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.98]"
          >
            S'inscrire
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
