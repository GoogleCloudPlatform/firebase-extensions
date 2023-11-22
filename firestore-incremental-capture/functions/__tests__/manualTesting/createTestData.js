/* eslint-disable */
const admin = require('firebase-admin');

admin.initializeApp({projectId: 'dev-extensions-testing'});

/** add a root level collections */
const rootCollection = admin.firestore().collection('sync');

(async () => {
  const rootCollectionDocument = await rootCollection.add({
    name: 'Sample Document',
    description: 'This is a sample document for reference.',
  });

  /** Set the reference and Wait 5 seconds */
  const subCollectionRef = rootCollection.doc().collection('subCollection');
  await new Promise(resolve => setTimeout(resolve, 5000));

  /** Add a sub collection document */
  let i = 'first update';

  await subCollectionRef.add({
    stringField: `This is a string ${i}`,
    numberField: 12345 + i,
    booleanField: i % 2 === 0, // Will alternate between true and false
    arrayField: ['apple', 'banana', 'cherry'],
    dateField: new Date(),
    nullField: null,
    objectField: {
      subString: `Sub object string ${i}`,
      subNumber: 67890 + i,
    },
    geopointField: new admin.firestore.GeoPoint(34.0522, -118.2437), // This represents LA latitude and longitude
    referenceField: rootCollectionDocument,
  });

  /** Wait 5 seconds */
  await new Promise(resolve => setTimeout(resolve, 5000));

  i = 'second update';

  await subCollectionRef.add({
    stringField: `This is a string ${i}`,
    numberField: 12345 + i,
    booleanField: i % 2 === 0, // Will alternate between true and false
    arrayField: ['apple', 'banana', 'cherry'],
    dateField: new Date(),
    nullField: null,
    objectField: {
      subString: `Sub object string ${i}`,
      subNumber: 67890 + i,
    },
    geopointField: new admin.firestore.GeoPoint(34.0522, -118.2437), // This represents LA latitude and longitude
    referenceField: rootCollectionDocument,
  });

  /** Wait 30 seconds */
  await new Promise(resolve => setTimeout(resolve, 5000));
})();
