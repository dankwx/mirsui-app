import Constants from 'expo-constants'

// Porta em que o backend Fastify (mirsui-backend) escuta.
const BACKEND_PORT = 3000

// Em produção, troque por sua URL pública (ex.: https://api.mirsui.com).
// Deixe vazio para usar a derivação automática do IP da máquina de dev.
const PRODUCTION_API_URL = ''

/**
 * Em desenvolvimento, o celular/emulador não enxerga "localhost" — isso aponta
 * para o próprio aparelho. Então pegamos o IP da máquina que está rodando o
 * Metro/Expo (o mesmo host do dev server) e apontamos para a porta do backend.
 *
 * Isso funciona para Expo Go em celular físico na mesma rede e para emuladores.
 * Se o backend estiver em outra máquina, defina API_URL manualmente abaixo.
 */
function resolveDevApiUrl(): string {
  // hostUri tem a forma "192.168.0.10:8081" (Expo SDK novo) ou via debuggerHost.
  const c = Constants as any
  const hostUri: string | undefined =
    c.expoConfig?.hostUri ||
    c.manifest?.debuggerHost ||
    c.manifest2?.extra?.expoGo?.debuggerHost

  if (hostUri) {
    const host = hostUri.split(':')[0]
    return `http://${host}:${BACKEND_PORT}`
  }

  // Fallback para emulador Android (10.0.2.2 = localhost do host).
  return `http://10.0.2.2:${BACKEND_PORT}`
}

export const API_URL = PRODUCTION_API_URL || resolveDevApiUrl()
