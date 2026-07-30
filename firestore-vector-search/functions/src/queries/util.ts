/**
 * Copyright 2026 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {z} from 'zod';

export const prefilterSchema = z.record(z.any());

export type Prefilter = z.infer<typeof prefilterSchema>;

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
