import {DocumentSnapshot} from 'firebase-admin/firestore';
import {z} from 'zod';

const stringSchema = z.string();
const intSchema = z.union([
  z.string().transform(arg => parseInt(arg) || undefined),
  z.number(),
]);
const floatSchema = z.union([z.string().transform(parseFloat), z.number()]);

export function extractOverrides(
  docSnap: DocumentSnapshot
): Record<string, unknown> {
  const overrides: Record<string, unknown> = {};

  const stringFields = ['context', 'model'];
  const intFields = ['topK', 'candidateCount'];
  const floatFields = ['topP', 'temperature'];

  extractOverridesByType(stringFields, docSnap, overrides, stringSchema);
  extractOverridesByType(intFields, docSnap, overrides, intSchema);
  extractOverridesByType(floatFields, docSnap, overrides, floatSchema);

  return overrides;
}

export function extractOverridesByType(
  fields: string[],
  docSnap: DocumentSnapshot,
  overrides: Record<string, unknown>,
  schema: z.ZodType<any, any, any>
): void {
  fields.forEach(field => {
    const rawValue = docSnap.get(field);
    try {
      const value = schema.parse(rawValue);
      overrides[field] = value;
    } catch (error) {
      // TODO: add warning
    }
  });
}
