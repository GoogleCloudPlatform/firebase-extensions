import {GenkitGenerativeClient} from '../../src/generative-client/genkit';
import {logger} from 'firebase-functions/v1';
import {GenerateResponse, genkit} from 'genkit';
import {googleAI, vertexAI} from '@genkit-ai/google-genai';
import {Config} from '../../src/config.js';
import {HarmBlockThreshold, HarmCategory} from '@google/generative-ai';

// Mock the genkit library
jest.mock('genkit', () => ({
  genkit: jest.fn().mockReturnValue({generate: jest.fn()}),
  isDevEnv: jest.fn().mockReturnValue(true),
  getCurrentEnv: jest.fn().mockReturnValue('development'),
}));

jest.mock('@genkit-ai/google-cloud', () => ({
  configureGcpPlugin: jest.fn().mockReturnValue({name: 'google-cloud'}),
  enableGoogleCloudTelemetry: jest.fn(),
}));

// jest.mock('@genkit-ai/firebase', () => ({
//   enableFirebaseTelemetry: jest.fn(),
// }));

jest.mock('@genkit-ai/google-genai', () => {
  // use Object.assign because callable and has properties
  const googleAIMock = Object.assign(
    jest.fn(() => ({name: 'googleai'})),
    {
      model: jest.fn((modelName: string) => ({
        name: `googleai/${modelName}`,
        withVersion: jest.fn(),
      })),
    }
  );
  const vertexAIMock = Object.assign(
    jest.fn(() => ({name: 'vertexai'})),
    {
      model: jest.fn((modelName: string) => ({
        name: `vertexai/${modelName}`,
        withVersion: jest.fn(),
      })),
    }
  );
  return {
    googleAI: googleAIMock,
    gemini20Flash: {name: 'googleai/gemini-2.0-flash', withVersion: jest.fn()},
    gemini20FlashLite: {
      name: 'googleai/gemini-2.0-flash-lite',
      withVersion: jest.fn(),
    },

    vertexAI: vertexAIMock,
    gemini20Flash001: {
      name: 'vertexai/gemini-2.0-flash-001',
      withVersion: jest.fn(),
    },
    gemini15Flash: {name: 'vertexai/gemini-1.5-flash', withVersion: jest.fn()},
    gemini15Pro: {name: 'vertexai/gemini-1.5-pro', withVersion: jest.fn()},
  };
});

jest.mock('../../src/generative-client/image_utils.ts', () => ({
  getImageBase64: jest.fn(() => Promise.resolve('base64EncodedImage')),
}));

describe('GenkitGenerativeClient', () => {
  const mockConfig: Config = {
    vertex: {
      model: 'gemini-1.5-flash',
    },
    googleAi: {
      model: 'gemini-1.5-flash',
      apiKey: 'test-api-key',
    },
    model: 'gemini-1.5-flash',
    location: 'us-central1',
    projectId: 'test-project',
    instanceId: 'test-instance',
    prompt: 'Test prompt',
    responseField: 'output',
    collectionName: 'users/{uid}/discussions/{discussionId}/messages',
    temperature: 0.7,
    topP: 0.9,
    topK: 50,
    candidates: {
      field: 'candidates',
      count: 1,
      shouldIncludeCandidatesField: false,
    },
    maxOutputTokens: 256,
    maxOutputTokensVertex: 1024,
    provider: 'google-ai',
    vertexProviderLocation: 'regional',
    apiKey: 'test-api-key',
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
      },
    ],
    bucketName: 'test-bucket',
    imageField: 'image',
    // enableGenkitMonitoring: true,
  };

  const mockGenerateResponse = {
    text: 'Generated text response',
    finishReason: 'stop',
    usage: {
      inputTokens: 10,
      outputTokens: 20,
      totalTokens: 30,
    },
    custom: null,
    raw: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with correct plugin and client for Google AI', () => {
    new GenkitGenerativeClient(mockConfig);

    expect(googleAI).toHaveBeenCalledWith({apiKey: 'test-api-key'});
    expect(genkit).toHaveBeenCalledWith({
      plugins: [expect.anything()],
    });
  });

  it('should initialize with correct plugin and client for Vertex AI', () => {
    const vertexConfig: Config = {
      ...mockConfig,
      provider: 'vertex-ai',
      googleAi: {model: 'gemini-1.5-flash', apiKey: '123'},
      model: 'gemini-1.5-flash',
    };
    new GenkitGenerativeClient(vertexConfig);

    expect(vertexAI).toHaveBeenCalledWith({location: 'us-central1'});
    expect(genkit).toHaveBeenCalledWith({
      plugins: [expect.anything()],
    });
  });

  it('should throw an error if no API key is provided for Google AI', () => {
    const invalidConfig: Config = {
      ...mockConfig,
      googleAi: {model: 'gemini-1.5-flash', apiKey: undefined},
    };

    expect(() => new GenkitGenerativeClient(invalidConfig)).toThrow(
      'API key required for Google AI.'
    );
  });

  it('should throw an error if an invalid provider is specified', () => {
    const invalidConfig: Config = {...mockConfig, provider: 'invalid-provider'};

    expect(() => new GenkitGenerativeClient(invalidConfig)).toThrow(
      'Invalid provider specified.'
    );
  });

  it('should create the correct model reference', () => {
    const modelReference = GenkitGenerativeClient.createModelReference(
      'gemini-1.5-flash',
      'google-ai'
    );
    expect(modelReference === null).toBe(false);

    expect(modelReference).toHaveProperty('name');

    expect(modelReference!.name).toBe('googleai/gemini-1.5-flash');
  });

  it('should call generate with correct options and return response', async () => {
    const client = new GenkitGenerativeClient(mockConfig);
    client.client.generate = jest.fn(() =>
      Promise.resolve(mockGenerateResponse as unknown as GenerateResponse<any>)
    );

    const response = await client.generate('Test prompt');

    expect(client.client.generate).toHaveBeenCalledWith({
      messages: [
        {
          role: 'user',
          content: [{text: 'Test prompt'}],
        },
      ],
      model: expect.any(Object),
      config: expect.any(Object),
    });

    expect(response).toEqual({candidates: ['Generated text response']});
  });

  it('should process an image if provided', async () => {
    const client = new GenkitGenerativeClient(mockConfig);
    client.client.generate = jest.fn(() =>
      Promise.resolve(mockGenerateResponse as unknown as GenerateResponse<any>)
    );

    const response = await client.generate('Test prompt', {
      image: 'path/to/image.jpg',
    });

    expect(client.client.generate).toHaveBeenCalledWith({
      messages: [
        {
          role: 'user',
          content: [
            {text: 'Test prompt'},
            {media: {url: 'data:image/jpeg;base64,base64EncodedImage'}},
          ],
        },
      ],
      model: {
        name: 'googleai/gemini-1.5-flash',
        withVersion: expect.any(Function),
      },
      config: {
        topP: 0.9,
        topK: 50,
        temperature: 0.7,
        maxOutputTokens: 256,
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
          },
        ],
      },
      image: 'path/to/image.jpg',
    });

    expect(response).toEqual({candidates: ['Generated text response']});
  });

  it('should log an error and throw if generate fails', async () => {
    const client = new GenkitGenerativeClient(mockConfig);
    const error = new Error('Generation failed');
    client.client.generate = jest.fn(() => Promise.reject(error));
    logger.error = jest.fn();

    await expect(client.generate('Test prompt')).rejects.toThrow(
      'Content generation failed.'
    );

    expect(logger.error).toHaveBeenCalledWith(
      'Failed to generate content:',
      error
    );
  });
});

