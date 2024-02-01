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
