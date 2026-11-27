declare module '@diffchecker/wasm' {
  export default function init(): Promise<unknown>;
  export function initSync(options: { module: BufferSource }): unknown;
  export function dispatch(request: unknown): unknown;
}
