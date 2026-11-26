import {getTranscodedStoragePath} from '../src/util';

describe('getTranscodedStoragePath', () => {
  it('uses the file basename when no output path is configured', () => {
    expect(getTranscodedStoragePath('myDirectory/audio.wav')).toBe(
      'audio.wav.wav'
    );
  });

  it('writes nested input files under the configured output path once', () => {
    expect(
      getTranscodedStoragePath('myDirectory/audio.wav', 'transcriptions')
    ).toBe('transcriptions/audio.wav.wav');
  });

  it('normalizes leading and trailing slashes in the configured output path', () => {
    expect(
      getTranscodedStoragePath('nested/audio.wav', '/transcriptions/')
    ).toBe('transcriptions/audio.wav.wav');
  });

  it('does not duplicate the source directory when output path matches it', () => {
    expect(
      getTranscodedStoragePath('myDirectory/audio.wav', 'myDirectory')
    ).toBe('myDirectory/audio.wav.wav');
  });
});
