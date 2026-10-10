import { RouterProvider, createRouter } from '@tanstack/react-router';

// Ce fichier sera généré automatiquement par le plugin Vite au lancement !
import { routeTree } from './routeTree.gen';

// Création de l'instance du routeur
const router = createRouter({ routeTree });

// Injection des types stricts dans le module pour l'autocomplétion
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

function App() {
  return <RouterProvider router={router} />;
}

export default App;
