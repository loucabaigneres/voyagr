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
    resolver: zodResolver(tripFormSchema) as any,
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
    <div className="max-w-2xl mx-auto p-8 bg-white rounded-2xl shadow-sm mt-10">
      
      {/* --- EN-TÊTE ET BARRE DE PROGRESSION --- */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">
            {step === 1 && "Les bases du voyage"}
            {step === 2 && "L'ambiance"}
            {step === 3 && "Les derniers détails"}
          </h1>
          <span className="text-sm font-medium text-gray-400">Étape {step} sur {totalSteps}</span>
        </div>
        
        {/* Barre de progression visuelle */}
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div 
            className="bg-black h-2 rounded-full transition-all duration-300" 
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
                <input {...register("destination")} readOnly className="w-full border p-3 rounded-lg bg-gray-50 text-gray-500" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date de départ</label>
                <input type="date" {...register("startDate")} className="w-full border p-3 rounded-lg" />
                {errors.startDate && <span className="text-red-500 text-xs">{errors.startDate.message}</span>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Durée (jours)</label>
                <input type="number" {...register("durationDays", { valueAsNumber: true })} className="w-full border p-3 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nombre de voyageurs</label>
                <input type="number" min="1" {...register("numberOfPeople", { valueAsNumber: true })} className="w-full border p-3 rounded-lg" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-3">Âge des voyageurs</label>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                {ageFields.map((field, index) => (
                  <div key={field.id} className="relative">
                    <span className="absolute left-3 top-3 text-sm text-gray-400">#{index + 1}</span>
                    <input 
                      type="number" 
                      {...register(`ages.${index}.value`, { valueAsNumber: true })} 
                      className="w-full border p-3 pl-8 rounded-lg" 
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
                <select {...register("intensity")} className="w-full border p-3 rounded-lg bg-white">
                  <option value="chill">Relax (Prendre son temps)</option>
                  <option value="balanced">Équilibré (Un peu de tout)</option>
                  <option value="intense">Intense (Explorer un max)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Budget moyen / personne</label>
                <select {...register("averagePrice")} className="w-full border p-3 rounded-lg bg-white">
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
                      className={`px-5 py-2.5 rounded-full border text-sm transition-all ${
                        isSelected ? 'bg-black text-white border-black scale-105 shadow-sm' : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {interest.label}
                    </button>
                  );
                })}
              </div>
              {errors.interests && <span className="text-red-500 text-xs block mt-2">{errors.interests.message}</span>}
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
                    className={`px-4 py-2 rounded-full border text-sm transition-all ${
                      currentDietary.includes(option.id) ? 'bg-black text-white border-black' : 'bg-white text-gray-700 hover:bg-gray-50'
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
                className="w-full border p-3 rounded-lg"
              />
            </div>

            {/* Section Médical */}
            <div className="space-y-4 pt-4 border-t">
              <label className="block text-sm font-medium">Conditions médicales</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {MEDICAL_OPTIONS.map(option => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => toggleArrayItem("medicalOptions", option.id, currentMedical)}
                    className={`px-4 py-2 rounded-full border text-sm transition-all ${
                      currentMedical.includes(option.id) ? 'bg-black text-white border-black' : 'bg-white text-gray-700 hover:bg-gray-50'
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
                className="w-full border p-3 rounded-lg"
              />
            </div>

          </div>
        )}

        {/* --- BOUTONS DE NAVIGATION --- */}
        <div className="pt-8 mt-8 border-t flex justify-between items-center">
          <button 
            type="button" 
            onClick={handlePrev}
            disabled={step === 1}
            className={`px-6 py-3 font-medium rounded-lg transition-colors ${step === 1 ? 'invisible' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            Retour
          </button>

          {step < totalSteps ? (
            <button 
              type="button" 
              onClick={handleNext}
              className="px-8 py-3 bg-black text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
            >
              Suivant
            </button>
          ) : (
            <button 
              type="submit" 
              disabled={isLoading}
              className="px-8 py-3 bg-black text-white font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {isLoading ? "Génération..." : "Terminer ✨"}
            </button>
          )}
        </div>

      </form>
    </div>
  );
}
