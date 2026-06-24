# Busca de dados no app — padrão obrigatório

> **Regra geral:** toda leitura de dados de rede no app **deve** passar por
> **React Query (TanStack Query)**. Não use `useState` + `useEffect` + `fetch`
> manual para carregar dados de tela. Sempre que for tecnicamente possível,
> siga este documento.

Este é o padrão que resolve o problema clássico do app nativo: a tela monta,
mostra valores vazios/zerados, e só depois a rede responde. Como não existe SSR
(o "force-dynamic"/render no servidor do site web **não tem equivalente** aqui —
o app sempre busca da API pela rede), a alavanca certa é **cache + prefetch no
cliente**.

---

## Tecnologias

| Tecnologia | Para quê | Por quê |
|---|---|---|
| **@tanstack/react-query** (v5) | Cache, deduplicação, stale-while-revalidate, refetch, estados de loading/erro, atualização otimista | Padrão recomendado pelo Expo para apps com qualquer complexidade de dados. Elimina boilerplate e o flicker de "tela zerada → dado real". |
| **expo/fetch nativo** (`fetch`) | Camada de transporte HTTP (em `src/api/client.ts`) | Recomendação do Expo: evitar axios, usar `fetch`. O React Query só orquestra; quem faz a request é o `client.ts`. |
| **expo-secure-store** | Guardar tokens de sessão | Tokens nunca em AsyncStorage. Já usado em `src/api/session.ts`. |
| **Prefetch via `QueryClient`** | Aquecer o cache antes da navegação | A primeira abertura de uma tela já vem com dado pronto. |

---

## Como o padrão está montado

### 1. `QueryClient` único — `src/api/queryClient.ts`

Configurado uma vez, com `staleTime` alto (5 min). Isso é o que dá o
*stale-while-revalidate*: ao voltar para uma tela dentro da janela, o dado em
cache aparece **na hora**, e só é revalidado em background quando fica "stale".

Montado no topo da árvore em `app/_layout.tsx`, **acima** do `AuthProvider`
(para o auth conseguir disparar prefetch):

```tsx
<QueryClientProvider client={queryClient}>
  <AuthProvider>
    <RootNavigator />
  </AuthProvider>
</QueryClientProvider>
```

### 2. Definições de query centralizadas — `src/api/queries.ts`

Cada query é declarada **uma única vez** com `queryOptions`, e reutilizada pela
tela **e** pelo prefetch. Assim `queryKey` e `queryFn` nunca saem de sincronia.

```ts
export const profileTracksQuery = (profileId: string) =>
  queryOptions({
    queryKey: profileKeys.tracks(profileId),
    queryFn: () => api.getProfileTracks(profileId).then((r) => r.tracks),
  })
```

Chaves são **hierárquicas** (`['profile', id, 'tracks']`) para permitir
invalidação em lote (`['profile', id]` derruba tudo do perfil).

### 3. Consumo na tela — `useQuery`

```tsx
const enabled = !!profileId
const tracksQ = useQuery({ ...profileTracksQuery(profileId ?? ''), enabled })
const tracks = tracksQ.data ?? []

const loading = enabled && tracksQ.isLoading      // só na 1ª carga sem cache
const refreshing = tracksQ.isRefetching           // revalidação em background
```

Note: `isLoading` é `false` quando o dado já está em cache (prefetch), então
**não há spinner** em visitas repetidas.

### 4. Prefetch no boot/login — `AuthContext`

Assim que a sessão é restaurada/criada e já temos o `profileId`, disparamos o
carregamento em background:

```ts
if (profile?.id) prefetchProfile(queryClient, profile.id)
```

Quando o usuário abrir a aba, os dados já estão quentes.

### 5. Escrita / mutação — atualização otimista no cache

Em vez de `setState` local, atualize o **cache** do React Query e guarde um
rollback:

```ts
const key = profileTracksQuery(profileId).queryKey
const prev = queryClient.getQueryData(key)
queryClient.setQueryData(key, (old) => /* novo estado */)
// ...em caso de erro na request:
queryClient.setQueryData(key, prev) // rollback
```

Para sinalizar que dados do servidor mudaram (ex.: seguir alguém muda
contadores), use `invalidateQueries`:

```ts
queryClient.invalidateQueries({ queryKey: profileStatsQuery(profileId).queryKey })
```

---

## Checklist para QUALQUER feature nova que leia dados

1. [ ] Adicionei a função de request em `src/api/client.ts` (usando `fetch`, nunca axios).
2. [ ] Declarei a query em `src/api/queries.ts` com `queryOptions` e `queryKey` hierárquica.
3. [ ] A tela consome com `useQuery` (ou `useInfiniteQuery` para listas paginadas) — **sem** `useEffect` + `fetch`.
4. [ ] Se o dado é previsível antes da navegação, adicionei **prefetch** no ponto natural (login, item de lista, etc.).
5. [ ] Mutações fazem **atualização otimista no cache** + rollback, ou `invalidateQueries`.
6. [ ] Estado inicial **não** mostra valores falsos (ex.: `0`); use o estado de loading ou um skeleton.

---

## O que NÃO fazer

- ❌ `useState([])` + `useEffect(() => { fetch(...).then(setState) }, [])` para dados de tela.
- ❌ Refazer a request do zero a cada vez que a tela monta (era o bug original do perfil: resetava para `0` e rebuscava).
- ❌ Guardar token em AsyncStorage (use `expo-secure-store`).
- ❌ axios (use `fetch`).
- ❌ Duplicar `queryKey`/`queryFn` espalhados pelo código — declare em `queries.ts`.

---

## Casos especiais

### Listas paginadas → `useInfiniteQuery`

Para feeds/listas com "carregar mais", use `infiniteQueryOptions` + `useInfiniteQuery`
(ex.: `feedQuery` em `queries.ts`). O `pageParam` é o offset; `data.pages.flat()`
dá a lista completa; `fetchNextPage()` no `onEndReached`. Atualização otimista
mexe na estrutura `InfiniteData` (mapear `old.pages`).

### Revalidar ao focar a aba

Quando o dado muda com o tempo (ex.: stakes acumulam pontos/dias), revalide no
foco com `useFocusEffect` + `invalidateQueries` (callback estável, dependa só do
`queryClient`). O cache continua aparecendo na hora; a revalidação é background.
Mantenha o spinner do pull-to-refresh em estado **separado** do `isRefetching`
para o refetch de foco não acender o indicador.

## Referência

- Skill oficial do Expo: *native-data-fetching* (TanStack Query é a recomendação).
- Núcleo do padrão: `src/api/queries.ts` (definições) + `src/api/queryClient.ts`
  (client) + prefetch em `AuthContext.tsx`.
- Telas já convertidas (use como referência):
  - **Perfil** (`ProfileScreen.tsx`) — `useQuery` + modal de seguidores/seguindo + prefetch.
  - **Feed** (`FeedScreen.tsx`) — `useInfiniteQuery` paginado + claims.
  - **Stakes** (`StakesScreen.tsx`) — `useQuery` + revalidação no foco.
