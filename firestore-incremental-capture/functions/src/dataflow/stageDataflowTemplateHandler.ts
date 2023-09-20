import * as admin from 'firebase-admin';
import config from '../config';
import {WaitForCreateBuildCompletion, stageTemplate} from './cloudbuild';

export const stageDataFlowTemplateHandler = async () => {
  const operation = await stageTemplate();
  const doc = admin.firestore().doc(config.cloudBuildDoc);
  console.log(`Operation name: ${JSON.stringify(operation.name!)}`);
  await doc.set({status: 'staging template'}, {merge: true});

  await WaitForCreateBuildCompletion(operation.name!);

  await doc.set({status: 'Completed'}, {merge: true});
};
