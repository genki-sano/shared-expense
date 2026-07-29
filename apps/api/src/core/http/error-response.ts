export const unauthorizedErrorResponse = {
  message: "ログイン状態を確認できませんでした",
  details: {
    code: "AUTH_REQUIRED",
    action: "LINEから開き直して、もう一度お試しください",
  },
} as const;
