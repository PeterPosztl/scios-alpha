/**
 * Seeded PRNG — deterministic adapters.
 * Non-cryptographic. Label: ALPHA / NON-PRODUCTION.
 */
export class SeededRng {
  private state: number;

  constructor(seed = 42) {
    this.state = seed >>> 0;
  }

  next(): number {
    let x = this.state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x >>> 0;
    return (this.state >>> 0) / 0xffffffff;
  }

  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }
}
