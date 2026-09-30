/**
 * Canonical object identity — one logical object → one id across SCI OS.
 * ALPHA_NON_PRODUCTION
 */
export function canonicalId(type: any, key: any): string;
export function createObjectShell(type: any, key: any, extra?: {}): {
    id: string;
    type: any;
    version: any;
    title: any;
    status: any;
    createdAt: any;
    updatedAt: any;
    asOf: any;
    owner: any;
    source: any;
    permissions: any;
    relationships: any;
    evidenceRefs: any;
    lineageRefs: any;
};
export class IdentityResolver {
    aliases: Map<any, any>;
    register(canonical: any, aliasList?: any[]): void;
    resolve(anyId: any): any;
}
