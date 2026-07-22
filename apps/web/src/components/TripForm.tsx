import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import type { TripFormValues } from '../lib/validations/trip';
import { AVAILABLE_INTERESTS, DIETARY_OPTIONS, MEDICAL_OPTIONS, tripFormSchema } from '../lib/validations/trip';

interface TripFormProps {
  initialDestination?: string;
  onSubmit: (data: TripFormValues) => void;
  isLoading?: boolean;
}

export function TripForm({ initialDestination = "Paris", onSubmit, isLoading = false }: TripFormProps) {
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  const { register, handleSubmit, watch, control, setValue, trigger, formState: { errors } } = useForm<TripFormValues>({
    resolver: zodResolver(tripFormSchema as never),
    defaultValues: {
      destination: initialDestination,
      numberOfPeople: 1,
      ages: [{ value: 25 }],
      durationDays: 7,
      averagePrice: 'mid',
      intensity: 'balanced',
      interests: [],
      dietaryOptions: [],
      dietaryCustom: "",
      medicalOptions: [],
      medicalCustom: "",
    },
  });

  const { fields: ageFields, append, remove } = useFieldArray({
    control,
    name: "ages",
  });

  const numberOfPeople = watch("numberOfPeople");
  const currentInterests = watch("interests");

  useEffect(() => {
    const currentCount = ageFields.length;
    const targetCount = numberOfPeople || 0;

    if (targetCount > currentCount) {
      for (let i = currentCount; i < targetCount; i++) append({ value: 25 });
    } else if (targetCount < currentCount) {
      for (let i = currentCount - 1; i >= targetCount; i--) remove(i);
    }
  }, [numberOfPeople, ageFields.length, append, remove]);

  const toggleInterest = (interestId: string) => {
    if (currentInterests.includes(interestId)) {
      setValue("interests", currentInterests.filter(i => i !== interestId), { shouldValidate: true });
    } else {
      setValue("interests", [...currentInterests, interestId], { shouldValidate: true });
    }
  };

  const currentDietary = watch("dietaryOptions");
  const currentMedical = watch("medicalOptions");

  const toggleArrayItem = (fieldName: "dietaryOptions" | "medicalOptions", itemId: string, currentArray: string[]) => {
    if (currentArray.includes(itemId)) {
      setValue(fieldName, currentArray.filter(i => i !== itemId), { shouldValidate: true });
    } else {
      setValue(fieldName, [...currentArray, itemId], { shouldValidate: true });
    }
  };

  const handleNext = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    type FieldName = keyof TripFormValues;
    let fieldsToValidate: FieldName[] = [];

    if (step === 1) {
      fieldsToValidate = ['destination', 'startDate', 'durationDays', 'numberOfPeople', 'ages'];
    } else if (step === 2) {
      fieldsToValidate = ['intensity', 'averagePrice', 'interests']
    }

    const isStepValid = await trigger(fieldsToValidate);

    if (isStepValid) {
      setStep((prev: number) => prev + 1);
    }
  };

  const handlePrev = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setStep((prev: number) => prev - 1)
  }

  return (
    <div className="mx-auto mt-6 max-w-2xl rounded-3xl bg-white p-6 shadow-sm sm:p-8 desktop:max-w-3xl desktop:p-10">

      {/* --- EN-TÊTE ET BARRE DE PROGRESSION --- */}
      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-extrabold text-ink sm:text-3xl">
            {step === 1 && "Les bases du voyage"}
            {step === 2 && "L'ambiance"}
            {step === 3 && "Les derniers détails"}
          </h1>
          <span className="shrink-0 text-sm font-medium text-muted">Étape {step} sur {totalSteps}</span>
        </div>

        {/* Barre de progression visuelle */}
        <div className="h-2 w-full rounded-full bg-surface">
          <div
            className="h-2 rounded-full bg-primary transition-all duration-300"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          ></div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        
        {/* ================= ÉTAPE 1 : LES BASES ================= */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Destination</label>
                <input {...register("destination")} readOnly className="min-h-12 w-full cursor-not-allowed rounded-xl border border-border bg-surface p-3 font-medium text-ink-soft" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date de départ</label>
                <input type="date" {...register("startDate")} className="min-h-12 w-full rounded-xl border border-border bg-white p-3 text-ink transition outline-none focus:border-primary focus:ring-2 focus:ring-primary/25" />
                {errors.startDate && <span className="text-xs font-medium text-primary-dark">{errors.startDate.message}</span>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Durée (jours)</label>
                <input type="number" {...register("durationDays", { valueAsNumber: true })} className="min-h-12 w-full rounded-xl border border-border bg-white p-3 text-ink transition outline-none focus:border-primary focus:ring-2 focus:ring-primary/25" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nombre de voyageurs</label>
                <input type="number" min="1" {...register("numberOfPeople", { valueAsNumber: true })} className="min-h-12 w-full rounded-xl border border-border bg-white p-3 text-ink transition outline-none focus:border-primary focus:ring-2 focus:ring-primary/25" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-3">Âge des voyageurs</label>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                {ageFields.map((field, index) => (
                  <div key={field.id} className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">#{index + 1}</span>
                    <input
                      type="number"
                      aria-label={`Âge du voyageur ${index + 1}`}
                      {...register(`ages.${index}.value`, { valueAsNumber: true })}
                      className="min-h-12 w-full rounded-xl border border-border bg-white p-3 pl-8 text-ink transition outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= ÉTAPE 2 : L'AMBIANCE ================= */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-2">Rythme souhaité</label>
                <select {...register("intensity")} className="min-h-12 w-full rounded-xl border border-border bg-white p-3 text-ink transition outline-none focus:border-primary focus:ring-2 focus:ring-primary/25">
                  <option value="chill">Relax (Prendre son temps)</option>
                  <option value="balanced">Équilibré (Un peu de tout)</option>
                  <option value="intense">Intense (Explorer un max)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Budget moyen / personne</label>
                <select {...register("averagePrice")} className="min-h-12 w-full rounded-xl border border-border bg-white p-3 text-ink transition outline-none focus:border-primary focus:ring-2 focus:ring-primary/25">
                  <option value="budget">Petit budget</option>
                  <option value="mid">Moyen</option>
                  <option value="premium">Premium</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-3">Qu'est-ce qui vous fait vibrer ?</label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_INTERESTS.map(interest => {
                  const isSelected = currentInterests.includes(interest.id);
                  return (
                    <button
                      key={interest.id}
                      type="button"
                      onClick={() => toggleInterest(interest.id)}
                      aria-pressed={isSelected}
                      className={`min-h-11 rounded-full border px-5 py-2.5 text-sm font-medium transition-all ${
                        isSelected ? 'border-primary bg-primary text-white shadow-sm' : 'border-border bg-white text-ink-soft hover:border-primary/40 hover:bg-surface'
                      }`}
                    >
                      {interest.label}
                    </button>
                  );
                })}
              </div>
              {errors.interests && <span className="mt-2 block text-xs font-medium text-primary-dark">{errors.interests.message}</span>}
            </div>
          </div>
        )}

        {/* ================= ÉTAPE 3 : SANTÉ ================= */}
        {step === 3 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            
            {/* Section Alimentation */}
            <div className="space-y-4">
              <label className="block text-sm font-medium">Restrictions alimentaires</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {DIETARY_OPTIONS.map(option => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => toggleArrayItem("dietaryOptions", option.id, currentDietary)}
                    className={`min-h-11 rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                      currentDietary.includes(option.id) ? 'border-primary bg-primary text-white' : 'border-border bg-white text-ink-soft hover:border-primary/40 hover:bg-surface'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <input 
                type="text"
                {...register("dietaryCustom")} 
                placeholder="Autre chose à préciser ? (Ex: Allergie aux arachides)" 
                className="min-h-12 w-full rounded-xl border border-border bg-white p-3 text-ink transition outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
              />
            </div>

            {/* Section Médical */}
            <div className="space-y-4 border-t border-border pt-4">
              <label className="block text-sm font-medium">Conditions médicales</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {MEDICAL_OPTIONS.map(option => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => toggleArrayItem("medicalOptions", option.id, currentMedical)}
                    className={`min-h-11 rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                      currentMedical.includes(option.id) ? 'border-primary bg-primary text-white' : 'border-border bg-white text-ink-soft hover:border-primary/40 hover:bg-surface'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <input 
                type="text"
                {...register("medicalCustom")} 
                placeholder="Un besoin spécifique ? (Ex: Problèmes de dos)" 
                className="min-h-12 w-full rounded-xl border border-border bg-white p-3 text-ink transition outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
              />
            </div>

          </div>
        )}

        {/* --- BOUTONS DE NAVIGATION --- */}
        <div className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-8">
          <button
            type="button"
            onClick={handlePrev}
            disabled={step === 1}
            className={`min-h-12 rounded-lg px-6 py-3 font-medium transition-colors ${step === 1 ? 'invisible' : 'text-ink-soft hover:bg-surface'}`}
          >
            Retour
          </button>

          {step < totalSteps ? (
            <button
              type="button"
              onClick={handleNext}
              className="min-h-12 rounded-xl bg-primary px-8 py-3 font-semibold text-white shadow-lg shadow-primary/25 transition hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.98]"
            >
              Suivant
            </button>
          ) : (
            <button
              type="submit"
              disabled={isLoading}
              className="min-h-12 rounded-xl bg-primary px-8 py-3 font-semibold text-white shadow-lg shadow-primary/25 transition hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.98] disabled:opacity-50"
            >
              {isLoading ? "Génération..." : "Terminer ✨"}
            </button>
          )}
        </div>

      </form>
    </div>
  );
}
