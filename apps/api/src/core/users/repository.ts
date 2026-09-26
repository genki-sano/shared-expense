import type { HouseholdUsers } from "@shared-expense/shared";
import type { User } from "@shared-expense/shared";

export type ClaimHouseholdUserInput = {
  userId: string;
  lineUserId: string;
};

export type HouseholdUserRepository = {
  listHouseholdUsers(): Promise<HouseholdUsers>;
};

export type ClaimableHouseholdUserRepository = HouseholdUserRepository & {
  claimHouseholdUser(input: ClaimHouseholdUserInput): Promise<User>;
};

export class InMemoryHouseholdUserRepository implements ClaimableHouseholdUserRepository {
  #users: HouseholdUsers;

  constructor(users: HouseholdUsers = defaultHouseholdUsers) {
    this.#users = users;
  }

  async listHouseholdUsers(): Promise<HouseholdUsers> {
    return this.#users;
  }

  async claimHouseholdUser(input: ClaimHouseholdUserInput): Promise<User> {
    const users = this.#users;
    const existingUser = users.find((user) => user.lineUserId === input.lineUserId);
    if (existingUser !== undefined && existingUser.id !== input.userId) {
      throw new Error("LINE user is already registered to another household user");
    }

    const userIndex = users.findIndex((user) => user.id === input.userId);
    if (userIndex === -1) {
      throw new Error(`Unknown household user: ${input.userId}`);
    }

    const currentUser = users[userIndex];
    if (currentUser === undefined) {
      throw new Error(`Unknown household user: ${input.userId}`);
    }

    if (
      currentUser.lineUserId.trim() !== "" &&
      currentUser.lineUserId !== input.lineUserId
    ) {
      throw new Error("Household user is already claimed");
    }

    const claimedUser = { ...currentUser, lineUserId: input.lineUserId };
    const [firstUser, secondUser] = users;
    this.#users =
      userIndex === 0
        ? [claimedUser, secondUser]
        : [firstUser, claimedUser];
    return claimedUser;
  }
}

export const defaultHouseholdUsers: HouseholdUsers = [
  { id: "user_a", lineUserId: "", displayName: "A", notifyEnabled: true },
  { id: "user_b", lineUserId: "", displayName: "B", notifyEnabled: true },
];
