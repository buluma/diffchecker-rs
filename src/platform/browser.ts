import type { BrowserOperations, BrowserRequest, WorkerReply, WorkerRequest } from './browserProtocol';

let worker: Worker | undefined;
let requestId = 0;
const pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();

function startWorker(): Worker {
  const instance = new Worker(new URL('./browserWorker.ts', import.meta.url), { type: 'module' });
  instance.onmessage = (event: MessageEvent<WorkerReply>) => {
    const reply = event.data;
    const request = pending.get(reply.id);
    pending.delete(reply.id);
    if (!request) return;
    if ('error' in reply) request.reject(new Error(reply.error));
    else request.resolve(reply.value);
  };
  const fail = (event: Event) => {
    const message = event instanceof ErrorEvent && event.message
      ? event.message
      : 'The browser comparison engine could not be loaded.';
    worker = undefined;
    instance.terminate();
    for (const request of pending.values()) request.reject(new Error(message));
    pending.clear();
  };
  instance.onerror = fail;
  instance.onmessageerror = fail;
  return instance;
}

export async function runBrowser<K extends keyof BrowserOperations>(
  operation: K, ...args: BrowserOperations[K]['args']
): Promise<BrowserOperations[K]['result']> {
  const request = { operation, ...(args.length > 0 && { arguments: args }) } as BrowserRequest;
  if (typeof Worker === 'undefined') {
    const { dispatchBrowser } = await import('./browserWasm');
    return await dispatchBrowser(request) as BrowserOperations[K]['result'];
  }
  const instance = worker ??= startWorker();
  const id = ++requestId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve: value => resolve(value as BrowserOperations[K]['result']), reject });
    try {
      const message: WorkerRequest = { id, request };
      instance.postMessage(message);
    } catch (error) {
      pending.delete(id);
      reject(error);
    }
  });
}
