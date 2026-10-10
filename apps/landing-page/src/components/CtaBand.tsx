import { WaitlistForm } from './WaitlistForm';

type CtaBandProps = {
  joinedEmail: string | null;
  onJoined: (email: string) => void;
};

export function CtaBand({ joinedEmail, onJoined }: CtaBandProps) {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16 sm:px-6 lg:py-20">
      <div className="relative overflow-hidden rounded-[2rem] bg-ink px-6 py-12 text-center shadow-xl sm:px-10 sm:py-16">
        {/* glow */}
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent/30 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-accent/15 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative">
          <h2 className="mx-auto max-w-2xl text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
            Le voyage spontané débarque sur mobile.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-white/70">
            Laisse ton e-mail et reçois une notification dès l’ouverture des téléchargements.
          </p>

          <div className="mt-7">
            <WaitlistForm joinedEmail={joinedEmail} onJoined={onJoined} tone="dark" />
          </div>
        </div>
      </div>
    </section>
  );
}
