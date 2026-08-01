import { defaultFetcher } from "../fetcher";

export const LINE_PUSH_MESSAGE_URL = "https://api.line.me/v2/bot/message/push";
export const LINE_VALIDATE_PUSH_MESSAGE_URL =
  "https://api.line.me/v2/bot/message/validate/push";

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

export class LineMessagingApiError extends Error {
  readonly status: number;
  readonly responseBody: string;
  readonly validationStatus: number | undefined;
  readonly validationResponseBody: string | undefined;

  constructor(input: {
    status: number;
    responseBody: string;
    validationStatus?: number | undefined;
    validationResponseBody?: string | undefined;
  }) {
    const detail =
      input.responseBody.trim() === "" ? "" : ` ${input.responseBody.trim()}`;
    const validationDetail = formatValidationDetail(input);
    super(`LINE push message failed: ${input.status}${detail}${validationDetail}`);
    this.name = "LineMessagingApiError";
    this.status = input.status;
    this.responseBody = input.responseBody;
    this.validationStatus = input.validationStatus;
    this.validationResponseBody = input.validationResponseBody;
  }
}

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
      const responseBody = await safeResponseText(response);
      const validation = shouldValidateMessageObject(response.status)
        ? await this.#validatePushMessages(input.messages)
        : undefined;

      throw new LineMessagingApiError({
        status: response.status,
        responseBody,
        validationStatus: validation?.status,
        validationResponseBody: validation?.responseBody,
      });
    }
  }

  async #validatePushMessages(
    messages: LineMessage[],
  ): Promise<{ status: number; responseBody: string }> {
    const response = await this.#fetcher(LINE_VALIDATE_PUSH_MESSAGE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.#channelAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages }),
    });

    return {
      status: response.status,
      responseBody: await safeResponseText(response),
    };
  }
}

function shouldValidateMessageObject(status: number): boolean {
  return status === 400;
}

function formatValidationDetail(input: {
  validationStatus?: number | undefined;
  validationResponseBody?: string | undefined;
}): string {
  if (input.validationStatus === undefined) {
    return "";
  }

  const body = input.validationResponseBody?.trim();
  if (body === undefined || body === "") {
    return ` validation: ${input.validationStatus}`;
  }

  return ` validation: ${input.validationStatus} ${body}`;
}

async function safeResponseText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}
