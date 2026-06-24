// Extrai o id do Spotify (22 chars) de um track_uri ("spotify:track:ID") ou de
// uma track_url ("https://open.spotify.com/track/ID?..." ou "spotify:track:ID").
// Usado para navegar até a página de track. Retorna null quando não há id
// reconhecível. Aceita tanto a forma com "/" quanto com ":" porque o backend
// às vezes guarda a URI no campo de URL.
export function spotifyTrackId(input: {
  track_uri?: string | null
  track_url?: string | null
}): string | null {
  for (const value of [input.track_uri, input.track_url]) {
    const match = value?.match(/track[:/]([A-Za-z0-9]+)/)
    if (match) return match[1]
  }
  return null
}
