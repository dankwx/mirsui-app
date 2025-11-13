# Mirsui Mobile

App React Native para a rede social Mirsui.

## 🚀 Como executar

### Pré-requisitos

- Node.js instalado
- npm ou yarn
- Expo Go no seu celular (disponível na Play Store/App Store)

### Instalação

1. Entre na pasta mobile:
```bash
cd mobile
```

2. Instale as dependências:
```bash
npm install
```

### Executar o app

Para iniciar o servidor de desenvolvimento:
```bash
npm start
```

Ou use os comandos específicos para cada plataforma:
- **Android**: `npm run android`
- **iOS**: `npm run ios`
- **Web**: `npm run web`

### Usando o Expo Go

1. Execute `npm start`
2. Escaneie o QR code com o Expo Go (Android) ou com a câmera (iOS)
3. O app será carregado no seu dispositivo

## 📱 Estrutura do Projeto

```
mobile/
├── App.tsx           # Componente principal
├── app.json          # Configurações do Expo
├── package.json      # Dependências
├── tsconfig.json     # Configurações TypeScript
└── babel.config.js   # Configurações Babel
```

## 🔗 Backend

O backend está rodando em `http://localhost:3000` (veja `backend.ts` na raiz do projeto).

## 📝 Próximos Passos

- [ ] Implementar telas de autenticação (Login/Signup)
- [ ] Conectar com o backend
- [ ] Implementar navegação entre telas
- [ ] Criar feed de posts
- [ ] Adicionar perfil de usuário
- [ ] Implementar funcionalidades sociais (likes, comentários, etc)
