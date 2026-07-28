import { describe, expect, it } from "vitest";
import { createLineIdTokenAuthenticator } from "./line-id-token";

describe("createLineIdTokenAuthenticator", () => {
  it("resolves a verified LINE sub to a household user", async () => {
    const authenticate = createLineIdTokenAuthenticator({
      channelId: "channel-1",
      expenseRepository: {
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
      expenseRepository: {
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

    await expect(authenticate("id-token")).rejects.toThrow(
      "Unknown LINE user: line_unknown",
    );
  });
});
