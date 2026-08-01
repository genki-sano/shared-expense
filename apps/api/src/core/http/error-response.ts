export type ApiErrorResponse = {
  message: string;
  details: Record<string, unknown>;
};

export const authRequiredErrorResponse = {
  message: "認証情報が見つかりません",
  details: {
    code: "AUTH_REQUIRED",
    action: "LINEから開き直して、もう一度お試しください",
  },
} as const satisfies ApiErrorResponse;

export const authInvalidErrorResponse = {
  message: "認証情報の有効期限が切れているか、正しくありません",
  details: {
    code: "AUTH_INVALID",
    action: "LINEから開き直して、もう一度お試しください",
  },
} as const satisfies ApiErrorResponse;

export const userNotRegisteredErrorResponse = {
  message: "このLINEユーザーは家計簿に登録されていません",
  details: {
    code: "USER_NOT_REGISTERED",
    action: "管理者にusersシートへの登録を依頼してください",
  },
} as const satisfies ApiErrorResponse;

export const authUnavailableErrorResponse = {
  message: "ユーザー情報を確認できません",
  details: {
    code: "AUTH_UNAVAILABLE",
    action:
      "家計簿のユーザー情報を読み込めません。時間をおいて再度お試しください。解消しない場合は管理者に連絡してください",
  },
} as const satisfies ApiErrorResponse;
