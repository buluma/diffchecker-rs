import type { BrowserRequest } from './browserProtocol';

let engine: Promise<typeof import('@diffchecker/wasm')> | undefined;

export async function dispatchBrowser(request: BrowserRequest): Promise<unknown> {
  engine ??= import('@diffchecker/wasm').then(async module => {
    await module.default();
    return module;
  }).catch(error => {
    engine = undefined;
    throw error;
  });
  return (await engine).dispatch(request);
}
