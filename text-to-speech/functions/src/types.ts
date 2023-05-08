/*
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

import * as tts from '@google-cloud/text-to-speech';

export type ISynthesizeSpeechRequest =
  tts.protos.google.cloud.texttospeech.v1.ISynthesizeSpeechRequest;
export type ISynthesizeSpeechResponse =
  tts.protos.google.cloud.texttospeech.v1.ISynthesizeSpeechResponse;
export type AudioEncoding =
  | tts.protos.google.cloud.texttospeech.v1.AudioEncoding
  | 'AUDIO_ENCODING_UNSPECIFIED'
  | 'LINEAR16'
  | 'MP3'
  | 'OGG_OPUS'
  | 'MULAW'
  | 'ALAW';
export type SsmlVoiceGender =
  tts.protos.google.cloud.texttospeech.v1.SsmlVoiceGender;
