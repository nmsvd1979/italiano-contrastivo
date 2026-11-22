import type { Item } from "../../generated/item";
import { Choice, type ChoiceItem } from "./Choice";
import { Cloze, type ClozeItem } from "./Cloze";
import { Reorder, type ReorderItem } from "./Reorder";
import { Write } from "./Write";
import type { WriteItem } from "../../state/write";

export function ItemView({ item, onAnswer }: { item: Item; onAnswer: (correct: boolean) => void }) {
  switch (item.type) {
    case "choice_l1_distractor": return <Choice item={item as ChoiceItem} onAnswer={onAnswer} />;
    case "cloze": return <Cloze item={item as ClozeItem} onAnswer={onAnswer} />;
    case "reorder": return <Reorder item={item as ReorderItem} onAnswer={onAnswer} />;
    case "translate_es_it": return <Write item={item as WriteItem} onAnswer={onAnswer} />;
    default: return <p>Este ejercicio no está disponible todavía.</p>;
  }
}
