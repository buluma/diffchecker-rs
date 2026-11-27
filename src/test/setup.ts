/// <reference types="node" />

import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { initSync } from '@diffchecker/wasm';

const wasm = readFileSync('src/platform/wasm/diffchecker_engine_bg.wasm');
initSync({ module: new Uint8Array(wasm) });

// Vitest globals are off, so testing-library can't register its own cleanup
afterEach(cleanup);
