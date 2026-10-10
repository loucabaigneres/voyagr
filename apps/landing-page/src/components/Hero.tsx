import { Apple, Smartphone, Sparkles } from 'lucide-react';
import { PhoneMockup } from './PhoneMockup';
import { SocialProof } from './SocialProof';
import { WaitlistForm } from './WaitlistForm';

type HeroProps = {
  joinedEmail: string | null;
  onJoined: (email: string) => void;
};

export function Hero({ joinedEmail, onJoined }: HeroProps) {
  return (
    <section id="top" className="relative overflow-hidden">
      {/* Decorative background blobs */}
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-accent/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -left-32 top-40 h-80 w-80 rounded-full bg-[#9fc3b2]/20 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:pb-28 lg:pt-20">
        {/* Copy */}
        <div className="animate-rise text-center lg:text-left">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/15 bg-accent-soft px-3.5 py-1.5 text-xs font-bold text-accent">
            <Sparkles className="h-3.5 w-3.5" />
            L'application mobile arrive bientôt
          </span>

          <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-6xl">
            Ton prochain voyage,
            <br />
            trouvé en un <span className="text-accent">swipe</span>.
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted lg:mx-0 lg:text-lg">
            Seego transforme la recherche de voyage en jeu. Swipe les lieux qui te font vibrer, et
            on assemble ton itinéraire sur mesure. Sois le premier prévenu du lancement.
          </p>

          <div className="mt-8 lg:mx-0">
            <WaitlistForm joinedEmail={joinedEmail} onJoined={onJoined} />
          </div>

          <SocialProof className="mt-6 lg:justify-start" align="center" />

          {/* Platform hint */}
          <div className="mt-5 flex items-center justify-center gap-5 text-xs font-semibold text-muted lg:justify-start">
            <span className="flex items-center gap-1.5">
              <Apple className="h-4 w-4" />
              iOS
            </span>
            <span className="h-3 w-px bg-line" />
            <span className="flex items-center gap-1.5">
              <Smartphone className="h-4 w-4" />
              Android
            </span>
          </div>
        </div>

        {/* Visual */}
        <div className="animate-rise [animation-delay:120ms]">
          <PhoneMockup />
        </div>
      </div>
    </section>
  );
}
