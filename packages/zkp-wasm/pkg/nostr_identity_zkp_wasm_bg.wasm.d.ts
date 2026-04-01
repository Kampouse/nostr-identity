/* tslint:disable */
/* eslint-disable */
export const memory: WebAssembly.Memory;
export const compute_commitment: (a: number, b: number, c: number, d: number) => [number, number];
export const export_verifying_key: () => [number, number, number, number];
export const generate_nonce: () => [number, number];
export const generate_ownership_proof_with_nsec: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number];
export const generate_pairing_input: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number, number];
export const initialize_zkp: () => [number, number, number];
export const verify_ownership_proof: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number];
export const get_timestamp: () => bigint;
export const __wbindgen_exn_store: (a: number) => void;
export const __externref_table_alloc: () => number;
export const __wbindgen_externrefs: WebAssembly.Table;
export const __wbindgen_malloc: (a: number, b: number) => number;
export const __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
export const __wbindgen_free: (a: number, b: number, c: number) => void;
export const __externref_table_dealloc: (a: number) => void;
export const __wbindgen_start: () => void;
