import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRight, Check, Loader2, Mail, PartyPopper } from 'lucide-react';
import { isValidEmail, submitWaitlist } from '../lib/waitlist';

type Status = 'idle' | 'loading' | 'error';

type WaitlistFormProps = {
  joinedEmail: string | null;
  onJoined: (email: string) => void;
  /** 'dark' tweaks the helper text for use on a dark background (CTA band). */
  tone?: 'light' | 'dark';
};

export function WaitlistForm({ joinedEmail, onJoined, tone = 'light' }: WaitlistFormProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  if (joinedEmail) {
    return (
      <div
        className="mx-auto flex max-w-md items-start gap-3 rounded-2xl border border-accent/20 bg-white/90 p-4 text-left shadow-sm"
        role="status"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
          <PartyPopper className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-bold text-ink">Tu es sur la liste !</p>
          <p className="mt-0.5 text-xs text-muted">
            On prévient <span className="font-semibold text-ink">{joinedEmail}</span> dès que l'app
            mobile sort.
          </p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === 'loading') return;

    if (!isValidEmail(email)) {
      setStatus('error');
      setError('Hmm, cette adresse e-mail ne semble pas valide.');
      return;
    }

    setStatus('loading');
    setError(null);
    try {
      await submitWaitlist(email);
      onJoined(email);
    } catch {
      setStatus('error');
      setError('Oups, un souci est survenu. Réessaie dans un instant.');
    }
  };

  const helperColor = tone === 'dark' ? 'text-white/60' : 'text-muted';

  return (
    <form onSubmit={handleSubmit} noValidate className="mx-auto w-full max-w-md">
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <div className="relative flex-1">
          <Mail
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            aria-label="Adresse e-mail"
            aria-invalid={status === 'error'}
            placeholder="ton@email.com"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (status === 'error') {
                setStatus('idle');
                setError(null);
              }
            }}
            className="h-13 w-full rounded-2xl border border-line bg-white/90 pl-11 pr-4 text-sm font-medium text-ink shadow-sm outline-none transition placeholder:text-muted/70 focus:border-accent focus:ring-4 focus:ring-accent/15"
          />
        </div>
        <button
          type="submit"
          disabled={status === 'loading'}
          className="group inline-flex h-13 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-accent px-6 text-sm font-bold text-white shadow-md shadow-accent/25 transition hover:brightness-105 focus-visible:ring-4 focus-visible:ring-accent/30 focus-visible:outline-none active:scale-95 disabled:cursor-wait disabled:opacity-80"
        >
          {status === 'loading' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Un instant…</span>
            </>
          ) : (
            <>
              <span>Me prévenir</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </div>

      <p className={`mt-2.5 flex items-center gap-1.5 text-xs ${helperColor}`} aria-live="polite">
        {error ? (
          <span className="font-semibold text-accent">{error}</span>
        ) : (
          <>
            <Check className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
            Pas de spam. Juste un e-mail le jour du lancement.
          </>
        )}
      </p>
    </form>
  );
}
