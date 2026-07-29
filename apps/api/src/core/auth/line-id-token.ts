import {
  LineIdTokenVerificationError,
  verifyLineIdToken,
} from "@shared-expense/integrations";
import type { User } from "@shared-expense/shared";
import type { HouseholdUserRepository } from "../users/repository";
import { AuthenticationError } from "./authentication-error";

export type LineIdTokenAuthenticatorInput = {
  channelId: string;
  userRepository: HouseholdUserRepository;
  fetcher?: typeof fetch;
};

export function createLineIdTokenAuthenticator(
  input: LineIdTokenAuthenticatorInput,
): (token: string) => Promise<User> {
  return async (token) => {
    let payload;
    try {
      payload = await verifyLineIdToken({
        idToken: token,
        channelId: input.channelId,
        ...(input.fetcher === undefined ? {} : { fetcher: input.fetcher }),
      });
    } catch (error) {
      if (error instanceof LineIdTokenVerificationError && error.status >= 500) {
        throw new AuthenticationError(
          "unavailable",
          "LINE ID token verification is unavailable",
          { cause: error },
        );
      }

      throw new AuthenticationError("invalid", "LINE ID token is invalid", {
        cause: error,
      });
    }

    let users;
    try {
      users = await input.userRepository.listHouseholdUsers();
    } catch (error) {
      throw new AuthenticationError("unavailable", "Household users are unavailable", {
        cause: error,
      });
    }

    const user = users.find((item) => item.lineUserId === payload.sub);

    if (user === undefined) {
      throw new AuthenticationError(
        "user_not_registered",
        `Unknown LINE user: ${payload.sub}`,
      );
    }

    return user;
  };
}
