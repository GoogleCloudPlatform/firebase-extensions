import {TextServiceClient} from '@google-ai/generativelanguage';
import {GoogleAuth} from 'google-auth-library';
import config from '../config';

let client: TextServiceClient;

const EMBEDDING_MODEL = `models/${config.palmModel}`;

const initializePaLMClient = async () => {
  const t0 = performance.now();

  if (process.env.API_KEY) {
    const authClient = new GoogleAuth().fromAPIKey(process.env.API_KEY);
    client = new TextServiceClient({
      authClient,
    });
  } else {
    const auth = new GoogleAuth({
      scopes: [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/generative-language',
      ],
    });
    client = new TextServiceClient({
      auth,
    });
  }
  const duration = performance.now() - t0;

  console.log(`Initialized client. This took ${duration}ms`);
};

/**
 * Generates embeddings for a given array of sentences using PaLM embedding model.
 *
 * @param text a string or array of strings to be embedded.
 * @param key the key of the text in the document.
 * @returns an array of arrays containing 512 numbers representing the embedding of the text.
 */
async function getEmbeddingsPaLM(text: string | string[]): Promise<number[][]> {
  if (!client && (typeof text !== 'string' || text.length !== 0)) {
    await initializePaLMClient();
  }

  if (typeof text === 'string') text = [text];

  const t0 = performance.now();
  const embeddings = await Promise.all(
    text.map(async text => {
      const [response] = await client.embedText({
        model: EMBEDDING_MODEL,
        text,
      });

      if (!response || !response.embedding || !response.embedding.value)
        throw new Error('Error with embedding');

      return response.embedding!.value!;
    })
  );

  const duration = performance.now() - t0;
  console.log(`Processed embeddings. This took ${duration}ms`);
  // const embeddings = await client.embedText(text.length ? text : [text]);

  return embeddings;
}

export default getEmbeddingsPaLM;
