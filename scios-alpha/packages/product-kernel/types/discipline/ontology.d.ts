export function buildOperationalOntologyMap(): {
    schema: string;
    label: string;
    pattern: string;
    extends: string[];
    objectFamilies: {
        family: string;
        types: string[];
    }[];
    relationships: {
        type: string;
        from: string;
        to: string;
    }[];
    actions: {
        actionId: string;
        governed: boolean;
        runtimePath: string;
        note: string;
    }[];
    objectTypeCount: number;
    gaps: string[];
    status: string;
};
