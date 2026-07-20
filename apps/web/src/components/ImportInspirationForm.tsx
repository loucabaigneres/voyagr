import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import type { ImportInspirationValues } from '../lib/validations/inspiration';
import { importInspirationSchema } from '../lib/validations/inspiration';
import { trpc } from '../lib/trpc';

export function ImportInspirationForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ImportInspirationValues>({
    resolver: zodResolver(importInspirationSchema),
    defaultValues: { url: '' },
  });

  const importMutation = useMutation(trpc.inspiration.import.mutationOptions());

  const onSubmit = (data: ImportInspirationValues) => {
    importMutation.mutate(
      { url: data.url },
      {
        onSuccess: () => reset(),
      },
    );
  };

  const result = importMutation.data;

  return (
    <div className="max-w-lg mx-auto p-6 sm:p-8 bg-white rounded-3xl shadow-sm">
      <h1 className="text-2xl font-extrabold text-[#1a1a1a] mb-1">Importer une inspiration</h1>
      <p className="text-sm text-[#888] mb-6">
        Colle le lien d'une vidéo TikTok ou Instagram pour l'ajouter à tes inspirations de voyage.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Lien de la vidéo</label>
          <input
            type="text"
            placeholder="https://www.tiktok.com/@voyageur/video/..."
            {...register('url')}
            className="w-full border border-[#ddd] p-3 rounded-xl bg-white focus:border-[#FF4D4D] focus:ring-2 focus:ring-[#FF4D4D]/20 outline-none transition"
          />
          {errors.url && <span className="text-red-500 text-xs">{errors.url.message}</span>}
        </div>

        <button
          type="submit"
          disabled={importMutation.isPending}
          className="w-full bg-[#FF4D4D] text-white font-semibold py-3 rounded-xl hover:bg-[#e64444] transition disabled:opacity-50"
        >
          {importMutation.isPending ? 'Import en cours…' : 'Importer'}
        </button>
      </form>

      {importMutation.isError && (
        <p className="mt-4 text-sm text-red-500">{importMutation.error.message}</p>
      )}

      {result && (
        <div className="mt-4 p-4 rounded-xl bg-[#F2EDE8]">
          {result.status === 'analyzed' ? (
            <p className="text-sm text-[#1a1a1a]">
              ✅ Inspiration importée et analysée
              {result.extracted_location ? ` — lieu détecté : ${result.extracted_location}` : ''}
              {Array.isArray(result.extracted_tags) && result.extracted_tags.length > 0
                ? ` — tags : ${(result.extracted_tags as string[]).join(', ')}`
                : ''}
            </p>
          ) : (
            <p className="text-sm text-[#888]">
              ⚠️ Le lien a bien été enregistré, mais son contenu n'a pas pu être analysé
              automatiquement.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
