import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { authClient } from '../lib/auth-client';
import { trpc } from '../lib/trpc';

export const Route = createFileRoute('/profile')({
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session, isPending: isSessionLoading } = authClient.useSession();

  const [activeTab, setActiveTab] = useState<'trips' | 'settings'>('trips');
  const [nameInput, setNameInput] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  const profileQuery = useQuery({
    ...trpc.user.getProfile.queryOptions(),
    enabled: !!session?.user,
  });

  const tripsQuery = useQuery({
    ...trpc.user.getTrips.queryOptions(),
    enabled: !!session?.user,
  });

  const updateProfileMutation = useMutation(
    trpc.user.updateProfile.mutationOptions({
      onSuccess: () => {
        setUpdateSuccess(true);
        queryClient.invalidateQueries(trpc.user.getProfile.queryFilter());
        setTimeout(() => setUpdateSuccess(false), 3000);
      },
    }),
  );

  useEffect(() => {
    if (!isSessionLoading && !session?.user) {
      navigate({ to: '/login' });
    }
  }, [session, isSessionLoading, navigate]);

  const handleLogout = async () => {
    await authClient.signOut();
    navigate({ to: '/discovery' });
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = (nameInput ?? profileQuery.data?.user?.name ?? '').trim();
    if (!finalName) return;
    updateProfileMutation.mutate({ name: finalName });
  };

  if (isSessionLoading || profileQuery.isLoading) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#FF4D4D] border-t-transparent" />
        <p className="text-sm font-medium text-[#888]">Chargement de votre profil…</p>
      </div>
    );
  }

  const profile = profileQuery.data;
  const currentName = nameInput ?? profile?.user?.name ?? '';

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      {/* En-tête Carte Profil */}
      <div className="flex flex-col gap-6 rounded-3xl bg-white p-6 sm:p-8 shadow-sm border border-[#eee] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FF4D4D] text-2xl font-black text-white uppercase shadow-lg shadow-red-500/20">
            {profile?.user?.name?.charAt(0) || profile?.user?.email?.charAt(0) || 'U'}
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-[#1a1a1a]">
              {profile?.user?.name || 'Explorateur'}
            </h1>
            <p className="text-sm font-medium text-[#888]">{profile?.user?.email}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="rounded-2xl border border-[#ddd] bg-white px-5 py-2.5 text-sm font-semibold text-[#888] hover:text-[#FF4D4D] hover:border-[#FF4D4D]/30 transition active:scale-95 cursor-pointer"
        >
          Déconnexion
        </button>
      </div>

      {/* Statistiques */}
      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-3xl bg-white p-6 shadow-sm border border-[#eee]">
          <div className="text-3xl font-extrabold text-[#1a1a1a]">{profile?.stats?.tripsCount ?? 0}</div>
          <div className="mt-0.5 text-xs font-semibold text-[#888]">Voyages créés</div>
        </div>
        <div className="rounded-3xl bg-white p-6 shadow-sm border border-[#eee]">
          <div className="text-3xl font-extrabold text-[#FF4D4D]">{profile?.stats?.likedPlacesCount ?? 0}</div>
          <div className="mt-0.5 text-xs font-semibold text-[#888]">Lieux likés</div>
        </div>
      </div>

      {/* Navigation par Onglets */}
      <div className="mt-8 flex gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('trips')}
          className={`rounded-full px-5 py-2.5 text-sm font-semibold transition active:scale-95 cursor-pointer ${
            activeTab === 'trips'
              ? 'bg-[#FF4D4D] text-white shadow-lg shadow-red-500/20'
              : 'bg-white text-[#555] border border-[#ddd] hover:bg-[#faf8f6]'
          }`}
        >
          Mes voyages
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`rounded-full px-5 py-2.5 text-sm font-semibold transition active:scale-95 cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-[#FF4D4D] text-white shadow-lg shadow-red-500/20'
              : 'bg-white text-[#555] border border-[#ddd] hover:bg-[#faf8f6]'
          }`}
        >
          Paramètres
        </button>
      </div>

      {/* Contenu de l'onglet */}
      <div className="mt-6">
        {activeTab === 'trips' ? (
          <div className="space-y-3">
            {tripsQuery.isLoading ? (
              <p className="p-6 text-center text-sm font-medium text-[#888]">Chargement de vos voyages…</p>
            ) : tripsQuery.data && tripsQuery.data.length > 0 ? (
              tripsQuery.data.map((item) => (
                <Link
                  key={item.id}
                  to="/trip/$tripId"
                  params={{ tripId: item.id }}
                  className="flex items-center justify-between rounded-2xl bg-white p-5 border border-[#eee] shadow-sm hover:border-[#FF4D4D]/50 transition active:scale-[0.99]"
                >
                  <div>
                    <h3 className="font-bold text-[#1a1a1a]">
                      {item.title || `Voyage à ${item.destination}`}
                    </h3>
                    <p className="mt-0.5 text-xs text-[#888]">Destination : {item.destination}</p>
                  </div>
                  <span className="rounded-full bg-[#fee] px-3.5 py-1 text-xs font-bold text-[#FF4D4D] capitalize">
                    {item.status}
                  </span>
                </Link>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 rounded-3xl bg-white p-10 border border-dashed border-[#ddd] text-center shadow-sm">
                <span className="text-4xl">🗺️</span>
                <p className="text-sm font-semibold text-[#1a1a1a]">Tu n'as pas encore d'itinéraire enregistré.</p>
                <Link
                  to="/discovery"
                  className="mt-2 rounded-full bg-[#FF4D4D] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-red-500/25 transition active:scale-95"
                >
                  Découvrir des destinations
                </Link>
              </div>
            )}
          </div>
        ) : (
          <form
            onSubmit={handleSaveProfile}
            className="space-y-6 rounded-3xl bg-white p-6 sm:p-8 shadow-sm border border-[#eee]"
          >
            <div>
              <label htmlFor="profileName" className="block text-sm font-medium text-[#1a1a1a] mb-2">
                Nom d'affichage
              </label>
              <input
                id="profileName"
                type="text"
                value={currentName}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Votre nom"
                className="w-full border border-[#ddd] p-3 rounded-xl bg-white focus:border-[#FF4D4D] focus:ring-2 focus:ring-[#FF4D4D]/20 outline-none transition text-[#1a1a1a]"
              />
            </div>

            {updateSuccess && (
              <div className="rounded-xl bg-[#e8f8f0] p-3 text-center text-xs font-semibold text-[#2ecc71]">
                ✓ Profil mis à jour avec succès !
              </div>
            )}

            <button
              type="submit"
              disabled={updateProfileMutation.isPending}
              className="w-full rounded-2xl bg-[#FF4D4D] py-3.5 text-sm font-bold text-white shadow-lg shadow-red-500/25 hover:brightness-105 active:scale-95 disabled:opacity-50 transition cursor-pointer"
            >
              {updateProfileMutation.isPending ? 'Enregistrement…' : 'Enregistrer les modifications'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
