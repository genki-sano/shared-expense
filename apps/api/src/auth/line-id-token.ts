import { verifyLineIdToken } from "@shared-expense/integrations";
import type { User } from "@shared-expense/shared";
import type { ExpenseRepository } from "../expenses/repository";

export type LineIdTokenAuthenticatorInput = {
  channelId: string;
  expenseRepository: Pick<ExpenseRepository, "listHouseholdUsers">;
  fetcher?: typeof fetch;
};

export function createLineIdTokenAuthenticator(
  input: LineIdTokenAuthenticatorInput,
): (token: string) => Promise<User> {
  return async (token) => {
    const payload = await verifyLineIdToken({
      idToken: token,
      channelId: input.channelId,
      ...(input.fetcher === undefined ? {} : { fetcher: input.fetcher }),
    });
    const users = await input.expenseRepository.listHouseholdUsers();
    const user = users.find((item) => item.lineUserId === payload.sub);

    if (user === undefined) {
      throw new Error(`Unknown LINE user: ${payload.sub}`);
    }

    return user;
  };
}
