import config from './config';
import {Message, GenerateMessageOptions} from './types';
import {
  DocumentSnapshot,
  DocumentReference,
  FieldValue,
} from 'firebase-admin/firestore';

/** Utils for extracting conversation info from firestore */

const {promptField, responseField, orderField} = config;

export async function fetchHistory(ref: DocumentReference) {
  const collSnap = await ref.parent.orderBy(orderField, 'desc').get();

  const refData = await ref.get();
  const refOrderFieldVal = refData.get(orderField);
  //filter any docs that don't have an order field or have an order field that is greater than the current doc

  return collSnap.docs
    .filter(
      snap => snap.get(orderField) && snap.get(orderField) < refOrderFieldVal
    )
    .map(snap => ({
      path: snap.ref.path,
      prompt: snap.get(promptField),
      response: snap.get(responseField),
    }));
}

export async function fetchDiscussionOptions(
  ref: DocumentReference
): Promise<GenerateMessageOptions> {
  const discussionDocRef = ref.parent.parent;

  if (!discussionDocRef) return {};

  const discussionDocSnap = await discussionDocRef.get();

  if (!discussionDocSnap.exists) return {};

  const overrides = extractOverrides(discussionDocSnap);

  if (discussionDocSnap.get('examples')) {
    const examples = discussionDocSnap.get('examples');
    const validatedExamples = validateExamples(examples);
    if (validatedExamples.length > 0) {
      overrides.examples = validatedExamples;
    }
  }

  return overrides;
}

function extractOverrides(discussionDocSnap: DocumentSnapshot): any {
  const overrides = {};

  const stringFields = ['context', 'model', 'examples', 'continue'];
  const intFields = ['topK', 'candidateCount'];
  const floatFields = ['topP', 'temperature'];

  extractOverridesByType(
    stringFields,
    discussionDocSnap,
    overrides,
    (value: any) => value
  );
  extractOverridesByType(intFields, discussionDocSnap, overrides, parseInt);
  extractOverridesByType(floatFields, discussionDocSnap, overrides, parseFloat);

  return overrides;
}

function extractOverridesByType(
  fields: string[],
  docSnap: DocumentSnapshot,
  overrides: any,
  parseFunc: Function
): void {
  for (const field of fields) {
    const value = parseFunc(docSnap.get(field));
    if (value && !Number.isNaN(value)) {
      overrides[field] = value;
    }
  }
}

function validateExamples(examples: Record<string, unknown>[]): Message[] {
  if (!Array.isArray(examples)) {
    throw new Error('Invalid examples: ' + JSON.stringify(examples));
  }
  const validExamples: Message[] = [];
  for (const example of examples) {
    // check obj has prompt or response
    const prompt = example.prompt;
    const response = example.response;
    if (typeof prompt !== 'string' || typeof response !== 'string') {
      throw new Error('Invalid example: ' + JSON.stringify(example));
    }
    validExamples.push(example);
  }
  return validExamples;
}
