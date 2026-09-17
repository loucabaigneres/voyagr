import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMutation } from '@tanstack/react-query';
import { trpc } from '../lib/trpc';
import { useGuestId } from '../hooks/useGuestId';

export const Route = createFileRoute('/')({
  component: IndexPage,
});

function IndexPage() {
  const navigate = useNavigate();
  const guestId = useGuestId();

  const directTripMutation = useMutation(
    trpc.onboarding.startDirectTrip.mutationOptions({
      onSuccess: (data) => {
        navigate({
          to: '/discovery',
          search: { tripId: data.tripId },
        });
      },
    }),
  );

  const handleSurpriseMe = () => {
    directTripMutation.mutate({ guestId });
  };

  return (
    <div className="flex min-h-[calc(100vh-65px)] flex-col items-center justify-center bg-[#F2EDE8] px-4 py-12">
      <div className="w-full max-w-2xl text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 border border-red-100 px-3.5 py-1.5 text-xs font-bold text-[#FF4D4D]">
          ✨ Ton voyage commence ici
        </span>
        <h1 className="mt-4 text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-[#1a1a1a]">
          Comment veux-tu trouver <br className="hidden sm:inline" />
          ta prochaine escapade ?
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm sm:text-base text-[#888]">
          Trouve ton prochain séjour sur mesure en quelques swipes ou laisse l'inspiration faire le reste.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 text-left">
          {/* Option 1 : Guide-moi */}
          <div
            onClick={() => navigate({ to: '/onboarding' })}
            className="group relative flex flex-col justify-between rounded-3xl bg-white p-6 sm:p-7 shadow-sm border border-[#eee] hover:border-[#FF4D4D] hover:shadow-md transition cursor-pointer"
          >
            <div className="absolute right-5 top-5 rounded-full bg-red-50 px-2.5 py-1 text-[0.65rem] font-bold text-[#FF4D4D]">
              Recommandé
            </div>

            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#faf8f6] text-2xl group-hover:scale-110 transition-transform">
                🎯
              </div>
              <h2 className="mt-5 text-xl font-bold text-[#1a1a1a]">Guide-moi</h2>
              <p className="mt-1.5 text-xs leading-relaxed text-[#888]">
                4 questions express (ambiance, météo, compagnie) pour cibler nos meilleures propositions.
              </p>
            </div>

            <div className="mt-6 flex items-center gap-2 text-xs font-bold text-[#FF4D4D]">
              <span>Lancer le quiz</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </div>

          {/* Option 2 : Surprends-moi */}
          <div
            onClick={!directTripMutation.isPending ? handleSurpriseMe : undefined}
            className={`group flex flex-col justify-between rounded-3xl bg-white p-6 sm:p-7 shadow-sm border border-[#eee] transition ${
              directTripMutation.isPending
                ? 'opacity-60 cursor-wait'
                : 'hover:border-[#ddd] hover:shadow-md cursor-pointer'
            }`}
          >
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#faf8f6] text-2xl group-hover:scale-110 transition-transform">
                🎲
              </div>
              <h2 className="mt-5 text-xl font-bold text-[#1a1a1a]">Surprends-moi</h2>
              <p className="mt-1.5 text-xs leading-relaxed text-[#888]">
                Envie d'explorer sans filtre ? Swipe directement sur les lieux de nos destinations phares.
              </p>
            </div>

            <div className="mt-6 flex items-center gap-2 text-xs font-bold text-[#1a1a1a]">
              {directTripMutation.isPending ? (
                <div className="flex items-center gap-2 text-[#888]">
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-[#FF4D4D]/20 border-t-[#FF4D4D]" />
                  <span>Préparation du deck…</span>
                </div>
              ) : (
                <>
                  <span>Swiper directement</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
