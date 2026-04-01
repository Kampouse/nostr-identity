/* tslint:disable */
/* eslint-disable */

/**
 * Compute SHA256 commitment from account_id + nsec (for off-circuit use)
 */
export function compute_commitment(account_id: string, nsec_hex: string): string;

/**
 * Export the verifying key as base64 (for embedding in TEE)
 * The TEE uses this same VK to verify client proofs
 */
export function export_verifying_key(): string;

/**
 * Generate random nonce
 */
export function generate_nonce(): string;

/**
 * Generate ownership proof using Nostr private key
 *
 * commitment = SHA256(SHA256(account_id || nsec_hex))
 * nullifier = SHA256(nsec_hex || nonce)
 *
 * The ZKP proves knowledge of account_id and nsec WITHOUT revealing them.
 */
export function generate_ownership_proof_with_nsec(account_id: string, nsec_hex: string, nonce: string): any;

/**
 * Generate the 768-byte pairing input for NEAR's alt_bn128_pairing_check host function.
 * Takes the ark-serialized proof and public input field elements.
 * Returns base64-encoded 768 bytes = 4 × (G1[64] + G2[128]).
 *
 * Pairing equation: e(-α,β) · e(-ic_sum,γ) · e(-C,δ) · e(A,B) == 1
 */
export function generate_pairing_input(proof_b64: string, commitment_field_hex: string, nullifier_field_hex: string): string;

/**
 * Get current timestamp
 */
export function get_timestamp(): bigint;

/**
 * Initialize ZKP system - call once on first visit
 */
export function initialize_zkp(): any;

/**
 * Verify ownership proof
 * Anyone can verify WITHOUT knowing account_id or nsec
 */
export function verify_ownership_proof(proof_b64: string, commitment_field_hex: string, nullifier_field_hex: string): any;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly compute_commitment: (a: number, b: number, c: number, d: number) => [number, number];
    readonly export_verifying_key: () => [number, number, number, number];
    readonly generate_nonce: () => [number, number];
    readonly generate_ownership_proof_with_nsec: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number];
    readonly generate_pairing_input: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number, number];
    readonly initialize_zkp: () => [number, number, number];
    readonly verify_ownership_proof: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number];
    readonly get_timestamp: () => bigint;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
