import * as admin from 'firebase-admin';

export const serializer = async (
  ref: admin.firestore.DocumentSnapshot<admin.firestore.DocumentData>
) => {
  type FlattenResult = {
    [key: string]: {
      type: string;
      value?: string | number | boolean;
    };
  };

  function flattenData(input: any, prefix: string = ''): FlattenResult {
    let result: FlattenResult = {};

    for (let key in input) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (
        typeof input[key] === 'object' &&
        input[key] !== null &&
        !Array.isArray(input[key])
      ) {
        // It's an object
        result[fullKey] = {type: 'object'};

        // Recursively handle the child items
        const childResults: FlattenResult = flattenData(input[key], fullKey);

        for (let childKey in childResults) {
          result[childKey] = childResults[childKey];
        }
      } else {
        // It's a basic type (string, number, boolean, etc.)
        result[fullKey] = {
          type: typeof input[key],
          value: input[key],
        };
      }
    }

    console.log(result);

    return result;
  }

  const schema = flattenData(ref.data());

  return schema;
};
