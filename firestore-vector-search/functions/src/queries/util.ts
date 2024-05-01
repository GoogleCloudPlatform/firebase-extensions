import {WhereFilterOp} from '@google-cloud/firestore';
import {z} from 'zod';

const operatorSchema = z.enum([
  '<',
  '<=',
  '==',
  '!=',
  '>=',
  '>',
  'array-contains',
  'in',
  'not-in',
  'array-contains-any',
]);

export const prefilterSchema = z.object({
  field: z.string(),
  operator: operatorSchema,
  value: z.string(),
});

export const parseLimit = (limit: unknown) => {
  if (typeof limit !== 'string' && typeof limit !== 'number') {
    throw new Error('limit must be a string or a number');
  }

  const parsedFloat = parseFloat(limit as string);
  const isInteger = Number.isInteger(parsedFloat);

  if (!isInteger || parsedFloat < 1) {
    throw new Error('limit must be an integer greater than 0');
  }

  const parsedInt = parseInt(limit as string);
  return parsedInt;
};

const querySchema = z
  .object({
    query: z.string(),
    limit: z.union([z.string(), z.number()]).optional(),
    prefilters: z.array(prefilterSchema).optional(),
  })
  .refine(data => data.query != undefined, {
    message: 'Query field must be provided',
  });

export interface parsedRequest {
  query: string; // This must always be provided, aligning with your Zod schema
  limit?: string | number;
  prefilters?: Prefilter[];
}

export const parseQuerySchema = (data: unknown): parsedRequest => {
  return querySchema.parse(data);
};

export interface Prefilter {
  field: string;
  operator: WhereFilterOp;
  value: any;
}
