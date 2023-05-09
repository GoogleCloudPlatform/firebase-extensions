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
import {
  AudioEncoding,
  ISynthesizeSpeechRequest,
  SsmlVoiceGender,
} from './types';
import config from './config';

export interface BuildRequestOptions {
  text: string;
  languageCode?: string;
  ssmlGender?: SsmlVoiceGender;
  audioEncoding?: AudioEncoding;
  voiceName?: string;
}

export function buildRequest({
  text,
  languageCode = config.languageCode,
  ssmlGender = config.ssmlGender,
  audioEncoding = config.audioEncoding,
  voiceName = config.voiceName,
}: BuildRequestOptions): ISynthesizeSpeechRequest {
  return {
    input: config.ssml ? {ssml: text} : {text: text},
    voice: voiceName ? {name: voiceName} : {languageCode, ssmlGender},
    audioConfig: {
      audioEncoding,
    },
  };
}

export function getFileExtension(audioEncoding: AudioEncoding): string {
  switch (audioEncoding) {
    case 'LINEAR16':
      return '.wav';
    case 'MP3':
      return '.mp3';
    case 'OGG_OPUS':
      return '.ogg';
    case 'MULAW':
      return '.mulaw';
    case 'ALAW':
      return '.alaw';
    default:
      return '.wav';
  }
}
