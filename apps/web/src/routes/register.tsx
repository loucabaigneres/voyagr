import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router';
import React, { useState } from 'react';
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
      <div className="min-h-screen flex flex-col justify-center px-6 py-12 bg-[#F2EDE8]">
        <div className="w-full max-w-sm mx-auto space-y-7">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FF4D4D] text-2xl shadow-lg shadow-red-500/25">✈️</div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#1a1a1a]">Rejoindre Voyagr</h1>
            <p className="mt-2 text-sm text-[#888]">Crée ton compte pour commencer</p>
          </div>

          <form onSubmit={handleSignUp} className="space-y-3">
            <input
              type="text" placeholder="Nom" required
              value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3.5 rounded-2xl border border-[#ddd] bg-white text-[#1a1a1a] placeholder-[#aaa] focus:border-[#FF4D4D] focus:ring-2 focus:ring-[#FF4D4D]/20 outline-none transition"
            />
            <input
              type="email" placeholder="Email" required
              value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3.5 rounded-2xl border border-[#ddd] bg-white text-[#1a1a1a] placeholder-[#aaa] focus:border-[#FF4D4D] focus:ring-2 focus:ring-[#FF4D4D]/20 outline-none transition"
            />
            <input
              type="password" placeholder="Mot de passe" required
              value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-3.5 rounded-2xl border border-[#ddd] bg-white text-[#1a1a1a] placeholder-[#aaa] focus:border-[#FF4D4D] focus:ring-2 focus:ring-[#FF4D4D]/20 outline-none transition"
            />
            <button type="submit" className="w-full py-3.5 bg-[#FF4D4D] text-white font-semibold rounded-2xl shadow-lg shadow-red-500/25 transition active:scale-95 hover:brightness-105">
              S'inscrire
            </button>
          </form>

          <div className="relative flex items-center py-1">
            <div className="grow border-t border-[#ddd]"></div>
            <span className="shrink-0 mx-4 text-[#aaa] text-sm">Ou</span>
            <div className="grow border-t border-[#ddd]"></div>
          </div>

          {/* Google Button */}
          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 py-3.5 border border-[#ddd] bg-white text-[#1a1a1a] font-semibold rounded-2xl transition active:scale-95 hover:bg-[#faf8f6] shadow-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continuer avec Google
          </button>

          <p className="text-center text-sm text-[#888]">
            Déjà un compte ? <Link to="/login" className="font-semibold text-[#FF4D4D] hover:underline">Se connecter</Link>
          </p>
        </div>
      </div>
    );
  }
});
