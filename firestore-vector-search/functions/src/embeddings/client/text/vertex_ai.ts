/**
 * This product or feature is subject to the "Pre-GA Offerings Terms" in the General Service Terms section of the Service Specific Terms.
 * Pre-GA products and features are available "as is" and might have limited support. For more information, see the launch stage descriptions.
 */

import {helpers, v1} from '@google-cloud/aiplatform';
import {config} from '../../../config';
import {EmbedClient} from '../base_class';

const endpoint = `projects/${config.projectId}/locations/${config.location}/publishers/google/models/text-embedding-preview-0409`;

export class VertexAITextEmbedClient extends EmbedClient {
  client: v1.PredictionServiceClient;

  constructor() {
    super({batchSize: 100, dimension: 768});
  }

  async initialize() {
    await super.initialize();
    if (!this.client) {
      const clientOptions = {
        apiEndpoint: 'us-central1-aiplatform.googleapis.com',
      };

      this.client = new v1.PredictionServiceClient(clientOptions);
    }
  }

  async getEmbeddings(batch: string[]) {
    try {
      const instances = batch.map(text =>
        helpers.toValue({content: text})
      ) as protobuf.common.IValue[];

      const parameters = helpers.toValue({});

      const [response] = await this.client.predict({
        endpoint,
        instances,
        parameters,
      });

      if (
        !response ||
        !response.predictions ||
        response.predictions.length === 0
      )
        throw new Error('Error with embedding');

      const predictionValues = response.predictions as protobuf.common.IValue[];

      const predictions = predictionValues.map(helpers.fromValue) as {
        embeddings: {values: number[]};
      }[];

      if (
        predictions.some(
          prediction => !prediction.embeddings || !prediction.embeddings.values
        )
      ) {
        throw new Error('Error with embedding');
      }

      const embeddings = predictions.map(
        prediction => prediction.embeddings.values
      );

      return embeddings;
    } catch (error) {
      console.error('Error fetching embeddings:', error);
      throw new Error('Error with embedding, see function logs for details');
    }
  }
}
