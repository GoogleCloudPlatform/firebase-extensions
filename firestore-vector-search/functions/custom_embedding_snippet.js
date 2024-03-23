const {https} = require('firebase-functions');
const {logger} = require('firebase-functions');

// This function is triggered on HTTP requests
exports.processBatch = https.onRequest((request, response) => {
  // Log the incoming request
  logger.info('Processing batch', {structuredData: true});

  // Ensure the request is a POST request
  if (request.method !== 'POST') {
    // Respond with 405 Method Not Allowed if not a POST request
    response.status(405).send('Only POST requests are accepted');
    return;
  }

  try {
    // Parse the request body
    const {batch} = request.body;

    // Validate the batch input
    if (!Array.isArray(batch)) {
      response
        .status(400)
        .send('Invalid input: batch must be an array of strings.');
      return;
    }

    // Map each string in the batch to [1, 0] if it contains "cat", [0, 1] otherwise
    const embeddings = batch.map(item =>
      item.includes('cat') ? [1, 0] : [0, 1]
    );

    // Send the response with the embeddings array
    response.send({embeddings});
  } catch (error) {
    // Handle any errors that might occur
    logger.error('Error processing request', {error});
    response
      .status(500)
      .send('An error occurred while processing the request.');
  }
});
