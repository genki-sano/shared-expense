import type { HouseholdUsers } from "@shared-expense/shared";

export type HouseholdUserRepository = {
  listHouseholdUsers(): Promise<HouseholdUsers>;
};

export class InMemoryHouseholdUserRepository implements HouseholdUserRepository {
  readonly #users: HouseholdUsers;

  constructor(users: HouseholdUsers = defaultHouseholdUsers) {
    this.#users = users;
  }

  async listHouseholdUsers(): Promise<HouseholdUsers> {
    return this.#users;
  }
}

export const defaultHouseholdUsers: HouseholdUsers = [
  { id: "user_a", lineUserId: "line_a", displayName: "A", notifyEnabled: true },
  { id: "user_b", lineUserId: "line_b", displayName: "B", notifyEnabled: true },
];
