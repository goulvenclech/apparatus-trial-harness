const PLACEHOLDER = "{DATE}";

// The protocol requires an explicit date in the system prompt, so a template
// without the placeholder is an error, not a silent pass-through.
export function substituteDate(template: string, date: string): string {
  if (!template.includes(PLACEHOLDER)) {
    throw new Error(`system prompt template contains no ${PLACEHOLDER} placeholder`);
  }
  return template.replaceAll(PLACEHOLDER, date);
}
