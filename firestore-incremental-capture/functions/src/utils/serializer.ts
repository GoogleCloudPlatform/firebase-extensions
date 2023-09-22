import * as traverse from 'traverse';
import {TraverseContext} from 'traverse';
import {DocumentReference, GeoPoint, Timestamp} from 'firebase-admin/firestore';

export const serializer = (data: any) => {
  return traverse(data).reduce(function (acc, property) {
    if (this.isRoot) return acc;

    if (Buffer.isBuffer(property)) {
      //@ts-ignore
      acc[this.key] = {
        type: 'binary',
        value: property.toString('base64'),
      };
      this.delete(true);
      return acc;
    }

    /** Handle array types */
    if (Array.isArray(property)) {
      //@ts-ignore
      acc[this.key] = {
        type: 'array',
        value: property.map(item => {
          // If the item is a primitive, return the serialized format
          if (typeof item !== 'object' || item === null) {
            return {type: typeof item, value: item};
          }
          // If the item is an object (including array), recursively serialize it
          return serializer(item);
        }),
      };
      this.delete(true);
      return acc;
    }

    // Handle GeoPoint special type
    if (property instanceof GeoPoint) {
      //@ts-ignore
      acc[this.key] = {
        type: 'geopoint',
        value: {
          latitude: {
            type: 'number',
            value: property.latitude,
          },
          longitude: {
            type: 'number',
            value: property.longitude,
          },
        },
      };
      this.delete(true); // Delete this node and halt further traversal for its children
      return acc;
    }

    // Handle Timestamp special type
    if (property instanceof Timestamp) {
      const date = property.toDate(); // Convert Timestamp to JavaScript Date
      //@ts-ignore
      acc[this.key] = {
        type: 'timestamp',
        value: date.toISOString(), // Convert Date to ISO string
      };
      this.delete(true);
      return acc;
    }

    // Handle DocumentReference special type
    if (property instanceof DocumentReference) {
      //@ts-ignore
      acc[this.key] = {
        type: 'documentReference',
        value: property.path, // Assuming DocumentReference has a 'path' property
      };
      this.delete(true);
      return acc;
    }

    if (property === null) {
      //@ts-ignore
      acc[this.key] = {
        type: 'null', // Set the type as 'null'
        value: null,
      };
      return acc;
    }

    // Handle object type nodes
    if (!this.isLeaf) {
      /** Handle array types */
      if (Array.isArray(property)) {
        //@ts-ignore
        acc[this.key] = {
          type: 'array',
          value: property.map(item => serializer(item)),
        };
        this.delete(true);
        return acc;
      }

      // If it's an object but not a special type, serialize it
      else if (typeof property === 'object' && property !== null) {
        //@ts-ignore
        acc[this.key] = {
          type: 'map',
          value: serializer(property), // Recursive serialization
        };
        this.delete(true);
        return acc;
      }

      return acc;
    }

    // Decide the accumulator context based on the parent node type
    const context =
      //@ts-ignore
      this.parent.node && this.parent.node.type === 'object'
        ? //@ts-ignore
          this.parent.node.value
        : acc;

    //@ts-ignore
    context[this.key] = {type: typeof property, value: property};

    return acc;
  }, {});
};
