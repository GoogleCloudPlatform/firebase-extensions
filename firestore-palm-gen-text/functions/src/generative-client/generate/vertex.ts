import {GenerativeClient} from './base_text_client';
import {helpers, v1} from '@google-cloud/aiplatform';
import * as z from 'zod';

type VertexPrediction = {
  safetyAttributes?: {
    blocked: boolean;
    categories: string[];
    scores: number[];
  };
  content?: string;
};

export interface TextGeneratorOptions {
  model: string;
  temperature?: number;
  candidateCount?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  projectId: string;
  location: string;
  context?: string;
}

export class VertexGenerativeClient extends GenerativeClient<
  any,
  v1.PredictionServiceClient
> {
  context?: string;
  model: string;
  temperature?: number;
  candidateCount?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens: number;
  endpoint: string;
  projectId: string;
  location: string;

  constructor(options: TextGeneratorOptions) {
    super();
    // here location is hard-coded, following https://cloud.google.com/vertex-ai/docs/generative-ai/embeddings/get-text-embeddings#generative-ai-get-text-embedding-nodejs
    const clientOptions = {
      apiEndpoint: 'us-central1-aiplatform.googleapis.com',
    };

    this.client = new v1.PredictionServiceClient(clientOptions);

    this.model = options.model;
    this.temperature = options.temperature;
    this.topP = options.topP;
    this.topK = options.topK;
    this.maxOutputTokens = options.maxOutputTokens || 1024;
    this.candidateCount = options.candidateCount;
    this.projectId = options.projectId;
    this.location = options.location;
    this.endpoint = `projects/${this.projectId}/locations/${this.location}/publishers/google/models/${this.model}`;
  }

  async generate(promptText: string, options: any): Promise<any> {
    console.log('options', options);
    if (!this.client) {
      throw new Error('Client not initialized');
    }
    const prompt = {
      prompt: promptText,
    };
    const instanceValue = helpers.toValue(prompt);
    const instances = [instanceValue!];

    const temperature = options.temperature || this.temperature;
    const topP = options.topP || this.topP;
    const topK = options.topK || this.topK;
    const maxOutputTokens = options.maxOutputTokens || this.maxOutputTokens;

    console.log('MAX OUTPUT TOKENS HERE', maxOutputTokens);

    const parameter: Record<string, string | number> = {};
    // We have to set these conditionally or they get nullified and the request fails with a serialization error.
    if (temperature) {
      parameter.temperature = temperature;
    }
    if (topP) {
      parameter.top_p = topP;
    }
    if (topK) {
      parameter.top_k = topK;
    }
    if (maxOutputTokens) {
      parameter.maxOutputTokens = maxOutputTokens;
    }

    const parameters = helpers.toValue(parameter);

    const request = {
      endpoint: this.endpoint,
      instances,
      parameters,
    };

    const result = (await this.client.predict(request))[0];

    if (!result.predictions || !result.predictions.length) {
      throw new Error('No predictions returned from Vertex AI.');
    }
    const predictionValue = result.predictions[0] as protobuf.common.IValue;

    const vertexPrediction = helpers.fromValue(predictionValue);

    const parsedVertexPrediction = parseVertexPrediction(
      vertexPrediction as VertexPrediction
    );
    const blocked = parsedVertexPrediction.safetyAttributes?.blocked || false;

    if (!blocked && !parsedVertexPrediction.content) {
      throw new Error('No content returned from Vertex AI.');
    }

    const safetyMetadata = {
      blocked,
      safetyAttributes: parsedVertexPrediction.safetyAttributes,
    };
    return {
      candidates: blocked ? [] : [parsedVertexPrediction.content],
      safetyMetadata,
    };
  }
}

const vertexPredictionSchema = z.object({
  content: z.string().optional(),
  safetyAttributes: z
    .object({
      blocked: z.boolean(),
    })
    .optional(),
});

const parseVertexPrediction = (result: unknown) => {
  const parsed = vertexPredictionSchema.safeParse(result);
  if (!parsed.success) {
    throw new Error('Bad response from Vertex AI.');
  }
  return parsed.data;
};
