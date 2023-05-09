import * as functionsTestInit from "firebase-functions-test";

export const mockGetBigqueryResults = () => {
  let functionsTest = functionsTestInit();
  return functionsTest.wrap(require("../../src").getBigqueryResults);
};
