# Mirsui Mobile App - Autenticação

## Configuração

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar URL do Backend

Edite o arquivo `services/api.ts` e altere a constante `API_URL` para o endereço do seu backend:

```typescript
const API_URL = 'http://seu-ip:3000'; // Ex: http://192.168.1.100:3000
```

**Importante:** Para testar no dispositivo físico ou emulador, use o IP da sua máquina na rede local. Não use `localhost`.

### 3. Iniciar o Backend

Certifique-se de que o backend está rodando:

```bash
# No diretório raiz do projeto
node backend.ts
```

### 4. Iniciar o App

```bash
npm start
```

Isso abrirá o Expo no modo tunnel, permitindo testar em qualquer dispositivo.

## Funcionalidades Implementadas

✅ **Login** - Autenticação com email e senha  
✅ **Registro** - Criar nova conta com username único  
✅ **Redefinir Senha** - Envio de email para recuperação  
✅ **Home** - Tela simples mostrando "Olá, {username}"  
✅ **Logout** - Sair da conta  
✅ **Persistência** - Sessão mantida após fechar o app  

## Estrutura do Projeto

```
mobile/
├── contexts/
│   └── AuthContext.tsx      # Gerenciamento de autenticação
├── screens/
│   ├── LoginScreen.tsx      # Tela de login
│   ├── RegisterScreen.tsx   # Tela de registro
│   ├── ResetPasswordScreen.tsx # Tela de redefinição de senha
│   └── HomeScreen.tsx       # Tela principal após login
├── services/
│   └── api.ts               # Configuração do axios e chamadas API
├── types/
│   └── navigation.ts        # Tipos do React Navigation
└── App.tsx                  # Configuração de navegação
```

## Testando

1. Abra o app no Expo Go
2. Clique em "Criar conta" para registrar
3. Preencha email, username e senha
4. Após login, você verá a tela "Olá, {username}"
5. Use o botão "Sair" para fazer logout

## Endpoints do Backend Utilizados

- `POST /auth/signup` - Criar conta
- `POST /auth/login` - Fazer login
- `POST /auth/reset-password` - Redefinir senha
- `POST /auth/logout` - Fazer logout

## Troubleshooting

### Erro de conexão com o backend

- Verifique se o backend está rodando
- Confirme que o `API_URL` está correto
- Teste o endpoint no navegador: `http://seu-ip:3000/`

### App não carrega após instalar dependências

Execute:
```bash
npm start --clear
```
