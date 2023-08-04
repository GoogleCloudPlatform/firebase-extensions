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
import * as generativeLanguage from '@google-ai/generativelanguage';
import * as vertex from '@google-cloud/aiplatform';

export type APIGenerateMessageRequest =
  generativeLanguage.protos.google.ai.generativelanguage.v1beta2.IGenerateMessageRequest;
export type APIMessage =
  generativeLanguage.protos.google.ai.generativelanguage.v1beta2.IMessage;
export type APIExample =
  generativeLanguage.protos.google.ai.generativelanguage.v1beta2.IExample;

export type VertexPredictRequest =
  vertex.protos.google.cloud.aiplatform.v1beta1.IPredictRequest;

export type VertexPredictResponse =
  vertex.protos.google.cloud.aiplatform.v1beta1.IPredictResponse;