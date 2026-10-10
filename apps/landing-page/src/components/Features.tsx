import type { LucideIcon } from 'lucide-react';
import { Layers, Map, Smartphone } from 'lucide-react';

type Feature = {
  icon: LucideIcon;
  title: string;
  description: string;
};

const FEATURES: Feature[] = [
  {
    icon: Layers,
    title: 'Swipe & découvre',
    description:
      'Oublie les 30 onglets ouverts. Swipe à droite les destinations et activités qui te font envie, à gauche le reste.',
  },
  {
    icon: Map,
    title: 'Itinéraire auto-magique',
    description:
      'À partir de tes coups de cœur, Seego assemble un itinéraire jour par jour, optimisé et prêt à partir.',
  },
  {
    icon: Smartphone,
    title: 'Dans ta poche',
    description:
      'Carte, planning et inspirations hors-ligne. Tout ton voyage t’accompagne, où que tu sois.',
  },
];

export function Features() {
  return (
    <section className="relative border-t border-line/60">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            Voyager, version ludique.
          </h2>
          <p className="mt-3 text-base text-muted">
            Trois gestes, et ton séjour prend forme. Voilà ce qui t’attend sur l’app.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <article
              key={title}
              className="group rounded-3xl border border-line bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-accent/40 hover:shadow-md sm:p-7"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent transition-transform group-hover:scale-110">
                <Icon className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-ink">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
