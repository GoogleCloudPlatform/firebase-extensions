/**
 * Copyright 2023 Google LLC
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

export const missingVariableError = (field: string) =>
  new Error(
    `Error substituting handlebar variables into prompt. Does your document contain the field "${field}"?`
  );

export const variableTypeError = (field: string) =>
  new Error(
    `Error substituting variable "${field}" variables into prompt. All variable fields must be strings.`
  );
