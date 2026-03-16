export type ChatMessage = {
  role: "user" | "assistant" | "system" | string;
  content: string;
  reasoning_content: string;
};

export type SlotOccupied = {
  slot: number | undefined;
  reset: boolean;
}