import { createAI } from "ai/rsc";
import { Message, search } from "./actions";

export const AI = createAI<Message[], Message[]>({
  actions: {
    search,
  },
  initialAIState: [],
  initialUIState: [],
});
