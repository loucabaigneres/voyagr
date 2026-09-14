import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link2, Loader2, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { trpc, type RouterOutputs } from '../lib/trpc';
import type { ImportInspirationValues } from '../lib/validations/inspiration';
import { CAPTION_UNAVAILABLE, importInspirationSchema } from '../lib/validations/inspiration';

type ImportResult = RouterOutputs['inspiration']['importFromUrl'];

interface ImportInspirationFormProps {
  /** Appelé après un import réussi. La navigation éventuelle est à la charge du parent. */
  onSuccess?: (result: ImportResult) => void;
  /** Affiche un bouton « Annuler » — utile quand le formulaire est monté dans une popup. */
  onCancel?: () => void;
  /** Densité réduite, pour une modale. */
  compact?: boolean;
  className?: string;
}

/**
 * Formulaire d'import d'une inspiration (reel / vidéo / post) TikTok ou Instagram.
 *
 * Autonome et sans dépendance au routeur : il peut être monté tel quel dans une page,
 * une modale ou une popup. Le parent est responsable de l'accès (utilisateur connecté)
 * et de ce qui se passe après l'import via `onSuccess`.
 */
export function ImportInspirationForm({
  onSuccess,
  onCancel,
  compact = false,
  className = '',
}: ImportInspirationFormProps) {
  const [showCaptionField, setShowCaptionField] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ImportInspirationValues>({
    resolver: zodResolver(importInspirationSchema as never),
    defaultValues: { url: '', caption: '' },
  });

  const importMutation = useMutation(
    trpc.inspiration.importFromUrl.mutationOptions({
      onSuccess: (data) => {
        setResult(data);
        setErrorMessage(null);
        setShowCaptionField(false);
        reset({ url: '', caption: '' });
        onSuccess?.(data);
      },
      onError: (error) => {
        setResult(null);

        if (error.message === CAPTION_UNAVAILABLE) {
          // La récupération automatique a échoué : on déplie la saisie manuelle.
          setShowCaptionField(true);
          setErrorMessage(
            "Impossible de récupérer la description automatiquement. Colle-la ci-dessous pour continuer.",
          );
          return;
        }

        setErrorMessage(error.message);
      },
    }),
  );

  const onSubmit = (values: ImportInspirationValues) => {
    const caption = values.caption?.trim();
    importMutation.mutate({ url: values.url, caption: caption || undefined });
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={`rounded-3xl border border-[#eee] bg-white shadow-sm ${compact ? 'p-5' : 'p-6 sm:p-8'} ${className}`}
    >
      <div>
        <label htmlFor="inspirationUrl" className="mb-2 block text-sm font-medium text-[#1a1a1a]">
          Lien TikTok ou Instagram
        </label>
        <div className="relative">
          <Link2 className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#bbb]" />
          <input
            id="inspirationUrl"
            type="url"
            inputMode="url"
            autoComplete="off"
            placeholder="https://www.tiktok.com/@compte/video/..."
            className="w-full rounded-xl border border-[#ddd] bg-white p-3 pl-9 text-[#1a1a1a] outline-none transition focus:border-[#FF4D4D] focus:ring-2 focus:ring-[#FF4D4D]/20"
            {...register('url')}
          />
        </div>
        {errors.url && <p className="mt-2 text-xs font-medium text-[#FF4D4D]">{errors.url.message}</p>}
      </div>

      {!showCaptionField && (
        <button
          type="button"
          onClick={() => setShowCaptionField(true)}
          className="mt-2 cursor-pointer text-xs font-semibold text-[#888] underline underline-offset-2 transition hover:text-[#FF4D4D]"
        >
          Un problème ?
        </button>
      )}

      {showCaptionField && (
        <div className="mt-4">
          <label htmlFor="inspirationCaption" className="mb-2 block text-sm font-medium text-[#1a1a1a]">
            Colle la description du post
          </label>
          <textarea
            id="inspirationCaption"
            rows={compact ? 3 : 4}
            placeholder="Colle ici la légende de la publication, avec ses #hashtags…"
            className="w-full resize-y rounded-xl border border-[#ddd] bg-white p-3 text-[#1a1a1a] outline-none transition focus:border-[#FF4D4D] focus:ring-2 focus:ring-[#FF4D4D]/20"
            {...register('caption')}
          />
          <p className="mt-2 text-xs text-[#888]">
            Certaines publications (surtout sur Instagram) ne peuvent pas être lues automatiquement.
          </p>
          {errors.caption && (
            <p className="mt-2 text-xs font-medium text-[#FF4D4D]">{errors.caption.message}</p>
          )}
        </div>
      )}

      {errorMessage && (
        <div className="mt-4 rounded-xl bg-[#fee] p-3 text-xs font-semibold text-[#FF4D4D]">
          {errorMessage}
        </div>
      )}

      {result && (
        <div className="mt-4 rounded-xl bg-[#e8f8f0] p-4">
          <p className="text-xs font-semibold text-[#2ecc71]">
            ✓ Inspiration importée depuis {result.inspiration.platform === 'tiktok' ? 'TikTok' : 'Instagram'}
          </p>
          {result.inspiration.tags.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {result.inspiration.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#1a1a1a] shadow-sm"
                >
                  #{tag}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs font-medium text-[#888]">
              Aucun hashtag trouvé dans cette publication.
            </p>
          )}
        </div>
      )}

      <div className="mt-6 flex gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer rounded-2xl border border-[#ddd] bg-white px-5 py-3.5 text-sm font-semibold text-[#888] transition hover:border-[#FF4D4D]/30 hover:text-[#FF4D4D] active:scale-95"
          >
            Annuler
          </button>
        )}
        <button
          type="submit"
          disabled={importMutation.isPending}
          className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#FF4D4D] py-3.5 text-sm font-bold text-white shadow-lg shadow-red-500/25 transition hover:brightness-105 active:scale-95 disabled:opacity-50"
        >
          {importMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyse en cours…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Importer l'inspiration
            </>
          )}
        </button>
      </div>
    </form>
  );
}
