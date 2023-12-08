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

  constructor(options: VertexChatOptions) {
    super();
    this.endpoint = `projects/${options.projectId}/locations/${options.location}/publishers/google/models/${options.model}`;
    const clientOptions = {
      apiEndpoint: 'us-central1-aiplatform.googleapis.com',
    };

    this.client = new v1.PredictionServiceClient(clientOptions);
  }

  async generateResponse(
    history: Message[],
    latestApiMessage: ApiMessage,
    options: VertexChatOptions
  ) {
    if (!this.client) {
      throw new Error('Client not initialized.');
    }
    const instanceValue = helpers.toValue({
      messages: [...this.messagesToApi(history), latestApiMessage],
    });

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
    const blocked = parsedVertexPrediction.safetyAttributes?.blocked || false;

    if (!blocked && !parsedVertexPrediction.content) {
      throw new Error('No content returned from Vertex AI.');
    }

    const safetyMetadata = {
      blocked,
      safetyAttributes: parsedVertexPrediction.safetyAttributes,
    };
    const content = parsedVertexPrediction.content;
    const candidates = content ? [content] : [];

    return {
      response: parsedVertexPrediction.content,
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
    const context = options.context || '';
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
