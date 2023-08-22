import * as dotenv from 'dotenv';
dotenv.config({path: __dirname + '/.env'});
process.env.GCLOUD_PROJECT = 'dev-extensions-testing';
process.env.API_KEY = 'fake-api-key';
import * as firebaseFunctionsTest from 'firebase-functions-test';
import {post} from '../src/index';

const fft = firebaseFunctionsTest({
  projectId: 'dev-extensions-testing',
});

const wrappedPost = fft.wrap(post);
// const wrappedGetModels = fft.wrap(getModels);

describe.skip('getModels', () => {
  test('should throw if not authenticated', async () => {
    const res = await wrappedPost({model: 'test', method: 'test'});

    console.log(res);
  });

  test('should handle a 404', async () => {
    try {
      const res = await wrappedPost(
        {model: 'fake-model', method: 'test'},
        {auth: {uid: 'test'}}
      );
      console.log(await res.json());
    } catch (e) {
      console.log(e);
      console.log(e.httpErrorCode.status);
    }
  });

  test('should handle a 400', async () => {
    try {
      const res = await wrappedPost(
        {model: 'chat-bison-001', method: 'generateMessage', foo: 'bar'},
        {auth: {uid: 'test'}}
      );
      console.log(await res.json());
    } catch (e) {
      console.log(e);
      console.log(e.httpErrorCode.status);
    }
  });

  test('should handle a 200', async () => {
    const res = await wrappedPost(
      {
        model: 'chat-bison-001',
        method: 'generateMessage',
        prompt: {
          messages: [
            {
              author: '0',
              content: 'hello there',
            },
          ],
        },
      },
      {auth: {uid: 'test'}}
    );

    console.log(res);
  });
});
