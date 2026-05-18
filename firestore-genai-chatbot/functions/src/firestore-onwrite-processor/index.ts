import {
  Change,
  State,
  ProcessConfig,
  getChangeType,
  ChangeType,
  now,
  FirestoreField,
} from './common';
import {DocumentSnapshot} from 'firebase-admin/firestore';

/**
 * gRPC status codes for transient, connection-level failures that are safe to
 * retry for idempotent writes. Deliberately narrow: codes that may indicate
 * the write actually committed (4 DEADLINE_EXCEEDED) or a contention abort
 * that a blind retry would not resolve (10 ABORTED) are excluded to avoid
 * ambiguous double-writes.
 *
 * - 1  CANCELLED   (connection-level cancel; write did not commit)
 * - 14 UNAVAILABLE (channel/transport unavailable; write did not commit)
 *
 * gRPC retry semantics: UNAVAILABLE is safe to retry on the same call,
 * whereas ABORTED requires a higher-level retry and DEADLINE_EXCEEDED leaves
 * the write outcome ambiguous — hence both are excluded.
 *
 * @see https://grpc.io/docs/guides/retry/
 * @see https://firebase.google.com/docs/firestore/enterprise/understand-error-codes
 */
const TRANSIENT_GRPC_CODES = new Set<number>([1, 14]);

/**
 * Determines whether an error is a transient gRPC failure that may be retried.
 *
 * Firestore client errors expose the numeric gRPC status as `error.code`
 * (e.g. `{code: 1, details: 'Call cancelled', ...}`); CANCELLED is not
 * classified as transient by google-gax, so it is never retried internally
 * and must be handled here.
 *
 * @see https://github.com/googleapis/nodejs-firestore/issues/2167
 * @param e the caught error
 * @returns true if the error carries a transient gRPC status code
 */
const isTransientGrpcError = (e: unknown): boolean => {
  if (typeof e !== 'object' || e === null) return false;
  const code = (e as {code?: unknown}).code;
  return typeof code === 'number' && TRANSIENT_GRPC_CODES.has(code);
};

/**
 * Runs an operation, retrying with exponential backoff on transient gRPC
 * errors. The status writes performed by this processor are idempotent, so it
 * is safe to retry them rather than dropping the document's status when the
 * Firestore client reports a transient, connection-level failure (e.g. gRPC
 * `1 CANCELLED` / `14 UNAVAILABLE`).
 *
 * @param op the operation to run
 * @returns the resolved value of the operation
 */
const withTransientRetry = async <T>(op: () => Promise<T>): Promise<T> => {
  const maxAttempts = 4;
  for (let attempt = 1; ; attempt++) {
    try {
      return await op();
    } catch (e) {
      if (attempt >= maxAttempts || !isTransientGrpcError(e)) throw e;
      // Exponential backoff with full jitter to avoid synchronised retry
      // spikes when many function instances fail at once.
      const backoff = 100 * 2 ** (attempt - 1);
      await new Promise(resolve =>
        setTimeout(resolve, Math.random() * backoff)
      );
    }
  }
};

export class FirestoreOnWriteProcessor<
  TInput,
  TOutput extends Record<string, FirestoreField>,
> {
  inputField: string;
  processFn: (val: TInput, after: DocumentSnapshot) => Promise<TOutput>;
  statusField: string;
  processUpdates: boolean;
  orderField: string;
  errorFn: (e: unknown) => string;

  constructor(options: ProcessConfig<TInput, TOutput>) {
    this.inputField = options.inputField;
    this.orderField = options.orderField || 'createTime';
    this.processFn = options.processFn;
    this.statusField = options.statusField || 'status';
    this.processUpdates = true;
    this.errorFn = options.errorFn;
  }

  private shouldProcess(change: Change, changeType: ChangeType, state: State) {
    const newValue = this.getLatestInputValue(change);
    const oldValue = this.getPreviousInputValue(change);

    const hasChanged =
      changeType === ChangeType.CREATE ||
      (this.processUpdates &&
        changeType === ChangeType.UPDATE &&
        oldValue !== newValue);

    if (
      !newValue ||
      [State.PROCESSING, State.COMPLETED, State.ERROR].includes(state) ||
      !hasChanged ||
      typeof newValue !== 'string'
    ) {
      return false;
    }
    return true;
  }

  private getLatestInputValue(change: Change) {
    return change.after?.get(this.inputField);
  }
  private getPreviousInputValue(change: Change) {
    return change.before?.get(this.inputField);
  }

  private async writeStartEvent(change: Change) {
    const createTime = change.after.createTime!;
    const updateTime = now();

    const status = {
      state: State.PROCESSING,
      startTime: updateTime,
      updateTime,
    };

    const startData = change.after.get(this.orderField);
    // todo: fix type
    const update = startData
      ? {[this.statusField]: status}
      : {[this.orderField]: createTime, [this.statusField]: status};

    await withTransientRetry(() => change.after.ref.update(update));
  }

  private async writeCompletionEvent(change: Change, output: TOutput) {
    const updateTime = now();
    const stateField = `${this.statusField}.state`;
    const updateTimeField = `${this.statusField}.updateTime`;
    const completeTimeField = `${this.statusField}.completeTime`;
    await withTransientRetry(() =>
      change.after.ref.update({
        ...output,
        [stateField]: State.COMPLETED,
        [updateTimeField]: updateTime,
        [completeTimeField]: updateTime,
      })
    );
  }

  private async writeErrorEvent(change: Change, e: unknown) {
    const eventTimestamp = now();

    const errorMessage = this.errorFn(e);
    await withTransientRetry(() =>
      change.after.ref.update({
        [this.statusField]: {
          state: State.ERROR,
          updateTime: eventTimestamp,
          error: errorMessage,
        },
      })
    );
  }

  async run(change: Change): Promise<void> {
    const changeType = getChangeType(change);
    if (changeType === ChangeType.DELETE) return;

    // Initialize or get the status
    const state: State = change.after.get(this.statusField)?.state;

    if (!this.shouldProcess(change, changeType, state)) {
      return;
    }

    await this.writeStartEvent(change);

    try {
      const input = this.getLatestInputValue(change);
      const output = await this.processFn(input, change.after);
      await this.writeCompletionEvent(change, output);
    } catch (e) {
      await this.writeErrorEvent(change, e);
    }
  }
}
