jest.resetModules();

// Mock GoogleGenerativeAI and its methods
const mockGetGenerativeModel = jest.fn();
const mockBatchEmbedContents = jest.fn();

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: mockGetGenerativeModel,
  })),
}));

import {GeminiAITextEmbedClient} from '../../src/embeddings/client/text/gemini';
import {GoogleGenerativeAI} from '@google/generative-ai';

describe('Gemini Embeddings', () => {
  let embedClient: GeminiAITextEmbedClient;

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock return value for getGenerativeModel
    mockGetGenerativeModel.mockReturnValue({
      batchEmbedContents: mockBatchEmbedContents,
    });

    // Instantiate and initialize the client
    embedClient = new GeminiAITextEmbedClient();
    await embedClient.initialize();
  });

  describe('initialize', () => {
    test('should properly initialize the client', async () => {
      expect(embedClient.client).toBeDefined();
      expect(GoogleGenerativeAI).toHaveBeenCalledWith('test-api-key');
    });
  });

  describe('getEmbeddings', () => {
    test('should return embeddings for a batch of text', async () => {
      // Mock batchEmbedContents to resolve with embeddings
      mockBatchEmbedContents.mockResolvedValueOnce({
        embeddings: [{values: [1, 2, 3]}, {values: [4, 5, 6]}],
      });

      const batch = ['text1', 'text2'];
      const results = await embedClient.getEmbeddings(batch);

      expect(mockBatchEmbedContents).toHaveBeenCalledWith({
        requests: [
          {content: {parts: [{text: 'text1'}], role: 'user'}},
          {content: {parts: [{text: 'text2'}], role: 'user'}},
        ],
      });

      expect(results).toEqual([
        [1, 2, 3],
        [4, 5, 6],
      ]);
    });

    test('should throw an error if the embedding process fails', async () => {
      // Mock batchEmbedContents to throw an error
      mockBatchEmbedContents.mockRejectedValueOnce(
        new Error('Embedding failed')
      );

      await expect(embedClient.getEmbeddings(['text'])).rejects.toThrow(
        'Error with embedding'
      );

      expect(mockBatchEmbedContents).toHaveBeenCalledWith({
        requests: [{content: {parts: [{text: 'text'}], role: 'user'}}],
      });
    });
  });
});
