/**
 * Copyright 2019 Google LLC
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
import { logger } from 'firebase-functions';
import { Config } from './config';


export const init = (config: Config) => {
    logger.info(`[firestore-palm-gen-text] Initialized with config: ${JSON.stringify(config)}`);
}

export const missingField = (field: string, path: string) => {
    logger.info(`[firestore-glm-discuss] Missing ordering field '${field}' on document '${path}', setting to current timestamp.`);
}

export const receivedAPIResponse = (path: string, duration: number) => {
    logger.info(`[firestore-glm-discuss] Received API response for document '${path}' in ${duration}ms.`,
    { duration }
    );
}

export const errorCallingGLMAPI = (path: string, error: any) => {
    logger.error(`[firestore-glm-discuss] Error calling PaLM API for document '${path}': ${error.message || "UNKNOWN ERROR"}`);
}
export const usingADC = () => {
    logger.log("no API key provided, using application default credentials.");
}