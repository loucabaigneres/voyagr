import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { TripForm } from '../../components/TripForm';
import type { TripFormValues } from '../../lib/validations/trip';
// import { trpc } from '@/lib/trpc';

export const Route = createFileRoute('/trip/configure')({
  component: TripConfigurePage,
});

function TripConfigurePage() {
  const navigate = useNavigate();
  // const submitTripMutation = trpc.submitTripConfiguration.useMutation();

  const handleFormSubmit = async (data: TripFormValues) => {
    try {
      const finalDietary = [...data.dietaryOptions, data.dietaryCustom].filter(Boolean).join(', ');
      const finalMedical = [...data.medicalOptions, data.medicalCustom].filter(Boolean).join(', ');

      const payload = {
        ...data,
        ages: data.ages.map(a => a.value),
        dietaryRestrictions: finalDietary,
        medicalConditions: finalMedical,
      };

      console.log("Envoi des données à l'API :", payload);

      const response = await fetch('http://localhost:3000/trpc/submitTripConfiguration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.result?.data?.success) {
        const tripId = result.result.data.tripId;
        console.log("✅ SUCCÈS ! ID :", tripId);
        navigate({ 
          to: '/trip/test-recap', 
          search: { tripId: tripId } 
        });
      } else {
        console.error("❌ L'API a refusé :", result);
        alert("Erreur côté API, regarde la console.");
      }

    } catch (error) {
      console.error("❌ Impossible de joindre l'API :", error);
      alert("Le serveur API n'est pas lancé ou injoignable.");
    }

    /*
    submitTripMutation.mutate(payload, {
      onSuccess: (response) => {
        console.log("✅ SUCCÈS ! ID du voyage :", response.tripId);
        alert(`Voyage bien enregistré ! ID : ${response.tripId}`);
        // navigate({ 
        //   to: '/discovery', 
        //   search: { tripId: response.tripId } 
        // });
      },
      onError: (error) => {
        console.error("❌ Erreur API :", error.message);
        alert("Erreur lors de l'enregistrement ! Regarde la console.");
      }
    });
    */
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <TripForm 
        initialDestination="Paris" 
        onSubmit={handleFormSubmit} 
        // isLoading={submitTripMutation.isPending} 
      />
    </div>
  );
}