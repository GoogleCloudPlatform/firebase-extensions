import {DiscussionClient, Message} from './base_class';
import {helpers, v1} from '@google-cloud/aiplatform';
import {z} from 'zod';

interface ApiMessage {
  /** Message author */
  author?: string | null;

  /** Message content */
  content?: string | null;
}

interface VertexChatOptions {
  history?: Message[];
  model: string;
  temperature?: number;
  candidateCount?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  projectId: string;
  location: string;
  context?: string;
  examples?: Message[];
}

type VertexPrediction = {
  safetyAttributes?: {
    blocked: boolean;
    categories: string[];
    scores: number[];
  };
  content?: string;
};

export class VertexDiscussionClient extends DiscussionClient<
  v1.PredictionServiceClient,
  VertexChatOptions,
  ApiMessage
> {
  private endpoint: string;
  context?: string;
  temperature?: number;
  topP?: number;
  topK?: number;
  candidateCount?: number;
  examples?: any[];

  constructor(options: VertexChatOptions) {
    super();
    this.endpoint = `projects/${options.projectId}/locations/${options.location}/publishers/google/models/${options.model}`;
    const clientOptions = {
      apiEndpoint: 'us-central1-aiplatform.googleapis.com',
    };

    this.client = new v1.PredictionServiceClient(clientOptions);
    this.context = options.context;
    this.temperature = options.temperature;
    this.topP = options.topP;
    this.topK = options.topK;
    this.candidateCount = options.candidateCount;
    this.examples = options.examples;
  }

  createLatestApiMessage(messageContent: string): ApiMessage {
    return {author: '0', content: messageContent};
  }

  async generateResponse(
    history: Message[],
    latestApiMessage: ApiMessage,
    options: VertexChatOptions
  ) {
    if (!this.client) {
      throw new Error('Client not initialized.');
    }

    // todo: examples

    // todo: types
    let instance: any = {
      messages: [...this.messagesToApi(history), latestApiMessage],
    };
    const context = options.context || this.context;
    const examples = this.messagesToApi(options.examples || []);

    if (context) {
      instance = {
        ...instance,
        context,
      };
    }
    if (examples) {
      instance = {
        ...instance,
        examples,
      };
    }

    const instanceValue = helpers.toValue(instance);

    const parameters = this.getParameters(options);

    const request = {
      endpoint: this.endpoint,
      instances: [instanceValue!],
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
    const blocked = parsedVertexPrediction.safetyAttributes[0].blocked;

    if (!blocked && !parsedVertexPrediction.candidates.length) {
      throw new Error('No content returned from Vertex AI.');
    }

    const safetyMetadata = {
      blocked,
      safetyAttributes: parsedVertexPrediction.safetyAttributes,
    };

    const candidates = parsedVertexPrediction.candidates.map(c => c.content);
    const content = candidates[0];

    return {
      response: content,
      candidates,
      safetyMetadata,
      history: history,
    };
  }

  private getParameters(options: VertexChatOptions) {
    const parameter: Record<string, string | number> = {};

    const temperature = options.temperature;
    const topP = options.topP;
    const topK = options.topK;
    const context = options.context || this.context || '';

    if (temperature) {
      parameter.temperature = temperature;
    }
    if (topP) {
      parameter.topP = topP;
    }
    if (topK) {
      parameter.topK = topK;
    }
    if (context) {
      parameter.context = context;
    }

    return helpers.toValue(parameter);
  }
  private messagesToApi(messages: Message[]) {
    const out = [];
    for (const message of messages) {
      if (!message.prompt || !message.response) {
        // logs.warnMissingPromptOrResponse(message.path!);
        continue;
      }
      out.push({author: '0', content: message.prompt});
      out.push({author: '1', content: message.response});
    }
    return out;
  }
}

const safetyAttributesSchema = z.object({
  categories: z.array(z.any()),
  scores: z.array(z.any()),
  safetyRatings: z.array(z.any()),
  blocked: z.boolean(),
});

const candidateSchema = z.object({
  author: z.string(),
  content: z.string(),
});

const vertexPredictionSchema = z.object({
  safetyAttributes: z.array(safetyAttributesSchema),
  candidates: z.array(candidateSchema),
});

const parseVertexPrediction = (result: unknown) => {
  const parsed = vertexPredictionSchema.safeParse(result);
  if (!parsed.success) {
    throw new Error('Bad response from Vertex AI.');
  }
  return parsed.data;
};
