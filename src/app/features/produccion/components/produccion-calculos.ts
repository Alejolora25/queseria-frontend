/** Escalas y redondeo HALF_UP iguales al cálculo esperado del backend. */
export function decimalPositivo(valor: string, decimales: number, enteros: number): bigint | null {
  const limpio = valor.trim().replace(',', '.');
  const patron = new RegExp(`^\\d{1,${enteros}}(?:\\.\\d{1,${decimales}})?$`);
  if (!patron.test(limpio)) return null;
  const [parteEntera, parteDecimal = ''] = limpio.split('.');
  const unidades = BigInt(parteEntera) * 10n ** BigInt(decimales)
    + BigInt(parteDecimal.padEnd(decimales, '0') || '0');
  return unidades > 0n ? unidades : null;
}

export function previsualizarProduccion(
  litrosPorProveedor: readonly string[], rendimientoLPorKg: string,
): { litrosTotales: string; kgEsperados: string } | null {
  if (litrosPorProveedor.length === 0) return null;
  const rendimiento = decimalPositivo(rendimientoLPorKg, 4, 8);
  if (rendimiento === null) return null;
  let litrosEnMili = 0n;
  for (const entrada of litrosPorProveedor) {
    const litros = decimalPositivo(entrada, 3, 12);
    if (litros === null) return null;
    litrosEnMili += litros;
  }
  // (litrosEnMili / 10³) / (rendimiento / 10⁴), expresado a 8 decimales.
  const numerador = litrosEnMili * 1_000_000_000n;
  const kgEnOctavos = (numerador + rendimiento / 2n) / rendimiento;
  return {
    litrosTotales: formatear(litrosEnMili, 3),
    kgEsperados: formatear(kgEnOctavos, 8),
  };
}

function formatear(valor: bigint, escala: number): string {
  const factor = 10n ** BigInt(escala);
  const entero = valor / factor;
  const fraccion = (valor % factor).toString().padStart(escala, '0').replace(/0+$/, '');
  return fraccion ? `${entero},${fraccion}` : String(entero);
}
