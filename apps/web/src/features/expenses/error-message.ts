import { ExpenseApiError } from "./api";

export function errorMessageForUser(error: unknown): string {
  if (error instanceof ExpenseApiError) {
    const apiMessage = apiErrorMessageForUser(error.responseBody);
    if (apiMessage !== null) {
      return apiMessage;
    }

    const detail = error.responseBody.trim();
    if (detail === "") {
      return `API status: ${error.status}`;
    }

    return `API status: ${error.status} / ${detail}`;
  }

  if (error instanceof Error && error.message.trim() !== "") {
    return error.message;
  }

  return "時間をおいて再度お試しください。解消しない場合は管理者に連絡してください";
}

function apiErrorMessageForUser(responseBody: string): string | null {
  try {
    const body = JSON.parse(responseBody) as unknown;
    if (typeof body !== "object" || body === null || !("message" in body)) {
      return null;
    }

    const message = typeof body.message === "string" ? body.message.trim() : "";
    const details =
      "details" in body && typeof body.details === "object" && body.details !== null
        ? body.details
        : undefined;
    const action =
      details !== undefined &&
      "action" in details &&
      typeof details.action === "string"
        ? details.action.trim()
        : "";

    if (message === "") {
      return action === "" ? null : action;
    }

    return action === "" ? message : `${message}。${action}`;
  } catch {
    return null;
  }
}
