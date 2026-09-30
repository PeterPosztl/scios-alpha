/**
 * Lineage-based change impact analysis.
 * ALPHA_NON_PRODUCTION
 */
export function analyzeImpact(change: any): {
    schema: string;
    label: string;
    change: any;
    blastRadius: {
        dependentObjects: string[];
        packages: string[];
        providers: string[];
        actions: string[];
        workflows: string[];
        policies: string[];
        experiences: string[];
        roles: string[];
        releaseGates: string[];
    };
    riskClass: string;
    requiresImpactArtifacts: boolean;
    noGoIfMissing: boolean;
};
