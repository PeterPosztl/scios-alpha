export function listFamilyOverlays(): ({
    famId: string;
    id: string;
    archetypeId: string;
    primaryObject: string;
    queue: string;
    inputAdapters: string[];
    eventTypes: string[];
    ohlc: boolean;
    marketRef: boolean;
    newsEvent: boolean;
    predictionMeaning: string;
    decisionSet: string[];
    charts: string[];
    evidenceRules: string;
    ribbonEmphasis: string;
    skip: boolean;
    archetypeOnly?: undefined;
    extraArchetypeId?: undefined;
} | {
    famId: string;
    id: string;
    archetypeId: string;
    primaryObject: string;
    queue: string;
    inputAdapters: string[];
    eventTypes: string[];
    ohlc: boolean;
    marketRef: boolean;
    newsEvent: boolean;
    predictionMeaning: string;
    decisionSet: string[];
    charts: string[];
    evidenceRules: string;
    ribbonEmphasis: string;
    skip: boolean;
    archetypeOnly: boolean;
    extraArchetypeId: string;
})[];
export function familyOverlayById(familyId: any): {
    famId: string;
    id: string;
    archetypeId: string;
    primaryObject: string;
    queue: string;
    inputAdapters: string[];
    eventTypes: string[];
    ohlc: boolean;
    marketRef: boolean;
    newsEvent: boolean;
    predictionMeaning: string;
    decisionSet: string[];
    charts: string[];
    evidenceRules: string;
    ribbonEmphasis: string;
    skip: boolean;
    archetypeOnly?: undefined;
    extraArchetypeId?: undefined;
} | {
    famId: string;
    id: string;
    archetypeId: string;
    primaryObject: string;
    queue: string;
    inputAdapters: string[];
    eventTypes: string[];
    ohlc: boolean;
    marketRef: boolean;
    newsEvent: boolean;
    predictionMeaning: string;
    decisionSet: string[];
    charts: string[];
    evidenceRules: string;
    ribbonEmphasis: string;
    skip: boolean;
    archetypeOnly: boolean;
    extraArchetypeId: string;
};
export function ohlcAllowedForFamily(familyId: any): boolean;
export function composeProfessionBlueprint(roleId: any): {
    schema: string;
    label: string;
    roleId: any;
    name: any;
    domainFamily: any;
    inherit: string;
    archetypeId: string;
    status: string;
    specialist: boolean;
    deltas: {};
    inventedSops: boolean;
    honesty: {
        autoTrade: boolean;
        ready: boolean;
        durable: boolean;
        execution: boolean;
        pgDriver: string;
        calibratedLive: boolean;
        inventedSops: boolean;
        liveDomainData: boolean;
        secondShell: boolean;
        roles200Validated: boolean;
    };
    domain: {
        primaryObject: string;
        inputAdapters: string[];
        eventTypes: string[];
    };
    family: {
        famId: string;
        id: string;
        primaryObject: string;
        queue: string;
        ohlc: boolean;
        marketRef: boolean;
        newsEvent: boolean;
        predictionMeaning: string;
        decisionSet: string[];
        charts: string[];
        evidenceRules: string;
        ribbonEmphasis: string;
        skip: boolean;
    };
    ontology: {
        chain: string;
        relationSpine: string;
        roleEvaluates: string;
        nationalGraph: boolean;
        causalQueryEngine: string;
    };
    lineage: {
        path: string;
        verified: string;
    };
    evidence: {
        verdictDefault: string;
        verdictsAllowed: string[];
        rules: string;
    };
    engine: {
        prediction: string;
        risk: string;
        decision: string;
        sim: string;
        lineage: string;
        evidence: string;
        compute: string;
    };
    reporting: {
        empty: string;
    };
    governance: {
        autoExecute: boolean;
        requiresHuman: boolean;
    };
    gw: {
        GW1: string;
        GW2_GW7: string;
    };
    ledger: {
        actor: string;
        persisted: boolean;
        durable: boolean;
    };
    ribbon: {
        stages: string[];
        emphasis: string;
    };
};
export function listProfessionBlueprints(): {
    schema: string;
    label: string;
    roleId: any;
    name: any;
    domainFamily: any;
    inherit: string;
    archetypeId: string;
    status: string;
    specialist: boolean;
    deltas: {};
    inventedSops: boolean;
    honesty: {
        autoTrade: boolean;
        ready: boolean;
        durable: boolean;
        execution: boolean;
        pgDriver: string;
        calibratedLive: boolean;
        inventedSops: boolean;
        liveDomainData: boolean;
        secondShell: boolean;
        roles200Validated: boolean;
    };
    domain: {
        primaryObject: string;
        inputAdapters: string[];
        eventTypes: string[];
    };
    family: {
        famId: string;
        id: string;
        primaryObject: string;
        queue: string;
        ohlc: boolean;
        marketRef: boolean;
        newsEvent: boolean;
        predictionMeaning: string;
        decisionSet: string[];
        charts: string[];
        evidenceRules: string;
        ribbonEmphasis: string;
        skip: boolean;
    };
    ontology: {
        chain: string;
        relationSpine: string;
        roleEvaluates: string;
        nationalGraph: boolean;
        causalQueryEngine: string;
    };
    lineage: {
        path: string;
        verified: string;
    };
    evidence: {
        verdictDefault: string;
        verdictsAllowed: string[];
        rules: string;
    };
    engine: {
        prediction: string;
        risk: string;
        decision: string;
        sim: string;
        lineage: string;
        evidence: string;
        compute: string;
    };
    reporting: {
        empty: string;
    };
    governance: {
        autoExecute: boolean;
        requiresHuman: boolean;
    };
    gw: {
        GW1: string;
        GW2_GW7: string;
    };
    ledger: {
        actor: string;
        persisted: boolean;
        durable: boolean;
    };
    ribbon: {
        stages: string[];
        emphasis: string;
    };
}[];
export function professionBlueprintCatalog(): {
    schema: string;
    label: string;
    honesty: {
        autoTrade: boolean;
        ready: boolean;
        durable: boolean;
        execution: boolean;
        pgDriver: string;
        calibratedLive: boolean;
        inventedSops: boolean;
        liveDomainData: boolean;
        secondShell: boolean;
        roles200Validated: boolean;
    };
    rolesSeeded: number;
    familyOverlays: number;
    familiesJson: number;
    archetypesDefined: number;
    specialistInheritOnly: number;
    namedRoles: number;
    roles200Validated: boolean;
    inventedSops: boolean;
    ohlcFamilies: string[];
    skippedFamilies: string[];
    engine: {
        prediction: string;
        risk: string;
        decision: string;
        sim: string;
        lineage: string;
        evidence: string;
        compute: string;
    };
    note: string;
};
export function composeFamilyUxV3(familyId: any): {
    schema: string;
    label: string;
    id: any;
    famId: any;
    status: string;
    skip: boolean;
    ohlc: boolean;
    marketRef: boolean;
    newsEvent: boolean;
    charts: any[];
    ribbonEmphasis: string;
    evidenceRules: string;
    decisionSet: any[];
    stub: boolean;
    honesty: {
        autoTrade: boolean;
        ready: boolean;
        durable: boolean;
        execution: boolean;
        pgDriver: string;
        calibratedLive: boolean;
        inventedSops: boolean;
        liveDomainData: boolean;
        secondShell: boolean;
        roles200Validated: boolean;
    };
    predictionMeaning?: undefined;
    queue?: undefined;
} | {
    schema: string;
    label: string;
    id: string;
    famId: string;
    status: string;
    skip: boolean;
    ohlc: boolean;
    marketRef: boolean;
    newsEvent: boolean;
    charts: string[];
    ribbonEmphasis: string;
    evidenceRules: string;
    decisionSet: string[];
    stub: any;
    predictionMeaning: string;
    queue: string;
    honesty: {
        autoTrade: boolean;
        ready: boolean;
        durable: boolean;
        execution: boolean;
        pgDriver: string;
        calibratedLive: boolean;
        inventedSops: boolean;
        liveDomainData: boolean;
        secondShell: boolean;
        roles200Validated: boolean;
    };
};
export function composeHeroV3(roleId: any): {
    schema: string;
    label: string;
    roleId: any;
    requestedRoleId: any;
    name: any;
    familyOverline: any;
    queue: any;
    family: {
        schema: string;
        label: string;
        id: any;
        famId: any;
        status: string;
        skip: boolean;
        ohlc: boolean;
        marketRef: boolean;
        newsEvent: boolean;
        charts: any[];
        ribbonEmphasis: string;
        evidenceRules: string;
        decisionSet: any[];
        stub: boolean;
        honesty: {
            autoTrade: boolean;
            ready: boolean;
            durable: boolean;
            execution: boolean;
            pgDriver: string;
            calibratedLive: boolean;
            inventedSops: boolean;
            liveDomainData: boolean;
            secondShell: boolean;
            roles200Validated: boolean;
        };
        predictionMeaning?: undefined;
        queue?: undefined;
    } | {
        schema: string;
        label: string;
        id: string;
        famId: string;
        status: string;
        skip: boolean;
        ohlc: boolean;
        marketRef: boolean;
        newsEvent: boolean;
        charts: string[];
        ribbonEmphasis: string;
        evidenceRules: string;
        decisionSet: string[];
        stub: any;
        predictionMeaning: string;
        queue: string;
        honesty: {
            autoTrade: boolean;
            ready: boolean;
            durable: boolean;
            execution: boolean;
            pgDriver: string;
            calibratedLive: boolean;
            inventedSops: boolean;
            liveDomainData: boolean;
            secondShell: boolean;
            roles200Validated: boolean;
        };
    };
    layout: {
        page: {
            bg: string;
            padPx: number;
        };
        section: {
            padPx: number;
        };
        card: {
            surface: boolean;
            fogBorder: boolean;
            iceLeftPx: number;
            padPx: number;
        };
        grid: {
            columns: number;
            gutterPx: number;
            maxPx: number;
        };
        density: string[];
        motion: {
            microMs: number;
            sciMs: number;
            macroMs: number;
            criticalMs: number;
        };
    };
    ribbon: {
        stages: string[];
        emphasis: any;
    };
    missionPanels: {
        id: string;
        span: string;
        module: string;
    }[];
    missionCopy: {
        forecast: any;
        horizon: string;
        threatGate: string;
        governance: string;
        simulator: string;
        proofTimeline: string;
        chainOfTruth: string;
        opsIntel: any;
        jtbd: any;
    };
    charts: any[];
    decisionGate: {
        decisionSet: any;
        approveDisabledIfReject: boolean;
        autoExecute: boolean;
        tone: string;
    };
    simulation: {
        simulated: boolean;
        executed: boolean;
    };
    lineage: {
        verified: string;
    };
    evidence: {
        verdictDefault: string;
        emptyMeans: string;
    };
    reporting: {
        empty: string;
    };
    honesty: {
        autoTrade: boolean;
        ready: boolean;
        durable: boolean;
        execution: boolean;
        pgDriver: string;
        calibratedLive: boolean;
        inventedSops: boolean;
        liveDomainData: boolean;
        secondShell: boolean;
        roles200Validated: boolean;
    };
    inventedSops: boolean;
    specialist: boolean;
    status: string;
    roles200Validated: boolean;
    roleSwitchMotionMs: number;
    ohlc: boolean;
    skip: boolean;
    stub: any;
    overlayOnly: boolean;
    ledger: {
        actor: string;
        persisted: boolean;
        durable: boolean;
    };
    engine: {
        prediction: string;
        risk: string;
        decision: string;
        sim: string;
        lineage: string;
        evidence: string;
        compute: string;
    };
};
export function listFamilyUxV3(): ({
    schema: string;
    label: string;
    id: any;
    famId: any;
    status: string;
    skip: boolean;
    ohlc: boolean;
    marketRef: boolean;
    newsEvent: boolean;
    charts: any[];
    ribbonEmphasis: string;
    evidenceRules: string;
    decisionSet: any[];
    stub: boolean;
    honesty: {
        autoTrade: boolean;
        ready: boolean;
        durable: boolean;
        execution: boolean;
        pgDriver: string;
        calibratedLive: boolean;
        inventedSops: boolean;
        liveDomainData: boolean;
        secondShell: boolean;
        roles200Validated: boolean;
    };
    predictionMeaning?: undefined;
    queue?: undefined;
} | {
    schema: string;
    label: string;
    id: string;
    famId: string;
    status: string;
    skip: boolean;
    ohlc: boolean;
    marketRef: boolean;
    newsEvent: boolean;
    charts: string[];
    ribbonEmphasis: string;
    evidenceRules: string;
    decisionSet: string[];
    stub: any;
    predictionMeaning: string;
    queue: string;
    honesty: {
        autoTrade: boolean;
        ready: boolean;
        durable: boolean;
        execution: boolean;
        pgDriver: string;
        calibratedLive: boolean;
        inventedSops: boolean;
        liveDomainData: boolean;
        secondShell: boolean;
        roles200Validated: boolean;
    };
})[];
export function masterExecutionBox(): {
    schema: string;
    label: string;
    ready: boolean;
    autoTrade: boolean;
    durable: boolean;
    execution: boolean;
    pgDriver: string;
    catalog: {
        schema: string;
        label: string;
        honesty: {
            autoTrade: boolean;
            ready: boolean;
            durable: boolean;
            execution: boolean;
            pgDriver: string;
            calibratedLive: boolean;
            inventedSops: boolean;
            liveDomainData: boolean;
            secondShell: boolean;
            roles200Validated: boolean;
        };
        rolesSeeded: number;
        familyOverlays: number;
        familiesJson: number;
        archetypesDefined: number;
        specialistInheritOnly: number;
        namedRoles: number;
        roles200Validated: boolean;
        inventedSops: boolean;
        ohlcFamilies: string[];
        skippedFamilies: string[];
        engine: {
            prediction: string;
            risk: string;
            decision: string;
            sim: string;
            lineage: string;
            evidence: string;
            compute: string;
        };
        note: string;
    };
    familyUxCount: number;
    heroCount: number;
    roles200Validated: boolean;
    inventedSops: boolean;
    checklist: {
        legend: string;
        verifier: string;
        backend: {
            professionBlueprintV1: string;
            inst200: string;
            fam21: string;
            familyUxV3: string;
            heroV3: string;
            missionPanels: string;
            ledgerActor: string;
            engineRoutes: {
                prediction: string;
                risk: string;
                decision: string;
                sim: string;
                lineage: string;
                evidence: string;
                compute: string;
            };
            engineRoutesWired: string;
            dataFabricObjects: string;
            lineageHash: string;
            evidenceChain: string;
        };
        frontend: {
            tokens: string;
            primitivesSci: string;
            analyze12col: string;
            ribbonStateMachine: string;
            missionPanels: string;
            truthGraph: string;
            familyUxV3: string;
            heroV3: string;
            i18nHonesty: string;
        };
    };
    skipped: {
        hospitality: string;
        healthcare: string;
        fam11: string;
        fam18: string;
        fam20: string;
    };
    note: string;
};
export const PROFESSION_BLUEPRINT_SCHEMA: "sci-os-profession-blueprint/v1";
export const ALPHA_LABEL: "ALPHA_NON_PRODUCTION";
export namespace PROFESSION_BLUEPRINT_HONESTY {
    let autoTrade: boolean;
    let ready: boolean;
    let durable: boolean;
    let execution: boolean;
    let pgDriver: string;
    let calibratedLive: boolean;
    let inventedSops: boolean;
    let liveDomainData: boolean;
    let secondShell: boolean;
    let roles200Validated: boolean;
}
export const RIBBON_STAGES: string[];
export namespace ENGINE_BINDINGS {
    let prediction: string;
    let risk: string;
    let decision: string;
    let sim: string;
    let lineage: string;
    let evidence: string;
    let compute: string;
}
export namespace LAYOUT_ALGEBRA_V3 {
    namespace page {
        let bg: string;
        let padPx: number;
    }
    namespace section {
        let padPx_1: number;
        export { padPx_1 as padPx };
    }
    namespace card {
        export let surface: boolean;
        export let fogBorder: boolean;
        export let iceLeftPx: number;
        let padPx_2: number;
        export { padPx_2 as padPx };
    }
    namespace grid {
        let columns: number;
        let gutterPx: number;
        let maxPx: number;
    }
    let density: string[];
    namespace motion {
        let microMs: number;
        let sciMs: number;
        let macroMs: number;
        let criticalMs: number;
    }
}
export const MISSION_PANELS_V3: {
    id: string;
    span: string;
    module: string;
}[];
export const MASTER_BOX_VERIFIER: "scripts/tests/master-execution-box-verify.cjs";
