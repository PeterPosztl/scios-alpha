/**
 * Adapter scaffold — @scios/meta-recovery
 * Implements our_api hooks (IFeatureStoreAdapter).
 * NOT PRODUCTION — implement + prove before integration.
 */
export class Adapter {
  /** @label ALPHA_NON_PRODUCTION */
  adapt(_input: unknown): { status: "UNKNOWN"; reason: string } {
    return { status: "UNKNOWN", reason: "implement our_api hooks here — evidence required" };
  }
}
