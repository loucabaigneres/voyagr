import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMutation } from '@tanstack/react-query';
import { trpc } from '../lib/trpc';
import { useGuestId } from '../hooks/useGuestId';
import type { SubmitOnboardingInput } from '../../../api/src/trpc/schemas/onboarding';

export const Route = createFileRoute('/onboarding')({
  component: OnboardingPage,
});

const LANDSCAPES = [
  { id: 'city', title: 'Cité vibrante & Histoire', desc: 'Architecture, ruelles vivantes, musées et effervescence urbaine' },
  { id: 'coast', title: 'Littoral & Grand large', desc: 'Plages, côtes sauvages, brise marine et couchers de soleil' },
  { id: 'nature', title: 'Montagne & Grands espaces', desc: 'Sentiers d’altitude, air pur, forêts et panoramas ouverts' },
  { id: 'countryside', title: 'Terroir & Campagne', desc: 'Villages préservés, vignobles et quiétude' },
] as const;

const VIBES = [
  { id: 'culture', title: 'Culture & Patrimoine', desc: 'Monuments historiques, expositions et immersion locale' },
  { id: 'food', title: 'Gastronomie & Terroir', desc: 'Marchés typiques, spécialités régionales et tables gourmandes' },
  { id: 'outdoor', title: 'Outdoor & Aventure', desc: 'Randonnées actives, activités de plein air et sensations' },
  { id: 'relax', title: 'Farniente & Déconnexion', desc: 'Rythme lent, terrasses paisibles et détente au calme' },
  { id: 'nightlife', title: 'Vie nocturne & Sorties', desc: 'Bars animés, concerts et ambiance festive le soir' },
] as const;

const TRAVEL_WITH = [
  { id: 'solo', title: 'En solo', desc: 'Liberté complète et découvertes à ton propre rythme' },
  { id: 'couple', title: 'En couple', desc: 'Escapade intime et moments privilégiés à deux' },
  { id: 'friends', title: 'Entre potes', desc: 'Sorties festives, rires et road trip partagé' },
  { id: 'family', title: 'En famille', desc: 'Activités adaptées pour petits et grands' },
] as const;

const CLIMATES = [
  { id: 'warm', title: 'Grand soleil & Chaleur', desc: 'Chaleur estivale, idéal pour vivre dehors' },
  { id: 'mild', title: 'Douceur tempérée', desc: 'Températures agréables parfaites pour explorer à pied' },
  { id: 'cold', title: 'Fraîcheur & Hivernal', desc: 'Air vif, plaids ou paysages de neige' },
] as const;

