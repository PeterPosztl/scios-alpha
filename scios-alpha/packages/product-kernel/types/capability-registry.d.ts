/**
 * Build product-kernel capability records from enterprise CAPABILITY_REGISTRY.json
 */
export function loadCapabilityRegistry(appRoot: any): {
    schema: string;
    label: string;
    source: string;
    capabilities: any[];
    note: string;
    error?: undefined;
    packaged?: undefined;
} | {
    capabilities: any[];
    error: string;
    schema?: undefined;
    label?: undefined;
    source?: undefined;
    note?: undefined;
    packaged?: undefined;
} | {
    schema: string;
    label: string;
    source: string;
    packaged: boolean;
    capabilities: any[];
    note?: undefined;
    error?: undefined;
};
export function summarizeCapabilities(reg: any): {
    total: any;
    counts: {};
};
/**
 * Capability maturity states (BLOCK 2) — never PROFILE_DISABLED == ABSENT
 */
export const CAPABILITY_STATES: string[];
