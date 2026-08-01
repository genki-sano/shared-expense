import { describe, expect, it } from "vitest";
import {
  FetchLineMessagingClient,
  LINE_PUSH_MESSAGE_URL,
  LineMessagingApiError,
} from "./messaging-client";

describe("FetchLineMessagingClient", () => {
  it("pushes messages through the LINE Messaging API", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const client = new FetchLineMessagingClient({
      channelAccessToken: "channel-access-token",
      fetcher: async (url, init) => {
        calls.push({ url: String(url), init });
        return Response.json({});
      },
    });

    await client.pushMessage({
      to: "line_man",
      messages: [
        {
          type: "flex",
          altText: "支出が追加されました",
          contents: {
            type: "bubble",
            body: {
              type: "box",
              layout: "vertical",
              contents: [{ type: "text", text: "支出が追加されました" }],
            },
          },
        },
      ],
    });

    expect(calls).toEqual([
      {
        url: LINE_PUSH_MESSAGE_URL,
        init: {
          method: "POST",
          headers: {
            Authorization: "Bearer channel-access-token",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: "line_man",
            messages: [
              {
                type: "flex",
                altText: "支出が追加されました",
                contents: {
                  type: "bubble",
                  body: {
                    type: "box",
                    layout: "vertical",
                    contents: [{ type: "text", text: "支出が追加されました" }],
                  },
                },
              },
            ],
          }),
        },
      },
    ]);
  });

  it("throws when LINE returns an error", async () => {
    const client = new FetchLineMessagingClient({
      channelAccessToken: "channel-access-token",
      fetcher: async () => Response.json({ message: "Forbidden" }, { status: 403 }),
    });

    await expect(
      client.pushMessage({
        to: "line_man",
        messages: [{ type: "text", text: "支出が追加されました" }],
      }),
    ).rejects.toMatchObject({
      name: "LineMessagingApiError",
      status: 403,
      responseBody: '{"message":"Forbidden"}',
      message: 'LINE push message failed: 403 {"message":"Forbidden"}',
    });
    await expect(
      client.pushMessage({
        to: "line_man",
        messages: [{ type: "text", text: "支出が追加されました" }],
      }),
    ).rejects.toBeInstanceOf(LineMessagingApiError);
  });
});
