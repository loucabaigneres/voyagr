import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { ImportInspirationForm } from '../components/ImportInspirationForm';
import { InspirationList } from '../components/InspirationList';
import { authClient } from '../lib/auth-client';
import { trpc } from '../lib/trpc';

export const Route = createFileRoute('/importVideo')({
  component: ImportVideoPage,
});

function ImportVideoPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session, isPending: isSessionLoading } = authClient.useSession();

  useEffect(() => {
    if (!isSessionLoading && !session?.user) {
      navigate({ to: '/login' });
    }
  }, [session, isSessionLoading, navigate]);

  if (isSessionLoading || !session?.user) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#FF4D4D] border-t-transparent" />
        <p className="text-sm font-medium text-[#888]">Chargement…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-extrabold text-[#1a1a1a]">Importer une inspiration</h1>
      <p className="mt-1 text-sm font-medium text-[#888]">
        Colle le lien d'un reel, d'une vidéo ou d'un post : on en extrait les hashtags pour nourrir tes
        futurs voyages.
      </p>

      <div className="mt-6">
        <ImportInspirationForm
          onSuccess={() => queryClient.invalidateQueries(trpc.inspiration.listMine.queryFilter())}
        />
      </div>

      <h2 className="mt-10 text-lg font-extrabold text-[#1a1a1a]">Mes imports récents</h2>
      <div className="mt-4">
        <InspirationList />
      </div>
    </div>
  );
}
