# Mirsui — App (Expo / React Native)

Versão mobile do [Mirsui](../Mirsui). Esta primeira versão cobre:

- **Tela inicial deslogada** (landing) com hero, "subindo na cena" (claims recentes), manifesto e CTAs.
- **Autenticação** (login e cadastro) via backend Fastify (`../mirsui-backend`).
- **Feed logado** com ticker ao vivo, "drop de hoje", reivindicações recentes, lista de despachos, like/salvar (otimista), pull-to-refresh e paginação infinita.

A sessão (tokens do Supabase) é guardada com `expo-secure-store` e renovada automaticamente quando expira.

## Pré-requisitos

1. **Backend rodando.** Na pasta `../mirsui-backend`:
   ```bash
   npm install
   npm run dev      # sobe em http://0.0.0.0:3000
   ```
2. **Celular e PC na mesma rede Wi-Fi** (para Expo Go em aparelho físico), ou um emulador Android/iOS.

## Como rodar

```bash
npm install
npx expo start
```

Abra no **Expo Go** (Android/iOS) lendo o QR code, ou pressione `a` (emulador Android) / `i` (simulador iOS).

## Conexão com o backend

O app descobre o IP da sua máquina automaticamente a partir do servidor do Metro
e aponta para a porta `3000` do backend — veja `src/config.ts`. Não precisa
configurar nada em rede local.

Se precisar apontar para outro endereço (backend em produção ou em outra
máquina), edite `PRODUCTION_API_URL` em `src/config.ts`:

```ts
const PRODUCTION_API_URL = 'https://api.mirsui.com'
```

> Observação: o CORS do backend é irrelevante para apps nativos (CORS é
> validado pelo navegador). Em produção, garanta apenas que o backend está
> acessível pela URL configurada.

## Navegação (expo-router)

A navegação é por arquivos (`app/`). As guardas de rota (`Stack.Protected`)
em `app/_layout.tsx` decidem quais telas existem conforme o login — ao entrar
ou sair, o expo-router redireciona sozinho.

```
app/
├── _layout.tsx        # Providers + splash + guardas de auth
├── index.tsx          # "/"        → landing (deslogado)
├── login.tsx          # "/login"   → login
├── signup.tsx         # "/signup"  → cadastro
└── (tabs)/            # área logada (protegida) com tab bar
    ├── _layout.tsx    # Tabs: Feed · Stakes · Perfil
    ├── feed.tsx       # "/feed"     → feed
    ├── stakes.tsx     # "/stakes"   → stakes (dar/recolher stake em faixas)
    └── profile.tsx    # "/profile"  → perfil + sair
```

Para adicionar telas novas (faixa, artista), basta criar o arquivo em `app/`
— ex.: `app/track/[id].tsx`, `app/user/[username].tsx`. Telas que devem
aparecer no tab bar vão em `app/(tabs)/`; telas de detalhe (abertas por cima)
ficam fora do grupo.

## Estrutura (lógica)

```
src/
├── config.ts                # Resolve a URL do backend (auto em dev)
├── theme.ts                 # Cores e tokens visuais (espelham o front)
├── api/
│   ├── client.ts            # Cliente HTTP do backend (auth + feed + likes)
│   ├── session.ts           # Persistência segura da sessão (SecureStore)
│   └── types.ts             # Tipos das respostas do backend
├── auth/
│   └── AuthContext.tsx      # Estado de auth, restore no boot, refresh de token
├── components/              # Logo, Cover, FeedItem, primitivos de UI
├── lib/time.ts              # Formatação de "há X tempo" (pt-BR)
├── lib/stake.ts             # Helpers de apresentação dos Stakes (multiplicador, selo)
└── screens/
    ├── LandingScreen.tsx    # Inicial deslogada
    ├── AuthScreen.tsx       # Login / cadastro
    ├── FeedScreen.tsx       # Feed logado
    ├── StakesScreen.tsx     # Stakes (dar/recolher stake em faixas)
    └── ProfileScreen.tsx    # Perfil + sair
```

## Endpoints usados (backend)

| Ação | Rota |
|---|---|
| Login | `POST /auth/login` |
| Cadastro | `POST /auth/signup` |
| Logout | `POST /auth/logout` |
| Renovar sessão | `POST /auth/refresh` |
| Dados do usuário | `GET /auth/me` |
| Feed | `GET /feed?limit&offset` |
| Reivindicações recentes | `GET /feed/recent-claims` |
| Likes do usuário | `POST /feed/user-likes` |
| Salvar / remover | `POST` / `DELETE /tracks/:id/like` |
| Buscar faixa (Spotify) | `GET /tracks/search?q&limit` |
| Listar stakes | `GET /stakes` |
| Prévia do multiplicador | `GET /stakes/preview?isrc&artist&title` |
| Dar stake | `POST /stakes` |
| Recolher stake | `POST /stakes/:id/recolher` |
| Total de pontos | `GET /stakes/points` |

## Próximos passos sugeridos

- Telas de faixa, perfil e reivindicar (claim).
- Confirmação de email no fluxo de cadastro (o backend pode exigir).
- Push notifications e deep links.
