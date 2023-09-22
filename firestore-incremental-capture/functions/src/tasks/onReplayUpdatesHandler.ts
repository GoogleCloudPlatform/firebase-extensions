import {getFunctions} from 'firebase-admin/functions';
import {queryTable} from '../bigquery';
import config from '../config';

export const onReplayUpdatesHandler = async (data: any) => {
  /** Get the table rows */
  const rows: any[] = await queryTable();

  const batchSize = 500;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);

    // TODO: Process each batch as needed. You can use another forEach here if desired.
    batch.forEach((row: any) => {
      const queue = getFunctions().taskQueue(
        `locations/${config.location}/functions/onProcessReplayUpdates`,
        config.instanceId
      );

      /** Queue a restoration task */
      return queue.enqueue({rows: batch});
    });
  }
};
