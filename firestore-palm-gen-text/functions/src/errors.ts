export const missingVariableError = (field: string) =>
  new Error(
    `Error substituting handlebar variables into prompt. Does your document contain the field "${field}"?`
  );
export const variableTypeError = (field: string) =>
  new Error(
    `Error substituting variable "${field}" variables into prompt. All variable fields must be strings.`
  );
