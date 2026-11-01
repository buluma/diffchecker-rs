import { computeDiff } from '../utils/diff';
import type { DiffOptions, DiffResult } from '../types/diff';

interface DiffRequest {
  requestId: number;
  original: string;
  changed: string;
  options: DiffOptions;
}

interface DiffResponse {
  requestId: number;
  result?: DiffResult;
  error?: string;
}

self.onmessage = (event: MessageEvent<DiffRequest>) => {
  const { requestId, original, changed, options } = event.data;
  let response: DiffResponse;

  try {
    response = { requestId, result: computeDiff(original, changed, options) };
  } catch (error) {
    response = {
      requestId,
      error: error instanceof Error ? error.message : 'The comparison could not be completed.',
    };
  }

  self.postMessage(response);
};
