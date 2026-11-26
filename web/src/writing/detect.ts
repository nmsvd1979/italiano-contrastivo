/**
 * Detector de errores típicos de hispanohablantes en texto italiano libre, 100 % local y determinista (sin modelo).
 * Es la inversa de `pipeline/exercises/calques.py`: busca el calco que allí se genera. Cubre 8 códigos con listas
 * cerradas; lo que no encaja en un patrón seguro NO se marca (preferimos no decir nada a marcar italiano correcto).
 */
import explanations from "./explanations.json";

export type WritingError = {
  code: keyof typeof explanations;
  start: number;
  end: number;
  found: string;
  /** Texto con el que se reemplaza el tramo; "" = quitarlo. */
  suggestion: string;
  message: string;
};

const L = String.raw`\p{L}`;
const B = String.raw`(?<![\p{L}'’])`;
const E = String.raw`(?![\p{L}])`;
const CITIES = "Roma|Milano|Napoli|Torino|Firenze|Venezia|Bologna|Parigi|Londra|Madrid";
const COUNTRIES = "Italia|Spagna|Francia|Germania|Cile|Argentina|Messico|Inghilterra|Portogallo";
const PLACES = `(?:${CITIES}|${COUNTRIES})`;
const PEOPLE_VERBS = "[Vv]edo|[Vv]edi|[Vv]ede|[Cc]onosco|[Cc]onosci|[Cc]onosce|[Aa]mo|[Aa]mi|[Aa]ma|[Aa]spetto|[Aa]spetti|[Aa]spetta|[Cc]erco|[Cc]erchi|[Cc]erca|[Cc]hiamo|[Cc]hiami|[Cc]hiama";
const KIN = new Set(["padre", "madre", "fratello", "sorella", "figlio", "figlia", "nonno", "nonna", "zio", "zia", "marito", "moglie", "cugino", "cugina", "nipote", "papà", "mamma", "famiglia"]);
// Tras «casa mia», «amico mio»… el posesivo va pospuesto y sin artículo: si lo que sigue es verbo, pronombre, adverbio o nexo, no es un error.
const AFTER_POSTPOSED = new Set(["è", "era", "sono", "ha", "hanno", "e", "ed", "o", "ma", "che", "non", "mi", "ti", "si", "ci", "lo", "la", "li", "le", "ne", "ieri", "oggi", "domani", "ora", "adesso", "molto", "tanto", "sempre", "ancora", "anche", "già", "subito", "qui", "là", "lì", "stamattina", "stasera", "stanotte", "per", "con", "a", "di", "in", "da", "su", "tra", "fra", "se", "come", "quando", "dove", "poi", "però", "perché", "mai", "più", "meno", "vive", "abita", "sta", "va", "viene", "fa", "dice", "vuole", "può", "deve"]);
const COPULA = new Set(["è", "era", "sia", "sono", "siano", "fu", "sarà", "sarebbe", "fosse", "essere", "stato", "stata", "siamo", "siete", "sei", "ero", "eri", "eravamo", "erano", "diventa", "diventato", "sembra", "resta", "rimane"]);

const AUX = { ho: "sono", hai: "sei", ha: "è", abbiamo: "siamo", avete: "siete", hanno: "sono" } as const;
const TENERE = { tengo: "ho", tieni: "hai", tiene: "ha", teniamo: "abbiamo", tenete: "avete", tengono: "hanno" } as const;
const ART = ["il", "lo", "la", "i", "gli", "le"] as const;
const CONTRACT: Record<string, Record<string, string>> = {
  a: { il: "al", lo: "allo", la: "alla", i: "ai", gli: "agli", le: "alle", "l'": "all'" },
  in: { il: "nel", lo: "nello", la: "nella", i: "nei", gli: "negli", le: "nelle", "l'": "nell'" },
  su: { il: "sul", lo: "sullo", la: "sulla", i: "sui", gli: "sugli", le: "sulle", "l'": "sull'" },
  da: { il: "dal", lo: "dallo", la: "dalla", i: "dai", gli: "dagli", le: "dalle", "l'": "dall'" },
  di: { il: "del", lo: "dello", la: "della", i: "dei", gli: "degli", le: "delle", "l'": "dell'" },
};

