import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router';
import React, { useState } from 'react';
import { authClient, signUp } from '../lib/auth-client';

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

    return (
      <div className="min-h-screen flex flex-col justify-center px-6 py-12 bg-gray-50">
        <div className="w-full max-w-sm mx-auto space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Rejoindre Voyagr</h1>
            <p className="mt-2 text-sm text-gray-600">Créez votre compte pour commencer</p>
          </div>

          <form onSubmit={handleSignUp} className="space-y-4">
            <input 
              type="text" placeholder="Nom" required
              value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-600 outline-none transition" 
            />
            <input 
              type="email" placeholder="Email" required
              value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-600 outline-none transition" 
            />
            <input 
              type="password" placeholder="Mot de passe" required
              value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-600 outline-none transition" 
            />
            <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition">
              S'inscrire
            </button>
          </form>

          <p className="text-center text-sm text-gray-600">
            Déjà un compte ? <Link to="/login" className="font-medium text-blue-600 hover:underline">Se connecter</Link>
          </p>
        </div>
      </div>
    );
  }
});
