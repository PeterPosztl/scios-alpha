/**
 * EvidenceGraphEngine — Wave 1 vertical slice (honest ALPHA).
 * No evidence ⇒ UNKNOWN, never PASS.
 */

export type EvidenceKind =
  | "source_inspection"
  | "test_execution"
  | "build_execution"
  | "static_analysis"
  | "runtime_health"
  | "benchmark"
  | "scientific_validation"
  | "security_validation"
  | "user_acceptance"
  | "external_dependency"
  | "release_approval";

export type ClaimVerdict = "PASS" | "FAIL" | "UNKNOWN" | "DEGRADED";

export interface EvidenceRecord {
  id: string;
  kind: EvidenceKind;
  subject: string;
  at: string;
  buildSha?: string;
  payload: unknown;
  immutableRef?: string;
}

export interface Claim {
  id: string;
  statement: string;
  subject: string;
  evidenceIds: string[];
  verdict: ClaimVerdict;
  reason: string;
}

export class EvidenceGraphEngine {
  private evidence = new Map<string, EvidenceRecord>();
  private claims = new Map<string, Claim>();

  addEvidence(e: EvidenceRecord): void {
    this.evidence.set(e.id, e);
  }

  assertClaim(input: {
    id: string;
    statement: string;
    subject: string;
    evidenceIds: string[];
    requireKinds?: EvidenceKind[];
  }): Claim {
    const found = input.evidenceIds
      .map((id) => this.evidence.get(id))
      .filter((x): x is EvidenceRecord => Boolean(x));

    if (found.length === 0) {
      const claim: Claim = {
        id: input.id,
        statement: input.statement,
        subject: input.subject,
        evidenceIds: input.evidenceIds,
        verdict: "UNKNOWN",
        reason: "no_evidence",
      };
      this.claims.set(claim.id, claim);
      return claim;
    }

    if (input.requireKinds) {
      const kinds = new Set(found.map((e) => e.kind));
      const missing = input.requireKinds.filter((k) => !kinds.has(k));
      if (missing.length > 0) {
        const claim: Claim = {
          id: input.id,
          statement: input.statement,
          subject: input.subject,
          evidenceIds: input.evidenceIds,
          verdict: "UNKNOWN",
          reason: `missing_evidence_kinds:${missing.join(",")}`,
        };
        this.claims.set(claim.id, claim);
        return claim;
      }
    }

    const claim: Claim = {
      id: input.id,
      statement: input.statement,
      subject: input.subject,
      evidenceIds: input.evidenceIds,
      verdict: "PASS",
      reason: "evidence_present",
    };
    this.claims.set(claim.id, claim);
    return claim;
  }

  getClaim(id: string): Claim | undefined {
    return this.claims.get(id);
  }

  listClaims(): Claim[] {
    return [...this.claims.values()];
  }

  listEvidence(): EvidenceRecord[] {
    return [...this.evidence.values()];
  }

  exportGraph() {
    return {
      evidence: this.listEvidence(),
      claims: this.listClaims(),
      rule: "No evidence means UNKNOWN, never PASS",
    };
  }
}
