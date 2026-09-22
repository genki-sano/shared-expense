import { describe, expect, it } from "vitest";
import { hasLiffPrimaryRedirectParams } from "./liff-primary-redirect-gate";

describe("hasLiffPrimaryRedirectParams", () => {
  it("detects a LIFF primary redirect with liff.state", () => {
    const searchParams = new URLSearchParams({
      "liff.state": "/expense?expenseId=2148",
    });

    expect(hasLiffPrimaryRedirectParams(searchParams)).toBe(true);
  });

  it("detects a LIFF primary redirect carrying an access token", () => {
    const searchParams = new URLSearchParams({
      access_token: "secret",
    });

    expect(hasLiffPrimaryRedirectParams(searchParams)).toBe(true);
  });

  it("does not treat secondary redirect referrer metadata as primary redirect", () => {
    const searchParams = new URLSearchParams({
      "liff.referrer": "https://example.com/",
      expenseId: "2148",
    });

    expect(hasLiffPrimaryRedirectParams(searchParams)).toBe(false);
  });
});
