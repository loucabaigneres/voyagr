import { createFileRoute } from '@tanstack/react-router';
import { ImportInspirationForm } from '../components/ImportInspirationForm';

// TEMP: auth check temporarily removed — restore the session guard before ship.
export const Route = createFileRoute('/import')({
  component: function Import() {
    return (
      <div className="min-h-screen bg-[#F2EDE8] px-4 py-8">
        <ImportInspirationForm />
      </div>
    );
  },
});
