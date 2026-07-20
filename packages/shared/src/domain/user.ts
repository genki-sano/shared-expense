export type User = {
  id: string;
  lineUserId: string;
  displayName: string;
  notifyEnabled: boolean;
};

export type HouseholdUsers = readonly [User, User];

export function findPartnerUser(users: HouseholdUsers, actorUserId: string): User | null {
  if (!users.some((user) => user.id === actorUserId)) {
    return null;
  }

  return users.find((user) => user.id !== actorUserId) ?? null;
}
