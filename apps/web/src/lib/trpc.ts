import { createTRPCReact } from '@trpc/react-query';
// On importe UNIQUEMENT le type de ton routeur backend.
// TypeScript va le supprimer à la compilation, donc aucun code backend ne fuira dans le navigateur.
import type { AppRouter } from '../../../api/src/trpc/router';

export const trpc = createTRPCReact<AppRouter>();
