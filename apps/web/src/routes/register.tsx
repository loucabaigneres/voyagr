import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import React, { useState } from 'react';
import { z } from 'zod';
import { authClient } from '../lib/auth-client';

const registerSearchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute('/register')({
  validateSearch: (search) => registerSearchSchema.parse(search),
  component: RegisterPage,
});
  
function RegisterPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    await authClient.signUp.email({
      name,
      email,
      password,
      fetchOptions: {
        onSuccess: () => {
          if (redirect) {
            navigate({ to: redirect });
          } else {
            navigate({ to: '/profile' });
          }
        },
        onError: (ctx) => {
          setError(ctx.error.message);
          setLoading(false);
        },
      },
    });
  };

  return (
    <div className="flex min-h-[calc(100vh-65px)] items-center justify-center px-4 py-8 bg-[#F2EDE8]">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm border border-[#eee]">
        <h1 className="text-2xl font-extrabold text-[#1a1a1a]">Inscription</h1>
        <p className="mt-1 text-sm text-[#888]">Crée un compte pour sauvegarder tes itinéraires.</p>

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs font-semibold text-[#FF4D4D] border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-[#888] mb-1">Nom complet</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-[#ddd] p-3 rounded-xl bg-white focus:border-[#FF4D4D] focus:ring-2 focus:ring-[#FF4D4D]/20 outline-none transition text-[#1a1a1a]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-[#888] mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-[#ddd] p-3 rounded-xl bg-white focus:border-[#FF4D4D] focus:ring-2 focus:ring-[#FF4D4D]/20 outline-none transition text-[#1a1a1a]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-[#888] mb-1">Mot de passe</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-[#ddd] p-3 rounded-xl bg-white focus:border-[#FF4D4D] focus:ring-2 focus:ring-[#FF4D4D]/20 outline-none transition text-[#1a1a1a]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-[#FF4D4D] py-3.5 text-sm font-bold text-white shadow-lg shadow-red-500/25 hover:brightness-105 active:scale-95 disabled:opacity-50 transition cursor-pointer"
          >
            {loading ? 'Création en cours…' : 'Créer mon compte'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-[#888]">
          Déjà un compte ?{' '}
          <Link
            to="/login"
            search={{ redirect }}
            className="font-bold text-[#FF4D4D] hover:underline"
          >
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
