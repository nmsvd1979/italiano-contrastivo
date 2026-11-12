// Comprueba que los fixtures reales calzan con los tipos generados.
import type { Capsule } from "../src/generated/capsule";
import type { Lexeme } from "../src/generated/lexeme";
import type { Sentence } from "../src/generated/sentence";
import capsule from "../../fixtures/capsule-a2-aux-essere.json";
import lexemes from "../../fixtures/lexemes.json";
import sentences from "../../fixtures/sentences.json";

export const c: Capsule = capsule as Capsule;
export const l: Lexeme[] = lexemes as Lexeme[];
export const s: Sentence[] = sentences as Sentence[];
