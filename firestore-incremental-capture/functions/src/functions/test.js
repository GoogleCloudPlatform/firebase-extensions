const { BigQuery } = require("@google-cloud/bigquery");
const admin = require("firebase-admin");
const bq = new BigQuery({ projectId: "dev-extensions-testing" });

admin.initializeApp({ projectId: "dev-extensions-testing" });
const firestore = admin.firestore();

const rootCollection = firestore.collection("sync");

(async () => {
  // Create a sample document in 'someCollection'
  const someDocRef = await rootCollection.add({
    name: "Sample Document",
    description: "This is a sample document for reference.",
  });

  // Now, we'll insert multiple records
  const numberOfRecords = 5; // Inserting 5 records for demonstration. Change as per your requirement.
  for (let i = 0; i < numberOfRecords; i++) {
    // Reference to a new document in 'samples' collection
    const sampleRef = rootCollection.doc();

    // Set data with multiple data types
    await sampleRef.set({
      stringField: `This is a string ${i}`,
      numberField: 12345 + i,
      booleanField: i % 2 === 0, // Will alternate between true and false
      arrayField: ["apple", "banana", "cherry"],
      dateField: new Date(),
      nullField: null,
      objectField: {
        subString: `Sub object string ${i}`,
        subNumber: 67890 + i,
      },
      geopointField: new admin.firestore.GeoPoint(34.0522, -118.2437), // This represents LA latitude and longitude
      referenceField: someDocRef,
    });

    // Add data to a sub-collection
    await sampleRef.collection("subCollection").add({
      subStringField: `This is a string in a sub-collection ${i}`,
      subArrayField: ["grape", "melon", "pear"],
    });

    // Add data to a sub-collection of the sub-collection
    const subDocRef = sampleRef.collection("subCollection").doc();
    await subDocRef.collection("subSubCollection").add({
      subSubStringField: `This is a string in a sub-sub-collection ${i}`,
      subSubNumberField: 98765 + i,
    });

    console.log(`Data written to document with ID: ${sampleRef.id}`);
  }
})();
