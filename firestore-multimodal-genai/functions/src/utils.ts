import * as Mustache from 'mustache';

export function extractFields(
  obj: any,
  fields?: string[]
): Record<string, string> {
  const parsedFields: Record<string, string> = {};
  if (!fields || fields.length === 0) {
    return parsedFields;
  }
  for (const field of fields) {
    if (obj[field] && typeof obj[field] == 'string') {
      parsedFields[field] = obj[field];
    }
  }
  return parsedFields;
}

export function extractHandlebarsVariables(prompt: string) {
  return Mustache.parse(prompt)
    .filter(token => token[0] === 'name')
    .map(token => token[1] as string);
}
