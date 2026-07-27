import { describe, expect, it } from "vitest";
import { authenticateLocalDevToken } from "./dev-auth";

describe("authenticateLocalDevToken", () => {
  it("returns a Spreadsheet-mappable user id for local mutations", async () => {
    await expect(authenticateLocalDevToken()).resolves.toEqual({
      id: "man",
      lineUserId: "local-dev",
      displayName: "Local Dev",
      notifyEnabled: true,
    });
  });
});
