import { QueryClient } from '@tanstack/react-query'

// Cliente único do React Query para todo o app.
//
// staleTime alto = stale-while-revalidate na prática: ao voltar para uma tela
// dentro da janela, o dado em cache aparece NA HORA (sem voltar a 0) e só é
// revalidado em background quando fica "stale". É isso que mata o flicker de
// "0 seguidores → número real" a cada visita.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 min frescos antes de revalidar
      gcTime: 1000 * 60 * 30, // mantém em cache 30 min mesmo sem uso
      retry: 2,
    },
  },
})
