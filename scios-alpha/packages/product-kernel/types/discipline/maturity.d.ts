export function buildAssetMaturityRegistry(kernelSnapshot?: {}): {
    schema: string;
    label: string;
    states: string[];
    evidenceRequirements: {
        DRAFT: {
            evidence: string[];
        };
        EXPERIMENTAL: {
            evidence: string[];
        };
        ACTIVE: {
            evidence: string[];
        };
        TESTED: {
            evidence: string[];
        };
        VALIDATED: {
            evidence: string[];
        };
        PROMOTED: {
            evidence: string[];
        };
        DEPRECATED: {
            evidence: string[];
        };
        RETIRED: {
            evidence: string[];
        };
    };
    promotionRule: string;
    assets: ({
        assetId: string;
        kind: string;
        maturity: string;
        evidence: string[];
        mayPromote: boolean;
        reason: string;
    } | {
        assetId: string;
        kind: string;
        maturity: string;
        evidence: string[];
        mayPromote: boolean;
        reason?: undefined;
    })[];
};
export namespace MATURITY {
    namespace DRAFT {
        let evidence: string[];
    }
    namespace EXPERIMENTAL {
        let evidence_1: string[];
        export { evidence_1 as evidence };
    }
    namespace ACTIVE {
        let evidence_2: string[];
        export { evidence_2 as evidence };
    }
    namespace TESTED {
        let evidence_3: string[];
        export { evidence_3 as evidence };
    }
    namespace VALIDATED {
        let evidence_4: string[];
        export { evidence_4 as evidence };
    }
    namespace PROMOTED {
        let evidence_5: string[];
        export { evidence_5 as evidence };
    }
    namespace DEPRECATED {
        let evidence_6: string[];
        export { evidence_6 as evidence };
    }
    namespace RETIRED {
        let evidence_7: string[];
        export { evidence_7 as evidence };
    }
}
