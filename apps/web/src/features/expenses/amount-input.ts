// Keep the caret beside the same digit when grouping separators change.
export function formatAmountInput(value: string, caret: number) {
  const normalize = (text: string) =>
    text.replace(/[０-９]/g, (char) =>
      String.fromCharCode(char.charCodeAt(0) - 65248),
    );
  const raw = normalize(value).replace(/\D/g, "");
  const digits = raw.replace(/^0+(?=\d)/, "");
  const removedZeros = raw.length - digits.length;
  const leftDigits = Math.max(
    0,
    normalize(value.slice(0, caret)).replace(/\D/g, "").length - removedZeros,
  );
  const formatted = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  let position = 0;
  let count = 0;
  while (position < formatted.length && count < leftDigits) {
    if (/\d/.test(formatted[position]!)) count++;
    position++;
  }
  return { value: formatted, caret: position };
}
