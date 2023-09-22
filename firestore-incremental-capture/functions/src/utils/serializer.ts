import * as admin from 'firebase-admin';
import {DocumentReference, GeoPoint, Timestamp} from 'firebase-admin/firestore';

export const serializer = async (
  ref: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData> | null
) => {
  type FlattenResult = {
    [key: string]: {
      type: string;
      value?: any;
    };
  };

  if (!ref) return null;

  function getType(value: any): string {
    if (
      value &&
      typeof value.latitude === 'number' &&
      typeof value.longitude === 'number'
    ) {
      return 'geopoint';
    }

    if (value instanceof Array) return 'array';
    if (value instanceof Date) return 'timestamp';
    if (value instanceof Buffer) return 'binary';

    return typeof value;
  }

  function flattenData(input: any, prefix: string = ''): FlattenResult {
    let result: FlattenResult = {};

    for (let key in input) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (input[key] instanceof Timestamp) {
        const timestampDate = input[key].toDate();
        const timestampISO = timestampDate.toISOString();

        result[fullKey] = {
          type: 'timestamp',
          value: timestampISO, // Storing the ISO string representation
        };
      } else if (input[key] instanceof DocumentReference) {
        result[fullKey] = {
          type: 'documentReference',
          value: input[key].path, // Storing the path of the document reference
        };
      } else if (input[key] instanceof GeoPoint) {
        result[fullKey] = {
          type: 'geopoint',
          value: {
            latitude: {
              type: 'number',
              value: input[key].latitude,
            },
            longitude: {
              type: 'number',
              value: input[key].longitude,
            },
          },
        };
      } else if (
        typeof input[key] === 'object' &&
        input[key] !== null &&
        !(input[key] instanceof Array) &&
        !(input[key] instanceof Date) &&
        !(input[key] instanceof Buffer) // Exclude special object types
      ) {
        // It's an object
        result[fullKey] = {
          type: 'object',
          value: flattenData(input[key]),
        };
      } else if (input[key] instanceof Array) {
        result[fullKey] = {
          type: 'array',
          //@ts-ignore
          value: input[key].map(item => {
            if (typeof item === 'object') {
              return flattenData(item);
            }
            return {
              type: getType(item),
              value: item,
            };
          }),
        };
      } else {
        // It's a basic type (string, number, boolean, etc.)
        result[fullKey] = {
          type: getType(input[key]),
          value: input[key],
        };
      }
    }

    return result;
  }
  const schema = flattenData(ref.data());

  return schema;
};
