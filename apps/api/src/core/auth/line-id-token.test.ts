import { describe, expect, it } from "vitest";
import { AuthenticationError } from "./authentication-error";
import { createLineIdTokenAuthenticator } from "./line-id-token";

describe("createLineIdTokenAuthenticator", () => {
  it("resolves a verified LINE sub to a household user", async () => {
    const authenticate = createLineIdTokenAuthenticator({
      channelId: "channel-1",
      userRepository: {
        listHouseholdUsers: async () => [
          {
            id: "woman",
            lineUserId: "line_woman",
            displayName: "ひとみ",
            notifyEnabled: true,
          },
          {
            id: "man",
            lineUserId: "line_man",
            displayName: "げんき",
            notifyEnabled: true,
          },
        ],
      },
      fetcher: async () =>
        Response.json({
          sub: "line_woman",
          aud: "channel-1",
        }),
    });

    await expect(authenticate("id-token")).resolves.toEqual({
      id: "woman",
      lineUserId: "line_woman",
      displayName: "ひとみ",
      notifyEnabled: true,
    });
  });

  it("rejects a verified LINE sub that is not in household users", async () => {
    const authenticate = createLineIdTokenAuthenticator({
      channelId: "channel-1",
      userRepository: {
        listHouseholdUsers: async () => [
          {
            id: "woman",
            lineUserId: "line_woman",
            displayName: "ひとみ",
            notifyEnabled: true,
          },
          {
            id: "man",
            lineUserId: "line_man",
            displayName: "げんき",
            notifyEnabled: true,
          },
        ],
      },
      fetcher: async () =>
        Response.json({
          sub: "line_unknown",
          aud: "channel-1",
        }),
    });

    await expect(authenticate("id-token")).rejects.toMatchObject({
      code: "user_not_registered",
      message: "Unknown LINE user: line_unknown",
    });
  });

  it("marks failed LINE token verification as invalid authentication", async () => {
    const authenticate = createLineIdTokenAuthenticator({
      channelId: "channel-1",
      userRepository: {
        listHouseholdUsers: async () => [
          {
            id: "woman",
            lineUserId: "line_woman",
            displayName: "ひとみ",
            notifyEnabled: true,
          },
          {
            id: "man",
            lineUserId: "line_man",
            displayName: "げんき",
            notifyEnabled: true,
          },
        ],
      },
      fetcher: async () =>
        Response.json({ error_description: "Invalid IdToken." }, { status: 400 }),
    });

    await expect(authenticate("bad-token")).rejects.toBeInstanceOf(
      AuthenticationError,
    );
    await expect(authenticate("bad-token")).rejects.toMatchObject({
      code: "invalid",
    });
  });

  it("marks LINE token verification server failures as unavailable authentication", async () => {
    const authenticate = createLineIdTokenAuthenticator({
      channelId: "channel-1",
      userRepository: {
        listHouseholdUsers: async () => [
          {
            id: "woman",
            lineUserId: "line_woman",
            displayName: "ひとみ",
            notifyEnabled: true,
          },
          {
            id: "man",
            lineUserId: "line_man",
            displayName: "げんき",
            notifyEnabled: true,
          },
        ],
      },
      fetcher: async () =>
        Response.json({ message: "LINE unavailable" }, { status: 503 }),
    });

    await expect(authenticate("id-token")).rejects.toMatchObject({
      code: "unavailable",
    });
  });

  it("marks household user lookup failures as unavailable authentication", async () => {
    const authenticate = createLineIdTokenAuthenticator({
      channelId: "channel-1",
      userRepository: {
        listHouseholdUsers: async () => {
          throw new Error("Sheets unavailable");
        },
      },
      fetcher: async () =>
        Response.json({
          sub: "line_woman",
          aud: "channel-1",
        }),
    });

    await expect(authenticate("id-token")).rejects.toMatchObject({
      code: "unavailable",
    });
  });
});
