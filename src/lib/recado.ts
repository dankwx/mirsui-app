/**
 * O que a pessoa escreveu ao salvar.
 *
 * O campo é livre, e tem gente que digita "222" só para passar da caixa. Numa
 * citação destacada — recuo, itálico, barra laranja da camada humana — três
 * caracteres soltos fazem o produto parecer bobo. Com cinco passam os que
 * dizem alguma coisa: "muchooo", "brabo dms".
 *
 * A regra é do site (components/Landing/Cena.tsx), onde vale só para a home.
 * Aqui vale para o feed também: lá a home e o feed são páginas de dono
 * diferente, e aqui a mesma citação com a mesma pinta aparece nas duas telas.
 * Se o site adotar o mesmo corte no feed dele, as duas voltam a bater.
 */
const RECADO_MINIMO = 5

export function recadoValido(bruto: string | null | undefined): string | null {
  const texto = bruto?.trim()
  return texto && texto.length >= RECADO_MINIMO ? texto : null
}
