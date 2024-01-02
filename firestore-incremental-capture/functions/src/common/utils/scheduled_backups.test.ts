import {ScheduledBackups} from './scheduled_backups';

describe('ScheduledBackups', () => {
  let scheduledBackups: ScheduledBackups;

  beforeEach(() => {
    jest.resetAllMocks();
    scheduledBackups = new ScheduledBackups();

    require('googleapis').__setMockBackupData([]);
  });

  it('should list backups correctly', async () => {
    expect(
      scheduledBackups.checkIfBackupExists('test-database')
    ).rejects.toThrow('BACKUP_NOT_FOUND');
  });
});
