import { describe, expect, it } from "vitest";
import { findPartnerUser } from "./user";
import type { User } from "./user";

const users: [User, User] = [
  { id: "user_a", lineUserId: "line_a", displayName: "A", notifyEnabled: true },
  { id: "user_b", lineUserId: "line_b", displayName: "B", notifyEnabled: true },
];

describe("findPartnerUser", () => {
  it("returns user_b when the actor is user_a", () => {
    expect(findPartnerUser(users, "user_a")).toEqual(users[1]);
  });

  it("returns user_a when the actor is user_b", () => {
    expect(findPartnerUser(users, "user_b")).toEqual(users[0]);
  });

  it("returns null when the actor is not in the household", () => {
    expect(findPartnerUser(users, "user_x")).toBeNull();
  });
});
