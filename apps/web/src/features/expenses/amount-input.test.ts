import { describe, expect, it } from "vitest";
import { formatAmountInput } from "./amount-input";

describe("amount input", () => {
  it("groups digits and accepts fullwidth paste", () => {
    expect(formatAmountInput("1234567", 7)).toEqual({
      value: "1,234,567",
      caret: 9,
    });
    expect(formatAmountInput("００１２３４", 6)).toEqual({
      value: "1,234",
      caret: 5,
    });
    expect(formatAmountInput("", 0)).toEqual({ value: "", caret: 0 });
    expect(formatAmountInput("0", 1)).toEqual({ value: "0", caret: 1 });
  });
  it("preserves a caret while inserting or removing a middle digit", () => {
    expect(formatAmountInput("12,934", 4)).toEqual({
      value: "12,934",
      caret: 4,
    });
    expect(formatAmountInput("1,34", 2)).toEqual({ value: "134", caret: 1 });
    expect(formatAmountInput("¥ 1,234", 7)).toEqual({
      value: "1,234",
      caret: 5,
    });
  });
});
