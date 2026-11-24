import { STRAND_TAG, type Strand } from "../../state/strands";

/** Etiqueta con el color de la hebra (Entender, Estudiar, Producir, Fluidez). */
export function Tag({ strand }: { strand: Strand }) {
  return <span className="tag" data-strand={strand}>{STRAND_TAG[strand]}</span>;
}
