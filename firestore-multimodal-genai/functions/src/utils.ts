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
  let tokens;
  try {
    tokens = Mustache.parse(prompt);
  } catch (e) {
    throw new Error(`Error parsing handlebars template: ${e}`);
  }

  const variables: string[] = [];

  for (const token of tokens) {
    if (token[0] === '#') {
      throw new Error(
        `Complex handlebars features like ${token[1]} blocks are not supported.`
      );
    } else if (token[0] === 'name') {
      const variable = token[1] as string;
      if (!variable.includes('.')) {
        variables.push(variable);
      } else {
        throw new Error(`Nested variables like ${variable} are not supported.`);
      }
    }
  }

  return variables;
}
