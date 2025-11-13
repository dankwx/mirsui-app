# Mirsui Mobile App

Aplicativo mobile da plataforma Mirsui, criado com React Native e Expo.

## 🚀 Como executar

### Pré-requisitos
- Node.js instalado
- Expo Go app no seu celular ([iOS](https://apps.apple.com/app/expo-go/id982107779) | [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))

### Instalação

```bash
cd mobile
npm install
```

### Executar o app

```bash
npm start
```

Isso abrirá o Expo Dev Tools. Você pode:
- Escanear o QR code com o Expo Go (Android) ou a Câmera (iOS)
- Pressionar `a` para abrir no Android Emulator
- Pressionar `i` para abrir no iOS Simulator

## 📱 Recursos Implementados

### Página Inicial (Home)
- ✅ Hero section com título e descrição
- ✅ Navegação com logo e botão de login
- ✅ Cards de propostas de valor
- ✅ Seção de músicas em alta (trending tracks) com placeholders
- ✅ Track em destaque (featured track)
- ✅ Seção "Como funciona" com passos
- ✅ Seção "Sobre" 
- ✅ CTA final para registro

### Adaptações para Mobile
- Design responsivo otimizado para telas mobile
- Scrolling vertical suave
- Cards adaptados para largura de tela mobile
- Espaçamento e tamanhos de fonte ajustados
- Gradientes e efeitos visuais preservados
- Placeholder para imagens (triângulo play)
- Dados estáticos (não requer backend)

## 🎨 Design

O design segue o estilo da versão web com:
- Fundo escuro (#05030f)
- Paleta roxa/fúcsia (primary: #a855f7)
- Bordas sutis e transparências
- Ícones emoji para simplicidade mobile
- Tipografia hierárquica clara

## 📝 Notas

- Todas as imagens usam placeholders (ícone ▶)
- Dados das músicas são estáticos/mock
- Todos os botões e links são TouchableOpacity (não navegam)
- Pronto para integração com backend/navegação posteriormente