const DET = new Set(["il", "lo", "la", "i", "gli", "le", "l", "un", "uno", "una", "questo", "questa", "questi", "queste", "quel", "quello", "quella", "quei", "quegli", "quelle", "ogni", "altro", "altra", "altri", "altre", "due", "tre", "quattro", "cinque", "molti", "molte", "pochi", "poche", "tanti", "tante", "alcuni", "alcune", "ciascun", "ciascuna", "nessun", "nessuna", "mamma", "dio", "madonna",
  ...Object.values(CONTRACT).flatMap((m) => Object.values(m)), "col", "coi"]);

const cap = (s: string, like: string) => (/^\p{Lu}/u.test(like) ? s[0].toUpperCase() + s.slice(1) : s);
const norm = (s: string) => s.replace(/’/g, "'");
const words = (s: string) => s.toLowerCase().match(/[\p{L}']+/gu) ?? [];
const prevWord = (text: string, at: number) => words(text.slice(0, at)).pop();

function afterCopula(before: string): boolean {
  const w = words(before);
  while (w.length && ["sempre", "ancora", "anche", "già", "solo", "proprio", "davvero", "ormai", "mai", "non", "più", "ora", "adesso"].includes(w[w.length - 1])) w.pop();
  return w.length > 0 && COPULA.has(w[w.length - 1]);
}

type Hit = { start: number; end: number; suggestion: string };
type Rule = { code: WritingError["code"]; run: (text: string) => Hit[] };

const all = (re: RegExp, text: string) => [...text.matchAll(re)];
const span = (m: RegExpMatchArray, g: number): [number, number] => {
  const idx = (m as unknown as { indices: [number, number][] }).indices[g];
  return [idx[0], idx[1]];
};

const RULES: Rule[] = [
  {
    code: "ERR_AUX_ESSERE",
    run: (t) => all(new RegExp(`${B}(ho|hai|ha|abbiamo|avete|hanno)\\s+(?:andat|venut|arrivat|partit|nat|mort)[oaie]${E}`, "dgiu"), t).map((m) => {
      const [s, e] = span(m, 1);
      return { start: s, end: e, suggestion: cap(AUX[m[1].toLowerCase() as keyof typeof AUX], m[1]) };
    }),
  },
  {
    code: "ERR_PREP_PLACE",
    run: (t) => [
      ...all(new RegExp(`${B}([Ii]n)\\s+(?=(?:${CITIES})${E})`, "dgu"), t).map((m) => ({ start: span(m, 1)[0], end: span(m, 1)[1], suggestion: cap("a", m[1]) })),
      ...all(new RegExp(`${B}([Aa])\\s+(?=(?:${COUNTRIES})${E})`, "dgu"), t).map((m) => ({ start: span(m, 1)[0], end: span(m, 1)[1], suggestion: cap("in", m[1]) })),
    ],
  },
  {
    code: "ERR_CE_AGREEMENT",
    run: (t) => [
      ...all(new RegExp(`${B}([Cc]['’]è)\\s+(?:due|tre|quattro|cinque|sei|sette|otto|nove|dieci|molti|molte|pochi|poche|tanti|tante|dei|delle|degli|alcuni|alcune)${E}`, "dgu"), t)
        .map((m) => ({ start: span(m, 1)[0], end: span(m, 1)[1], suggestion: cap("ci sono", m[1]) })),
      ...all(new RegExp(`${B}([Cc]i sono)\\s+(?:un|una|uno)${E}`, "dgu"), t)
        .map((m) => ({ start: span(m, 1)[0], end: span(m, 1)[1], suggestion: cap("c'è", m[1]) })),
    ],
  },
  {
    code: "ERR_PERSONAL_A",
    run: (t) => all(new RegExp(`${B}(?:${PEOPLE_VERBS}|(?:[Hh]o|[Hh]ai|[Hh]a|[Aa]bbiamo|[Aa]vete|[Hh]anno)\\s+(?:visto|conosciuto|incontrato|chiamato|aspettato|cercato|salutato|invitato|ringraziato))\\s+(a)\\s+(?=\\p{Lu})(?!${PLACES}${E})`, "dgu"), t)
      .map((m) => ({ start: span(m, 1)[0], end: span(m, 1)[1] + 1, suggestion: "" })),
  },
  {
    code: "ERR_POSSESSIVE_ARTICLE",
    run: (t) => all(new RegExp(`${B}((?:mi|tu|su|nostr|vostr)[oaie]|miei|tuoi|suoi|mie|tue|sue)\\s+(${L}+)`, "dgiu"), t).filter((m) => {
      const [s] = span(m, 1);
      const w = m[1].toLowerCase();
      if (!/^(mio|mia|miei|mie|tuo|tua|tuoi|tue|suo|sua|suoi|sue|nostro|nostra|nostri|nostre|vostro|vostra|vostri|vostre)$/.test(w)) return false;
      if (KIN.has(m[2].toLowerCase())) return false;
      if (afterCopula(t.slice(0, s))) return false;
      const p = prevWord(t, s);
      if (p !== undefined && DET.has(p) && !/(^|[.!?…]\s*)$/.test(t.slice(0, s))) return false;
      return !AFTER_POSTPOSED.has(m[2].toLowerCase());
    }).map((m) => ({ start: span(m, 1)[0], end: span(m, 1)[1], suggestion: "" })),
  },
  {
    code: "ERR_PREP_ARTICLE_CONTRACTION",
    run: (t) => all(new RegExp(`${B}(a|in|su|da|di)\\s+(?:(${ART.join("|")})\\s+(?=${L})|(l['’])(?=${L}))`, "dgiu"), t)
      .map((m) => {
        const g = m[2] ? 2 : 3;
        const art = norm(m[g].toLowerCase());
        const to = CONTRACT[m[1].toLowerCase()]?.[art];
        const [s] = span(m, 1);
        return { start: s, end: span(m, g)[1], suggestion: to ? cap(to, m[1]) : "" };
      }).filter((h) => h.suggestion !== ""),
  },
  {
    code: "ERR_COMPARATIVE_DI",
    run: (t) => all(new RegExp(`${B}(?:[Pp]iù|[Mm]eno)\\s+${L}+\\s+(che)\\s+(?:me|te|lui|lei|noi|voi|loro|\\p{Lu}${L}*)${E}`, "dgu"), t)
      .map((m) => ({ start: span(m, 1)[0], end: span(m, 1)[1], suggestion: "di" })),
  },
  {
    code: "ERR_TENERE_AVERE",
    run: (t) => all(new RegExp(`${B}([Tt]engo|[Tt]ieni|[Tt]iene|[Tt]eniamo|[Tt]enete|[Tt]engono)\\s+(?:fame|sete|sonno|freddo|caldo|paura|ragione|fretta|\\d+\\s+anni)${E}`, "dgu"), t)
      .map((m) => ({ start: span(m, 1)[0], end: span(m, 1)[1], suggestion: cap(TENERE[m[1].toLowerCase() as keyof typeof TENERE], m[1]) })),
  },
];


// Futuro y condicional: la raíz regular que el español sugiere (*anderò) frente a la irregular (andrò). Lista cerrada; «volerò» (de volare) y «viverò» son válidos y no están.
const FUT_STEMS: [string, string][] = [["ander", "andr"], ["venir", "verr"], ["poter", "potr"], ["saper", "sapr"], ["veder", "vedr"], ["dover", "dovr"], ["aver", "avr"], ["esser", "sar"]];
const FUT_ENDINGS = ["ò", "ai", "à", "emo", "ete", "anno", "ei", "esti", "ebbe", "emmo", "este", "ebbero"];
const FUT_FIX = new Map<string, string>(FUT_STEMS.flatMap(([bad, good]) => FUT_ENDINGS.map((e) => [bad + e, good + e] as [string, string])));
// «qualche» + plural: solo las terminadas en -i; estos singulares en -i son válidos.
const SING_I = new Set(["crisi", "analisi", "tesi", "ipotesi", "brindisi", "bici", "sintesi", "diagnosi", "parentesi", "oasi", "pausa", "metropoli", "alibi", "safari", "taxi", "menù"]);
const A2_RULES: Rule[] = [
  {
    code: "ERR_REFLEXIVE_AUX",   // *mi ho alzato → mi sono alzato (mi ho, ti hai y vi avete no existen; «ci abbiamo pensato» sí, y «mi ha detto» también: no se tocan)
    run: (t) => all(new RegExp(`${B}(?:mi\\s+(ho)|ti\\s+(hai)|vi\\s+(avete))\\s+${L}+(?:at|ut|it)[oaie]${E}`, "dgiu"), t).map((m) => {
      const g = m[1] ? 1 : m[2] ? 2 : 3;
      return { start: span(m, g)[0], end: span(m, g)[1], suggestion: cap(({ ho: "sono", hai: "sei", avete: "siete" } as Record<string, string>)[m[g].toLowerCase()], m[g]) };
    }),
  },
  {
    code: "ERR_PP_AUSILIARE",   // *ho stato, *ha piaciuto. «ha costato/bastato» se aceptan con avere: no se marcan.
    run: (t) => all(new RegExp(`${B}(ho|hai|ha|abbiamo|avete|hanno)\\s+(?:stat[oaie]|piaciut[oaie])${E}`, "dgiu"), t).map((m) => ({
      start: span(m, 1)[0], end: span(m, 1)[1], suggestion: cap({ ho: "sono", hai: "sei", ha: "è", abbiamo: "siamo", avete: "siete", hanno: "sono" }[m[1].toLowerCase() as "ho"], m[1]),
    })),
  },
  {
    code: "ERR_RELATIVO_CHE",    // *lo che → quello che
    run: (t) => all(new RegExp(`${B}([Ll]o)\\s+che${E}`, "dgu"), t).map((m) => ({ start: span(m, 1)[0], end: span(m, 1)[1] + 4, suggestion: cap("quello che", m[1]) })),
  },
  {
    code: "ERR_OPINIONE",        // *di accordo → d'accordo; *secondo io → secondo me
    run: (t) => [
      ...all(new RegExp(`${B}(?:sono|siamo|sei|è|siete|era|ero)\\s+(di\\s+accordo)${E}`, "dgiu"), t).map((m) => ({ start: span(m, 1)[0], end: span(m, 1)[1], suggestion: "d'accordo" })),
      ...all(new RegExp(`${B}[Ss]econdo\\s+(io|tu)${E}`, "dgu"), t).map((m) => ({ start: span(m, 1)[0], end: span(m, 1)[1], suggestion: m[1] === "io" ? "me" : "te" })),
    ],
  },
  {
    code: "ERR_INDEFINITI",      // *qualche libri → alcuni libri (solo plurales en -i; los nombres en -e son ambiguos y no se marcan)
    run: (t) => all(new RegExp(`${B}([Qq]ualche)\\s+(${L}+i)${E}`, "dgu"), t)
      .filter((m) => !SING_I.has(m[2].toLowerCase()))
      .map((m) => ({ start: span(m, 1)[0], end: span(m, 1)[1], suggestion: cap("alcuni", m[1]) })),
  },
  {
    code: "ERR_FUTURO_RADICE",   // *anderò → andrò, *venirò → verrò, *poterei → potrei…
    run: (t) => all(new RegExp(`${B}(${L}+)${E}`, "dgu"), t).filter((m) => FUT_FIX.has(m[1].toLowerCase()))
      .map((m) => ({ start: span(m, 1)[0], end: span(m, 1)[1], suggestion: cap(FUT_FIX.get(m[1].toLowerCase())!, m[1]) })),
  },
  {
    code: "ERR_SUBORDINATE",     // *para mangiare → per mangiare («para» no es italiano)
    run: (t) => all(new RegExp(`${B}([Pp]ara)\\s+${L}+(?:are|ere|ire|arsi|ersi|irsi)${E}`, "dgu"), t).map((m) => ({ start: span(m, 1)[0], end: span(m, 1)[1], suggestion: cap("per", m[1]) })),
  },
];

export function detectErrors(text: string): WritingError[] {
  const out: WritingError[] = [];
  for (const rule of [...RULES, ...A2_RULES]) {
    for (const h of rule.run(text)) {
      out.push({ code: rule.code, start: h.start, end: h.end, found: text.slice(h.start, h.end), suggestion: h.suggestion, message: explanations[rule.code] });
    }
  }
  return out.sort((a, b) => a.start - b.start);
}
