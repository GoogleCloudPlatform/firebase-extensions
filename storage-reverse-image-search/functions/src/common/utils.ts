/**
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {google} from 'googleapis';
import * as admin from 'firebase-admin';
import {GoogleAuth} from 'google-auth-library';
import * as functions from 'firebase-functions';
import {Bucket, File} from '@google-cloud/storage';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs-extra';

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
  const bucket = await getEmbeddingsBucket();
  await bucket.upload(localFilePath, {
    destination: destinationPath,
    metadata: {
      cacheControl: 'public, max-age=31536000',
    },
  });
}

export async function getAccessToken() {
  const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    projectId: config.projectId,
  });
  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();
  return accessToken.token;
}

export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    const chunk = array.slice(i, i + chunkSize);
    result.push(chunk);
  }
  return result;
}

// Check if a file is an image
export const isImage = (filename: string): boolean => {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp'];
  const fileExtension = filename.split('.').pop()?.toLowerCase() || '';
  return imageExtensions.includes(fileExtension);
};

export async function listImagesInBucket(
  object?: functions.storage.ObjectMetadata
): Promise<File[]> {
  try {
    if (object) {
      const [file] = await admin
        .storage()
        .bucket(config.imgBucket)
        .file(object.name!)
        .get();

      return [file];
    }

    // Get a list of files in the bucket
    const [files] = await admin
      .storage()
      .bucket(config.imgBucket)
      .getFiles({prefix: config.path, autoPaginate: false});

    // Filter out non-image files
    const imageFiles = files.filter(file => isImage(file.name));

    return imageFiles;
  } catch (error) {
    console.error('Error reading images from GCS bucket:', error);
    return [];
  }
}
