/**
 * @returns {{ ok: boolean, errors: Array<{code:string,detail:string}>, compiled: object|null }}
 */
export function compileProfessionalRegistry(): {
    ok: boolean;
    errors: Array<{
        code: string;
        detail: string;
    }>;
    compiled: object | null;
};
export function loadCompiledRegistryOrThrow(): any;
