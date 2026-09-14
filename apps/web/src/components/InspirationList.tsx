import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { trpc } from '../lib/trpc';

interface InspirationListProps {
  enabled?: boolean;
  emptyAction?: ReactNode;
  className?: string;
}

export function InspirationList({ enabled = true, emptyAction, className = '' }: InspirationListProps) {
  const importsQuery = useQuery({
    ...trpc.inspiration.listMine.queryOptions(),
    enabled,
  });

  if (importsQuery.isLoading) {
    return <p className="p-6 text-center text-sm font-medium text-[#888]">Chargement de tes imports…</p>;
  }

  if (!importsQuery.data || importsQuery.data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-[#ddd] bg-white p-10 text-center shadow-sm">
        <span className="text-4xl">✨</span>
        <p className="text-sm font-semibold text-[#1a1a1a]">Tu n'as pas encore importé d'inspiration.</p>
        {emptyAction}
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {importsQuery.data.map((item) => (
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
            <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-[#555]">{item.description}</p>
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
      ))}
    </div>
  );
}
