/**
 * Encargo para pedir la corrección a una IA gratuita FUERA de la app (Claude, ChatGPT, Gemini…). La app no corrige con IA: prepara el
 * texto para que la corrección sea breve, puntual y en tu nivel (la fuente del cuaderno «When Less is More» muestra que la reescritura
 * completa perjudica y la corrección por fragmento ayuda), y luego te enseña qué cambió.
 */
export const LEVELS = ["A1", "A2", "B1", "B2"] as const;
export type Level = (typeof LEVELS)[number];
export const CORRECTED_MARK = "TEXTO CORREGIDO:";

const SCOPE: Record<Level, string> = {
  A1: "presente, passato prossimo básico, artículos, preposiciones simples y vocabulario muy frecuente",
  A2: "pasado (passato prossimo e imperfetto), futuro simple, pronombres átonos, reflexivos y comparativos",
  B1: "congiuntivo básico, condicional, pronombres combinados, ci y ne",
  B2: "congiuntivo en todos sus usos, período hipotético, pasiva y concesivas",
};

export function buildCorrectionPrompt(opts: { level: Level; text: string; task?: string }): string {
  const task = opts.task?.trim();
  return [
    `Eres un corrector de italiano para una persona hispanohablante (de Chile) que estudia nivel ${opts.level}. Corrige el texto que va al final.`,
    "",
    "Reglas:",
    "1. Corrige solo los errores. No reescribas lo que está bien ni lo «mejores».",
    `2. Usa solo lo que corresponde a ${opts.level} (${SCOPE[opts.level]}). No me propongas estructuras de un nivel mayor.`,
    "3. Por cada error: cita el fragmento exacto, da la forma correcta y explica en una frase la regla. Si el error es un calco del español, dilo y di cuál es el calco.",
    "4. Explica en español neutro, tuteando, sin sermones.",
    "5. Si no estás seguro de algo, dilo en vez de inventar.",
    `6. Termina con una línea que diga exactamente «${CORRECTED_MARK}» y, debajo, el texto completo corregido, sin comentarios.`,
    ...(task ? ["", `Lo que quería hacer con este texto: ${task}`] : []),
    "",
    "Mi texto:",
    '"""',
    opts.text.trim(),
    '"""',
  ].join("\n");
}

/** De la respuesta de la IA, lo que viene después de «TEXTO CORREGIDO:»; si no está esa marca, devuelve null. */
export function extractCorrected(reply: string): string | null {
  const i = reply.toUpperCase().lastIndexOf(CORRECTED_MARK);
  if (i < 0) return null;
  const rest = reply.slice(i + CORRECTED_MARK.length).replace(/^[\s*_>"«“]+|[\s*_"»”]+$/g, "").trim();
  return rest || null;
}
