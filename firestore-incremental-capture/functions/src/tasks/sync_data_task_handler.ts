import {logger} from 'firebase-functions';

import config from '../config';
import {getTable} from '../utils/big_query';

export async function syncDataTaskHandler(
  data: Record<any, any>
): Promise<void> {
  const table = await getTable(config.bqDataset, config.bqtable);

  // Write the data to the database
  await table.insert(data).catch((ex: any) => {
    for (const error of ex.errors) {
      for (const err of error.errors) {
        logger.error(err);
      }
    }
  });
}