function OnboardingPage() {
  const navigate = useNavigate();
  const guestId = useGuestId();
  const [step, setStep] = useState<number>(1);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState<Omit<SubmitOnboardingInput, 'guestId'>>({
    landscapes: [],
    vibes: [],
    travelWith: [],
    climates: [],
  });

  const submitMutation = useMutation(
    trpc.onboarding.submit.mutationOptions({
      onSuccess: (data) => {
        setTimeout(() => {
          navigate({
            to: '/discovery',
            search: { tripId: data.tripId },
          });
        }, 1800);
      },
      onError: (err) => {
        setIsAnalyzing(false);
        setErrorMessage(err.message || 'Une erreur est survenue lors du calcul.');
      },
    }),
  );

  const toggleSelection = <K extends keyof Omit<SubmitOnboardingInput, 'guestId'>>(
    field: K,
    value: SubmitOnboardingInput[K][number],
  ) => {
    setFormData((prev) => {
      const currentList = prev[field] as string[];
      const exists = currentList.includes(value);
      const updated = exists
        ? currentList.filter((item) => item !== value)
        : [...currentList, value];

      return { ...prev, [field]: updated };
    });
  };

  const handleFinalSubmit = () => {
    setErrorMessage(null);
    setIsAnalyzing(true);
    submitMutation.mutate({
      ...formData,
      guestId,
    });
  };

  if (isAnalyzing) {
    return (
      <div className="flex min-h-[calc(100vh-65px)] items-center justify-center bg-[#F2EDE8] px-4 py-8">
        <div className="w-full max-w-md rounded-3xl bg-white p-10 text-center shadow-sm border border-[#eee]">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#FF4D4D]/20 border-t-[#FF4D4D]" />
          </div>
          <h2 className="text-xl font-bold text-[#1a1a1a]">Analyse de tes envies…</h2>
          <p className="mt-2 text-xs leading-relaxed text-[#888]">
            Nous sélectionnons les meilleures destinations et activités selon tes critères.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-65px)] bg-[#F2EDE8] px-4 py-8 flex flex-col items-center justify-center">
      <div className="w-full max-w-xl rounded-3xl bg-white p-6 sm:p-8 shadow-sm border border-[#eee]">
        {/* Progression */}
        <div className="mb-6">
          <div className="flex justify-between items-center text-xs font-semibold text-[#888] uppercase tracking-wider mb-2">
            <span>Étape {step} sur 4</span>
            <span>{step * 25} %</span>
          </div>
          <div className="h-1.5 w-full bg-[#eee] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#FF4D4D] transition-all duration-300 rounded-full"
              style={{ width: `${step * 25}%` }}
            />
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-xl bg-red-50 p-3 text-xs font-semibold text-[#FF4D4D] border border-red-100">
            {errorMessage}
          </div>
        )}

        {/* Étape 1 : Décors */}
        {step === 1 && (
          <div>
            <h1 className="text-2xl font-bold text-[#1a1a1a]">Quels décors t'inspirent ?</h1>
            <p className="mt-1 text-sm text-[#888] mb-5">Choisis un ou plusieurs environnements pour ton séjour.</p>
            <div className="space-y-3">
              {LANDSCAPES.map((item) => {
                const isSelected = formData.landscapes.includes(item.id);
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => toggleSelection('landscapes', item.id)}
                    className={`w-full p-4 rounded-2xl border text-left transition cursor-pointer ${
                      isSelected
                        ? 'bg-red-50/50 border-[#FF4D4D] ring-1 ring-[#FF4D4D]'
                        : 'bg-[#faf8f6] border-[#eee] hover:border-[#ddd]'
                    }`}
                  >
                    <div className="text-sm font-bold text-[#1a1a1a]">{item.title}</div>
                    <div className="mt-0.5 text-xs text-[#888]">{item.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Étape 2 : Ambiances */}
        {step === 2 && (
          <div>
            <h1 className="text-2xl font-bold text-[#1a1a1a]">Quelles atmosphères recherches-tu ?</h1>
            <p className="mt-1 text-sm text-[#888] mb-5">Sélectionne les types d'expériences souhaitées.</p>
            <div className="space-y-3">
              {VIBES.map((item) => {
                const isSelected = formData.vibes.includes(item.id);
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => toggleSelection('vibes', item.id)}
                    className={`w-full p-4 rounded-2xl border text-left transition cursor-pointer ${
                      isSelected
                        ? 'bg-red-50/50 border-[#FF4D4D] ring-1 ring-[#FF4D4D]'
                        : 'bg-[#faf8f6] border-[#eee] hover:border-[#ddd]'
                    }`}
                  >
                    <div className="text-sm font-bold text-[#1a1a1a]">{item.title}</div>
                    <div className="mt-0.5 text-xs text-[#888]">{item.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Étape 3 : Compagnie */}
        {step === 3 && (
          <div>
            <h1 className="text-2xl font-bold text-[#1a1a1a]">Avec qui voyages-tu ?</h1>
            <p className="mt-1 text-sm text-[#888] mb-5">Précise la dynamique de ton groupe.</p>
            <div className="space-y-3">
              {TRAVEL_WITH.map((item) => {
                const isSelected = formData.travelWith.includes(item.id);
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => toggleSelection('travelWith', item.id)}
                    className={`w-full p-4 rounded-2xl border text-left transition cursor-pointer ${
                      isSelected
                        ? 'bg-red-50/50 border-[#FF4D4D] ring-1 ring-[#FF4D4D]'
                        : 'bg-[#faf8f6] border-[#eee] hover:border-[#ddd]'
                    }`}
                  >
                    <div className="text-sm font-bold text-[#1a1a1a]">{item.title}</div>
                    <div className="mt-0.5 text-xs text-[#888]">{item.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Étape 4 : Climat */}
        {step === 4 && (
          <div>
            <h1 className="text-2xl font-bold text-[#1a1a1a]">Quel climat préfères-tu ?</h1>
            <p className="mt-1 text-sm text-[#888] mb-5">Dernière étape pour orienter la géographie du voyage.</p>
            <div className="space-y-3">
              {CLIMATES.map((item) => {
                const isSelected = formData.climates.includes(item.id);
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => toggleSelection('climates', item.id)}
                    className={`w-full p-4 rounded-2xl border text-left transition cursor-pointer ${
                      isSelected
                        ? 'bg-red-50/50 border-[#FF4D4D] ring-1 ring-[#FF4D4D]'
                        : 'bg-[#faf8f6] border-[#eee] hover:border-[#ddd]'
                    }`}
                  >
                    <div className="text-sm font-bold text-[#1a1a1a]">{item.title}</div>
                    <div className="mt-0.5 text-xs text-[#888]">{item.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between border-t border-[#eee] pt-4">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="text-xs font-bold text-[#888] hover:text-[#1a1a1a] transition px-3 py-2 cursor-pointer"
            >
              Retour
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              disabled={
                (step === 1 && formData.landscapes.length === 0) ||
                (step === 2 && formData.vibes.length === 0) ||
                (step === 3 && formData.travelWith.length === 0)
              }
              onClick={() => setStep((s) => s + 1)}
              className="rounded-2xl bg-[#FF4D4D] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-red-500/25 hover:brightness-105 active:scale-95 disabled:opacity-40 transition cursor-pointer"
            >
              Continuer
            </button>
          ) : (
            <button
              type="button"
              disabled={formData.climates.length === 0}
              onClick={handleFinalSubmit}
              className="rounded-2xl bg-[#FF4D4D] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-red-500/25 hover:brightness-105 active:scale-95 disabled:opacity-40 transition cursor-pointer"
            >
              Découvrir mes destinations
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
