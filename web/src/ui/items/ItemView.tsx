import type { Item } from "../../generated/item";
import { Choice, type ChoiceItem } from "./Choice";
import { Cloze, type ClozeItem } from "./Cloze";
import { Reorder, type ReorderItem } from "./Reorder";

export function ItemView({ item, onAnswer }: { item: Item; onAnswer: (correct: boolean) => void }) {
  switch (item.type) {
    case "choice_l1_distractor": return <Choice item={item as ChoiceItem} onAnswer={onAnswer} />;
    case "cloze": return <Cloze item={item as ClozeItem} onAnswer={onAnswer} />;
    case "reorder": return <Reorder item={item as ReorderItem} onAnswer={onAnswer} />;
    default: return <p>Este ejercicio no está disponible todavía.</p>;
  }
}
