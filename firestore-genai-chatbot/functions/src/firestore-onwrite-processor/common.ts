/**
 * Copyright 2026 Google LLC
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

import {Change as FirestoreChange} from 'firebase-functions/v1';
import {DocumentSnapshot} from 'firebase-functions/v1/firestore';
import {FieldValue, GeoPoint, Timestamp} from 'firebase-admin/firestore';
export type Change = FirestoreChange<DocumentSnapshot>;

export enum ChangeType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

export enum State {
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
}

export interface Status {
  state: State;
  updateTime: Timestamp;
  startTime: Timestamp;
}

// TODO missing reference type
export type FirestoreField =
  | string
  | number
  | boolean
  | Timestamp
  | Array<any>
  | Record<string, any>
  | GeoPoint
  | undefined
  | null;

export const now = () => FieldValue.serverTimestamp();

export interface ProcessConfig<
  TInput,
  TOutput extends Record<string, FirestoreField>,
> {
  inputField: string;
  processFn: (val: TInput, after: DocumentSnapshot) => Promise<TOutput>;
  errorFn: (e: unknown) => string;
  statusField?: string;
  orderField?: string;
}

export const getChangeType = (change: Change) => {
  if (!change.before || !change.before.exists) {
    return ChangeType.CREATE;
  }
  if (!change.after || !change.after.exists) {
    return ChangeType.DELETE;
  }
  return ChangeType.UPDATE;
};

export const isDelete = (change: Change) =>
  getChangeType(change) === ChangeType.DELETE;

export const isUpdate = (change: Change) =>
  getChangeType(change) === ChangeType.UPDATE;

export const isCreate = (change: Change) =>
  getChangeType(change) === ChangeType.CREATE;
