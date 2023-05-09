import * as functionsTestInit from 'firebase-functions-test';

export const mockGetBigqueryResults = () => {
  const functionsTest = functionsTestInit();
  return functionsTest.wrap(require('../../src').getBigqueryResults);
};
