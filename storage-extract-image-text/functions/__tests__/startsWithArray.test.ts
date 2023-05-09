import {startsWithArray} from '../src/util';

describe('startsWithArray', () => {
  test('returns true when the image path starts with a path in the array', () => {
    const userInputPaths = ['/images'];
    const imagePath = 'images/1234.jpg';

    const result = startsWithArray(userInputPaths, imagePath);

    expect(result).toBe(true);
  });
});
