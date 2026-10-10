import { Heart, MapPin, Star, X } from 'lucide-react';

export function PhoneMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[290px] select-none">
      {/* Soft glow behind the device */}
      <div
        className="absolute -inset-8 -z-10 rounded-full bg-accent/15 blur-3xl"
        aria-hidden="true"
      />

      {/* Floating chip — top left */}
      <div className="absolute -left-4 top-24 z-20 animate-float rounded-2xl border border-line bg-white/90 px-3 py-2 shadow-lg shadow-black/5 backdrop-blur-sm sm:-left-10">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Heart className="h-3.5 w-3.5 fill-current" />
          </span>
          <div className="leading-tight">
            <p className="text-[0.7rem] font-bold text-ink">Ajouté au voyage</p>
            <p className="text-[0.6rem] text-muted">Alfama · Lisbonne</p>
          </div>
        </div>
      </div>

      {/* Floating chip — bottom right */}
      <div className="absolute -right-3 bottom-28 z-20 animate-float-slow rounded-2xl border border-line bg-white/90 px-3 py-2 shadow-lg shadow-black/5 backdrop-blur-sm sm:-right-8">
        <p className="text-[0.6rem] font-semibold uppercase tracking-wide text-muted">Itinéraire</p>
        <p className="text-[0.8rem] font-extrabold text-ink">Jour 2 · 4 étapes</p>
      </div>

      {/* Device */}
      <div className="relative rotate-2 rounded-[3rem] border border-black/10 bg-ink p-3 shadow-2xl shadow-black/20">
        <div className="relative flex aspect-[9/19.5] flex-col overflow-hidden rounded-[2.4rem] bg-sand">
          {/* Dynamic Island */}
          <div className="absolute left-1/2 top-3 z-20 h-6 w-24 -translate-x-1/2 rounded-full bg-ink" />

          {/* Mini app header */}
          <div className="flex items-center justify-between px-5 pb-2 pt-7">
            <div className="flex items-center gap-1">
              <span className="text-sm font-extrabold tracking-tight text-ink">Seego</span>
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            </div>
            <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[0.6rem] font-bold text-accent">
              Découverte
            </span>
          </div>

          {/* Swipe deck — fills the tall screen */}
          <div className="relative mx-3 flex-1">
            {/* Peeking card behind */}
            <div className="absolute inset-x-2 top-2 bottom-0 -rotate-3 rounded-3xl bg-gradient-to-br from-[#bcd3c9] to-[#8fae9f] opacity-60" />

            {/* Front card */}
            <div className="absolute inset-0 overflow-hidden rounded-3xl bg-gradient-to-br from-[#ffb36b] via-[#ff7a59] to-[#ff4d6d] shadow-xl">
              {/* Scenery silhouette */}
              <svg
                className="absolute bottom-0 left-0 w-full text-black/15"
                viewBox="0 0 320 120"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M0 120V70l24-10 20 14 26-26 22 18 24-30 26 26 22-16 28 20 26-24 24 18 26-12v44z"
                  fill="currentColor"
                />
              </svg>
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10" />

              {/* Rating chip */}
              <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-black/35 px-2.5 py-1 backdrop-blur-sm">
                <Star className="h-3 w-3 fill-amber-300 text-amber-300" />
                <span className="text-[0.65rem] font-bold text-white">4.9</span>
              </div>

              {/* Like stamp */}
              <div className="absolute right-3 top-3 -rotate-12 rounded-lg border-2 border-white/90 px-2 py-0.5">
                <span className="text-xs font-black uppercase tracking-wider text-white">
                  J'adore
                </span>
              </div>

              {/* Caption */}
              <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                <div className="flex items-center gap-1 text-[0.65rem] font-semibold uppercase tracking-wide text-white/80">
                  <MapPin className="h-3 w-3" />
                  Portugal
                </div>
                <h3 className="mt-0.5 text-2xl font-extrabold leading-none">Lisbonne</h3>
                <p className="mt-1 text-[0.7rem] text-white/85">
                  Tramway 28, miradouros et pastéis de nata.
                </p>
              </div>
            </div>
          </div>

          {/* Swipe actions */}
          <div className="flex items-center justify-center gap-5 py-5">
            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-line bg-white text-muted shadow-sm">
              <X className="h-5 w-5" />
            </span>
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-accent/30">
              <Heart className="h-6 w-6 fill-current" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
