/** SKU / variant validation shared by product database and SKU request workflow. */
export function isUppercaseSku(input: string) {
  return /^[A-Z][A-Z0-9]*$/.test(input);
}

export function isValidVariant(input: string) {
  return /^[0-9]+[A-Z]*$/.test(input);
}
