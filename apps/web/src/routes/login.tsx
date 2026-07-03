import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router';
import React, { useState } from 'react';
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

    return (
      <div className="min-h-screen flex flex-col justify-center px-6 py-12 bg-gray-50">
        <div className="w-full max-w-sm mx-auto space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Bon retour</h1>
            <p className="mt-2 text-sm text-gray-600">Connectez-vous à votre compte</p>
          </div>

          <form onSubmit={handleSignIn} className="space-y-4">
            <input 
              type="email" placeholder="Email" required
              value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gray-900 outline-none transition" 
            />
            <input 
              type="password" placeholder="Mot de passe" required
              value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gray-900 outline-none transition" 
            />
            <button type="submit" className="w-full py-3 bg-gray-900 hover:bg-black text-white font-semibold rounded-xl transition">
              Se connecter
            </button>
          </form>

          <p className="text-center text-sm text-gray-600">
            Pas encore de compte ? <Link to="/register" className="font-medium text-gray-900 hover:underline">S'inscrire</Link>
          </p>
        </div>
      </div>
    );
  }
});
