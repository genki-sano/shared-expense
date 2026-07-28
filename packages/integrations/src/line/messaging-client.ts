export const LINE_PUSH_MESSAGE_URL = "https://api.line.me/v2/bot/message/push";

export type LineTextMessage = {
  type: "text";
  text: string;
};

export type PushLineMessageInput = {
  to: string;
  messages: LineTextMessage[];
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
    this.#fetcher = input.fetcher ?? fetch;
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
