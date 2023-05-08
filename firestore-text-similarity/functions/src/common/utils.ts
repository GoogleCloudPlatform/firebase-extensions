import {google} from 'googleapis';
import {GoogleAuth} from 'google-auth-library';

import * as admin from 'firebase-admin';
import {Bucket} from '@google-cloud/storage';

import {CollectionReference, DocumentReference} from 'firebase-admin/firestore';

import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';

import config from '../config';

/**
 * Get the bucket where the embeddings will be stored.
 */
export async function getEmbeddingsBucket(): Promise<Bucket> {
  const bucketName = config.bucketName;

  try {
    // Check if the bucket exists
    await admin.storage().bucket(bucketName).getMetadata();
  } catch (error) {
    // If the bucket doesn't exist, create it with the specified location
    if ((error as any)?.code === 404) {
      console.log(error);
      const [bucket] = await admin.storage().bucket(bucketName).create({
        location: config.location,
      });
      console.log(`Bucket ${bucketName} created in the specified location.`);
      return bucket;
    } else {
      // If the error is not related to the bucket's existence, rethrow the error
      throw error;
    }
  }

  // If the bucket exists, return it
  return admin.storage().bucket(bucketName);
}

export function isValidReference(
  reference: DocumentReference | CollectionReference
): boolean {
  return (
    !reference.path.startsWith(config.instanceId) &&
    reference.path.includes(config.collectionName)
  );
}

export async function getProjectNumber(
  projectId: string
): Promise<string | null> {
  const authClient = await google.auth.getClient({
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });

  const client = google.cloudresourcemanager('v1');

  try {
    const response = await client.projects.get({
      projectId: projectId,
      auth: authClient,
    });
    return response.data.projectNumber || null;
  } catch (error) {
    console.error('Error fetching project number:', error);
    return null;
  }
}

export async function saveEmbeddingsToTmpFile(
  embeddings: Array<any>
): Promise<string> {
  const filePath = path.join(os.tmpdir(), 'embeddings.json');

  // Convert embeddings to the desired format (one JSON object per line)
  const formattedEmbeddings = embeddings
    .map(embedding => JSON.stringify(embedding))
    .join('\n');

  // Write the formatted embeddings to the file
  await fs.writeFile(filePath, formattedEmbeddings, {encoding: 'utf-8'});

  console.log('Embeddings saved to file:', filePath);

  return filePath;
}

export async function deleteTempFiles(): Promise<void> {
  return fs.emptyDir(os.tmpdir());
}

export async function uploadToCloudStorage(
  localFilePath: string,
  destinationPath: string
): Promise<void> {
  try {
    const bucket = await getEmbeddingsBucket();
    await bucket.upload(localFilePath, {
      destination: destinationPath,
      metadata: {
        cacheControl: 'public, max-age=31536000',
      },
    });
  } catch (error: any) {
    throw new Error(`Error uploading file to Cloud Storage: ${error.message}`);
  }
}

const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});

export async function getAccessToken() {
  const client = await auth.getClient();
  const _accessToken = await client.getAccessToken();
  return _accessToken.token;
}

export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    const chunk = array.slice(i, i + chunkSize);
    result.push(chunk);
  }
  return result;
}
