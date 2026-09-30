/**
 * Dual digital twin — Enterprise + SCI System — extends meta-recovery twin pattern.
 * Do not create a duplicate graph database.
 * ALPHA_NON_PRODUCTION
 */
export function buildDualDigitalTwin(opts?: {}): {
    schema: string;
    label: string;
    extends: string[];
    enterpriseTwin: {
        purpose: string;
        nodes: string[];
        relationships: string[];
        workflows: string[];
        status: string;
        store: string;
    };
    sciSystemTwin: {
        purpose: string;
        nodes: string[];
        relationships: string[];
        status: string;
        store: string;
        host: {
            slice: string;
            pointer: string;
            authority: string;
            processOwnership: string;
            note: string;
        };
    };
    portsExpected: {
        controlPlane: any;
        shell: any;
        recovery: number;
    };
    note: string;
};
