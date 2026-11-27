import { dispatchBrowser } from './browserWasm';
import type { WorkerReply, WorkerRequest } from './browserProtocol';

self.addEventListener('message', async (event: MessageEvent<WorkerRequest>) => {
  const { id, request } = event.data;
  let reply: WorkerReply;
  try {
    reply = { id, value: await dispatchBrowser(request) };
  } catch (error) {
    reply = { id, error: error instanceof Error ? error.message : String(error) };
  }
  self.postMessage(reply);
});
