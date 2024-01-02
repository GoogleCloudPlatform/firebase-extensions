import {ScheduledBackups} from './scheduled_backups';
import config from '../../config';

// Required when using config to make sure the mock config is used
jest.mock('../../config.ts');

describe('ScheduledBackups', () => {
  let scheduledBackups: ScheduledBackups;
  const databaseId = 'test-database';
  const fakeBackupData = {
    database: `projects/${config.projectId}/databases/${databaseId}`,
    state: 'READY',
    snapshotTime: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
    scheduledBackups = new ScheduledBackups();
  });

  it("should throw when there're no backups", async () => {
    // Use await with expect().rejects.toThrow
    await expect(
      scheduledBackups.checkIfBackupExists(databaseId)
    ).rejects.toThrow('BACKUP_NOT_FOUND');
  });

  it('should list backups correctly', async () => {
    require('googleapis').__setMockBackupData([fakeBackupData]);
    const backup = await scheduledBackups.checkIfBackupExists(databaseId);

    // Check if the returned backup matches the fakeBackupData
    expect(backup).toContainEqual(fakeBackupData);
  });
});
