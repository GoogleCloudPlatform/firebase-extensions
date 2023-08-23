import { logger } from "firebase-functions";

import { getTable } from "../bigquery";
import config from "../config";

export const SyncDataTaskHandler = async (data: Record<any, any>) => {
  const table = await getTable(config.syncDataset, config.syncTable);

  /** Write the data to the database */
  return table.insert(data).catch((ex: any) => {
    for (const error of ex.errors) {
      for (const err of error.errors) {
        logger.error(err);
      }
    }
  });
};
