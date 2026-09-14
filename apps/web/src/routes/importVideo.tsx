import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { ImportInspirationForm } from '../components/ImportInspirationForm';
import { authClient } from '../lib/auth-client';
import { trpc } from '../lib/trpc';

export const Route = createFileRoute('/importVideo')({
  component: ImportVideoPage,
});

function ImportVideoPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session, isPending: isSessionLoading } = authClient.useSession();

  const importsQuery = useQuery({
    ...trpc.inspiration.listMine.queryOptions(),
    enabled: !!session?.user,
  });

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
      <div className="mt-4 space-y-3">
        {importsQuery.isLoading ? (
          <p className="p-6 text-center text-sm font-medium text-[#888]">Chargement de tes imports…</p>
        ) : importsQuery.data && importsQuery.data.length > 0 ? (
          importsQuery.data.map((item) => (
            <div key={item.id} className="rounded-2xl border border-[#eee] bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <a
                  href={item.originalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate text-sm font-bold text-[#1a1a1a] hover:text-[#FF4D4D]"
                >
                  {item.originalUrl}
                </a>
                <span className="shrink-0 rounded-full bg-[#fee] px-3.5 py-1 text-xs font-bold text-[#FF4D4D] capitalize">
                  {item.platform}
                </span>
              </div>
              {item.description && (
                <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-[#555]">
                  {item.description}
                </p>
              )}
              {item.tags.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-[#F2EDE8] px-3 py-1 text-xs font-semibold text-[#555]"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs font-medium text-[#888]">Aucun hashtag détecté.</p>
              )}
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-[#ddd] bg-white p-10 text-center shadow-sm">
            <span className="text-4xl">✨</span>
            <p className="text-sm font-semibold text-[#1a1a1a]">
              Tu n'as pas encore importé d'inspiration.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
