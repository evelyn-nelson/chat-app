import { MessageUser, ImageMessageContent } from "@/types/types";

export type TextDisplayableItem = {
  type: "message_text";
  id: string;
  user: MessageUser;
  content: string; // Plaintext
  align: "left" | "right";
  timestamp: string;
};

export type ImageDisplayableItem = {
  type: "message_image";
  id: string;
  user: MessageUser;
  content: ImageMessageContent;
  align: "left" | "right";
  timestamp: string;
};

export type DateSeparatorItem = {
  type: "date_separator";
  id: string;
  dateString: string;
};

export type DisplayableItem =
  | TextDisplayableItem
  | ImageDisplayableItem
  | DateSeparatorItem;
