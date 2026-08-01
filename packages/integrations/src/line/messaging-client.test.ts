import { describe, expect, it } from "vitest";
import {
  FetchLineMessagingClient,
  LINE_PROFILE_URL_BASE,
  LINE_PUSH_MESSAGE_URL,
  LINE_REPLY_MESSAGE_URL,
  LINE_VALIDATE_PUSH_MESSAGE_URL,
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

  it("replies to a LINE webhook event", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const client = new FetchLineMessagingClient({
      channelAccessToken: "channel-access-token",
      fetcher: async (url, init) => {
        calls.push({ url: String(url), init });
        return Response.json({});
      },
    });

    await client.replyMessage({
      replyToken: "reply-token",
      messages: [{ type: "text", text: "登録しました" }],
    });

    expect(calls).toEqual([
      {
        url: LINE_REPLY_MESSAGE_URL,
        init: {
          method: "POST",
          headers: {
            Authorization: "Bearer channel-access-token",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            replyToken: "reply-token",
            messages: [{ type: "text", text: "登録しました" }],
          }),
        },
      },
    ]);
  });


  it("validates message objects when LINE rejects a push request as malformed", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const client = new FetchLineMessagingClient({
      channelAccessToken: "channel-access-token",
      fetcher: async (url, init) => {
        calls.push({ url: String(url), init });
        if (String(url) === LINE_VALIDATE_PUSH_MESSAGE_URL) {
          return Response.json(
            {
              message: "The request body has 1 error(s)",
              details: [{ message: "invalid flex message" }],
            },
            { status: 400 },
          );
        }

        return Response.json({ message: "Failed to send messages" }, { status: 400 });
      },
    });

    await expect(
      client.pushMessage({
        to: "line_man",
        messages: [{ type: "text", text: "支出が追加されました" }],
      }),
    ).rejects.toMatchObject({
      name: "LineMessagingApiError",
      status: 400,
      responseBody: '{"message":"Failed to send messages"}',
      validationStatus: 400,
      validationResponseBody:
        '{"message":"The request body has 1 error(s)","details":[{"message":"invalid flex message"}]}',
      message:
        'LINE push message failed: 400 {"message":"Failed to send messages"} validation: 400 {"message":"The request body has 1 error(s)","details":[{"message":"invalid flex message"}]}',
    });
    expect(calls.map((call) => call.url)).toEqual([
      LINE_PUSH_MESSAGE_URL,
      LINE_VALIDATE_PUSH_MESSAGE_URL,
    ]);
  });

  it("diagnoses recipient profile visibility when push fails with valid messages", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const client = new FetchLineMessagingClient({
      channelAccessToken: "channel-access-token",
      fetcher: async (url, init) => {
        calls.push({ url: String(url), init });
        if (String(url) === LINE_VALIDATE_PUSH_MESSAGE_URL) {
          return Response.json({});
        }

        if (String(url) === `${LINE_PROFILE_URL_BASE}/line_man`) {
          return Response.json(
            { message: "Not found" },
            { status: 404 },
          );
        }

        return Response.json({ message: "Failed to send messages" }, { status: 400 });
      },
    });

    await expect(
      client.pushMessage({
        to: "line_man",
        messages: [{ type: "text", text: "支出が追加されました" }],
      }),
    ).rejects.toMatchObject({
      name: "LineMessagingApiError",
      status: 400,
      responseBody: '{"message":"Failed to send messages"}',
      validationStatus: 200,
      validationResponseBody: "{}",
      recipientProfileStatus: 404,
      recipientProfileResponseBody: '{"message":"Not found"}',
      message:
        'LINE push message failed: 400 {"message":"Failed to send messages"} validation: 200 {} recipient profile: 404 {"message":"Not found"}',
    });
    expect(calls.map((call) => call.url)).toEqual([
      LINE_PUSH_MESSAGE_URL,
      LINE_VALIDATE_PUSH_MESSAGE_URL,
      `${LINE_PROFILE_URL_BASE}/line_man`,
    ]);
  });
});
