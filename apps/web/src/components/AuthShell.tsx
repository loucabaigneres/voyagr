import type { ReactNode } from 'react';

interface AuthShellProps {
  title: string;
  subtitle: string;
  /** Form + social buttons. */
  children: ReactNode;
  /** Bottom switch link (login <-> register). */
  footer: ReactNode;
}

/**
 * Responsive auth layout.
 * - mobile (375) / tablet (768): single centered column, brand logo on top.
 * - desktop (>=1024): two-column split — branded hero on the left, form on the right.
 *   The split kicks in at lg so real laptops get a composed layout, not just 1440.
 */
export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[1.1fr_1fr] desktop:grid-cols-2">
      {/* ── Hero (desktop only) ── */}
      <aside className="relative hidden overflow-hidden bg-primary lg:flex lg:flex-col lg:justify-between lg:p-12 desktop:p-16">
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            background:
              'radial-gradient(120% 120% at 15% 10%, #ff7b28 0%, #ff4e4a 42%, #a2101b 100%)',
          }}
        />
        {/* Decorative rings */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border border-white/15" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full border border-white/10" />

        <div className="relative flex items-center gap-2 text-white">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 text-xl backdrop-blur-sm">
            ✈️
          </span>
          <span className="text-lg font-extrabold tracking-tight">Voyagr</span>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-4xl font-black leading-[1.1] tracking-tight text-white desktop:text-5xl">
            Trouve ta prochaine destination en un swipe.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-white/80">
            Balaie des lieux, like ce qui te fait vibrer, et laisse Voyagr composer
            l'itinéraire parfait.
          </p>
        </div>

        <div className="relative flex items-center gap-3 text-sm text-white/70">
          <div className="flex -space-x-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-xs backdrop-blur-sm">🗺️</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-xs backdrop-blur-sm">🏨</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-xs backdrop-blur-sm">🍽️</span>
          </div>
          <span>Itinéraires personnalisés, jour par jour.</span>
        </div>
      </aside>

      {/* ── Form panel ── */}
      <main className="flex min-h-screen flex-col justify-center bg-surface px-6 py-12 sm:px-10 lg:min-h-screen">
        <div className="mx-auto w-full max-w-sm space-y-8 sm:max-w-md">
          <header className="text-center lg:text-left">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-2xl shadow-lg shadow-primary/25 lg:mx-0 lg:hidden">
              ✈️
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
              {title}
            </h1>
            <p className="mt-2 text-sm text-muted sm:text-base">{subtitle}</p>
          </header>

          {children}

          <p className="text-center text-sm text-ink-soft lg:text-left">{footer}</p>
        </div>
      </main>
    </div>
  );
}

/** Shared Google button used by both auth screens. */
export function GoogleButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-12 w-full items-center justify-center gap-3 rounded-2xl border border-border bg-white py-3.5 font-semibold text-ink shadow-sm transition hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.98]"
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
      </svg>
      Continuer avec Google
    </button>
  );
}
