export type Expense = {
  id: string;
  userId: string;
  userName?: string;
  date: string;
  price: number;
  category: string;
  memo: string | null;
  version: number;
};
