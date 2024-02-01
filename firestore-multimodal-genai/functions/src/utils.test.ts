import {extractFields} from './utils'; // Adjust the import path as necessary

describe('extractFields', () => {
  const testObj = {
    name: 'John Doe',
    age: '30',
    email: 'john@example.com',
    active: true,
    city: 'New York',
  };

  test('should extract specified string fields from an object', () => {
    const fields = ['name', 'email'];
    const expected = {name: 'John Doe', email: 'john@example.com'};
    const result = extractFields(testObj, fields);
    expect(result).toEqual(expected);
  });

  test('should ignore non-existing fields', () => {
    const fields = ['name', 'nonExistingField'];
    const expected = {name: 'John Doe'}; // nonExistingField is ignored
    const result = extractFields(testObj, fields);
    expect(result).toEqual(expected);
  });

  test('should ignore fields that are not strings', () => {
    const fields = ['name', 'age', 'active']; // 'age' is a string but 'active' is not
    const expected = {name: 'John Doe', age: '30'}; // Only 'name' and 'age' included
    const result = extractFields(testObj, fields);
    expect(result).toEqual(expected);
  });

  test('should return an empty object if fields array is empty', () => {
    const fields: string[] = [];
    const expected = {};
    const result = extractFields(testObj, fields);
    expect(result).toEqual(expected);
  });

  test('should return an empty object if fields is undefined', () => {
    const expected = {};
    const result = extractFields(testObj);
    expect(result).toEqual(expected);
  });

  test('should correctly handle when object has no matching fields', () => {
    const fields = ['nonexistent1', 'nonexistent2'];
    const expected = {};
    const result = extractFields(testObj, fields);
    expect(result).toEqual(expected);
  });

  test('should extract all specified fields when all are present and strings', () => {
    const fields = ['name', 'email', 'city']; // All fields are present and strings
    const expected = {
      name: 'John Doe',
      email: 'john@example.com',
      city: 'New York',
    };
    const result = extractFields(testObj, fields);
    expect(result).toEqual(expected);
  });
});
