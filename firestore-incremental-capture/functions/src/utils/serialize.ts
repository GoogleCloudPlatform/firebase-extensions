import {DocumentReference} from 'firebase-admin/firestore';

import * as traverse from 'traverse';

export const serializeData = (eventData: any) => {
  if (typeof eventData === 'undefined') {
    return undefined;
  }

  const data = traverse<traverse.Traverse<any>>(eventData).map(function (
    property: any
  ) {
    if (property && property.constructor) {
      if (property.constructor.name === 'Buffer') {
        this.remove();
      }

      if (property.constructor.name === DocumentReference.name) {
        this.update(property.path);
      }
    }
  });

  return data;
};
