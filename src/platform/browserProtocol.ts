import type { DiffLine, DiffOptions, DiffResult, DiffViewMode } from '../types/diff';
import type { ChangeMarker, MeasuredGroup } from '../types/markers';

export type MergeChoice = 'left' | 'right';

export interface BrowserOperations {
  compare: {
    args: [original: string, changed: string, options: DiffOptions];
    result: { result: DiffResult; indices: number[] | null };
  };
  detectLanguage: { args: [path: string | null, content: string]; result: string };
  highlight: { args: [lines: string[], language: string]; result: string[] };
  languages: { args: []; result: string[] };
  markers: { args: [groups: MeasuredGroup[], scrollHeight: number]; result: ChangeMarker[] };
  merge: { args: [lines: DiffLine[], choices: [number, MergeChoice][]]; result: string };
  export: { args: [lines: DiffLine[], mode: DiffViewMode]; result: string };
  validate: { args: [content: string]; result: void };
}

export type BrowserRequest = {
  [K in keyof BrowserOperations]: { operation: K; arguments?: BrowserOperations[K]['args'] };
}[keyof BrowserOperations];

export interface WorkerRequest {
  id: number;
  request: BrowserRequest;
}

export type WorkerReply = { id: number; value: unknown } | { id: number; error: string };
