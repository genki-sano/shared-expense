import type { User } from "@shared-expense/shared";

export async function authenticateLocalDevToken(): Promise<User> {
  return {
    id: "man",
    lineUserId: "local-dev",
    displayName: "Local Dev",
    notifyEnabled: true,
  };
}
