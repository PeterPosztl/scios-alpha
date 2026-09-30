export function hydrateEvidence(input?: {}, deps?: {}): {
    schema: string;
    sciOsCapabilities: any;
    availableData: {
        status: string;
        bindings: any;
        freshness: any;
    };
    capabilityCount: any;
    provenCount: any;
    missing: string[];
};
