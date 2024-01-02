import config from '../../config';
import {ScheduledBackups} from './scheduled_backups';

// Required when using config to make sure the mock config is used
jest.mock('../../config');

const databaseId = 'test-database';
const fakeBackupData = {
  database: `projects/${config.projectId}/databases/${databaseId}`,
  state: 'READY',
  snapshotTime: new Date().toISOString(),
};
const fakeBsckupScheduleData = {
  name: `projects/${config.projectId}/locations/us-east1/backupSchedules/${databaseId}`,
  state: 'READY',
  schedule: 'every 24 hours',
  createTime: '2020-03-12T14:00:00Z',
  updateTime: '2020-03-12T14:00:00Z',
  versionTime: '2020-03-12T14:00:00Z',
  retentionUnit: 'COUNT',
  retentionValue: 1,
  startTime: {
    hours: 0,
    minutes: 0,
    seconds: 0,
    nanos: 0,
  },
  expireTime: {
    hours: 0,
    minutes: 0,
    seconds: 0,
    nanos: 0,
  },
  sourceDatabase: 'projects/test-project/databases/test-database',
};

describe('ScheduledBackups', () => {
  let scheduledBackups: ScheduledBackups;

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

  it('should throw when there are no backup schedules', async () => {
    require('googleapis').__setMockBackupScheduleData([]);
    await expect(
      scheduledBackups.checkIfBackupScheduleExists(databaseId)
    ).rejects.toThrow('BACKUP_SCHEDULE_NOT_FOUND');
  });

  it('should throw when there are no backup schedules', async () => {
    await expect(
      scheduledBackups.checkIfBackupScheduleExists(databaseId)
    ).rejects.toThrow('BACKUP_SCHEDULE_NOT_FOUND');
  });

  it('should list backup schedules correctly', async () => {
    require('googleapis').__setMockBackupSchedulesData([
      fakeBsckupScheduleData,
    ]);
    const backupSchedule =
      await scheduledBackups.checkIfBackupScheduleExists(databaseId);

    // Check if the returned backup schedule matches the fakeBackupScheduleData
    expect(backupSchedule).toEqual(fakeBsckupScheduleData);
  });

  it('should create a backup schedule if none exists', async () => {
    require('googleapis').__setMockBackupScheduleData(fakeBsckupScheduleData);
    const op = await scheduledBackups.setupScheduledBackups(databaseId);

    // Check if the backup schedule was created
    expect(op).toEqual(fakeBsckupScheduleData);
  });
});