describe('GenkitGenerativeClient.shouldUseGenkitClient', () => {
  const baseConfig: Config = {
    vertex: {model: 'gemini-1.0-pro'},
    googleAi: {model: 'gemini-1.5-flash', apiKey: 'test-api-key'},
    model: 'gemini-1.5-flash',
    location: 'us-central1',
    projectId: 'test-project',
    instanceId: 'test-instance',
    prompt: 'Test prompt',
    responseField: 'output',
    collectionName: 'users/{uid}/discussions/{discussionId}/messages',
    temperature: 0.7,
    topP: 0.9,
    topK: 50,
    candidates: {
      field: 'candidates',
      count: 1,
      shouldIncludeCandidatesField: false,
    },
    maxOutputTokens: 256,
    maxOutputTokensVertex: 1024,
    provider: 'google-ai',
    vertexProviderLocation: 'regional',
    apiKey: 'test-api-key',
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
      },
    ],
    bucketName: 'test-bucket',
    imageField: 'image',
    // enableGenkitMonitoring: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return false if the model includes "pro-vision"', () => {
    const config = {...baseConfig, model: 'gemini-pro-vision'};

    const result = GenkitGenerativeClient.shouldUseGenkitClient(config);

    expect(result).toBe(false);
  });

  it('should return false if multiple candidates are requested', () => {
    const config = {
      ...baseConfig,
      candidates: {
        field: 'candidates',
        count: 2,
        shouldIncludeCandidatesField: true,
      },
    };

    const result = GenkitGenerativeClient.shouldUseGenkitClient(config);

    expect(result).toBe(false);
  });

  it('should return false if no model reference is found', () => {
    const config = {...baseConfig, model: 'unknown-model'};

    jest
      .spyOn(GenkitGenerativeClient, 'createModelReference')
      .mockReturnValueOnce(null);

    const result = GenkitGenerativeClient.shouldUseGenkitClient(config);

    expect(result).toBe(false);
  });

  it('should return true if conditions are met for Genkit client usage', () => {
    const config = {...baseConfig, model: 'gemini-1.5-flash'};

    jest
      .spyOn(GenkitGenerativeClient, 'createModelReference')
      .mockReturnValueOnce({
        name: 'googleai/gemini-1.5-flash',
        withVersion: jest.fn(),
        withConfig: jest.fn(),
      });

    const result = GenkitGenerativeClient.shouldUseGenkitClient(config);

    expect(result).toBe(true);
  });

  it('should call createModelReference with correct parameters', () => {
    const spy = jest.spyOn(GenkitGenerativeClient, 'createModelReference');

    GenkitGenerativeClient.shouldUseGenkitClient(baseConfig);

    expect(spy).toHaveBeenCalledWith('gemini-1.5-flash', 'google-ai');
  });
});
