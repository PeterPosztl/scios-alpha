/**
 * Contract versioning registry — no silent breaking replacement.
 * ALPHA_NON_PRODUCTION
 */
export function buildContractVersionRegistry(): {
    schema: string;
    label: string;
    policy: string;
    contracts: ({
        id: string;
        version: string;
        surface: string;
        protected: boolean;
        changePolicy?: undefined;
    } | {
        id: string;
        version: string;
        surface: string;
        protected: boolean;
        changePolicy: string;
    })[];
};
