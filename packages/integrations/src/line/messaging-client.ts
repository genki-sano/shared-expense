import { defaultFetcher } from "../fetcher";

export const LINE_PUSH_MESSAGE_URL = "https://api.line.me/v2/bot/message/push";

export type LineTextMessage = {
  type: "text";
  text: string;
};

export type LineFlexMessage = {
  type: "flex";
  altText: string;
  contents: LineFlexContainer;
};

export type LineFlexContainer = LineFlexBubble;

export type LineFlexBubble = {
  type: "bubble";
  size?: "nano" | "micro" | "kilo" | "mega" | "giga";
  header?: LineFlexBox;
  body?: LineFlexBox;
  footer?: LineFlexBox;
  styles?: Record<string, unknown>;
};

export type LineFlexBox = {
  type: "box";
  layout: "vertical" | "horizontal" | "baseline";
  contents: LineFlexComponent[];
  spacing?: string;
  margin?: string;
  paddingAll?: string;
  paddingTop?: string;
  paddingBottom?: string;
  paddingStart?: string;
  paddingEnd?: string;
  backgroundColor?: string;
  cornerRadius?: string;
};

export type LineFlexText = {
  type: "text";
  text: string;
  size?: string;
  color?: string;
  weight?: "regular" | "bold";
  wrap?: boolean;
  align?: "start" | "end" | "center";
  flex?: number;
  margin?: string;
};

export type LineFlexSeparator = {
  type: "separator";
  margin?: string;
  color?: string;
};

export type LineFlexButton = {
  type: "button";
  style?: "link" | "primary" | "secondary";
  height?: "sm" | "md";
  color?: string;
  action: LineUriAction;
};

export type LineUriAction = {
  type: "uri";
  label: string;
  uri: string;
};

export type LineFlexComponent =
  | LineFlexBox
  | LineFlexText
  | LineFlexSeparator
  | LineFlexButton;

export type LineMessage = LineTextMessage | LineFlexMessage;

export type PushLineMessageInput = {
  to: string;
  messages: LineMessage[];
};

export type LineMessagingClient = {
  pushMessage(input: PushLineMessageInput): Promise<void>;
};

export type FetchLineMessagingClientInput = {
  channelAccessToken: string;
  fetcher?: typeof fetch;
};

export class FetchLineMessagingClient implements LineMessagingClient {
  readonly #channelAccessToken: string;
  readonly #fetcher: typeof fetch;

  constructor(input: FetchLineMessagingClientInput) {
    this.#channelAccessToken = input.channelAccessToken;
    this.#fetcher = input.fetcher ?? defaultFetcher();
  }

  async pushMessage(input: PushLineMessageInput): Promise<void> {
    const response = await this.#fetcher(LINE_PUSH_MESSAGE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.#channelAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: input.to,
        messages: input.messages,
      }),
    });

    if (!response.ok) {
      throw new Error(`LINE push message failed: ${response.status}`);
    }
  }
}
