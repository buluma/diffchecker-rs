import { dispatch } from '@diffchecker/wasm';
import type { DiffOptions } from '../types/diff';
import type { BrowserOperations } from '../platform/browserProtocol';

export function runWasm<K extends keyof BrowserOperations>(
  operation: K, ...args: BrowserOperations[K]['args']
): BrowserOperations[K]['result'] {
  return dispatch({ operation, ...(args.length > 0 && { arguments: args }) }) as BrowserOperations[K]['result'];
}

export function computeDiff(original: string, changed: string, options: DiffOptions) {
  return runWasm('compare', original, changed, options).result;
}
