import { createHash } from "node:crypto";
import type {
  LineageEdge,
  LineageNode,
  VerticalSliceStage,
} from "@scios/data-fabric";

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

type LineageNodeExt = LineageNode & { payloadDigest?: string };

/**
 * Append-only immutable lineage graph with hash chain.
 * In-memory only — durable store ABSENT / optional local file.
 */
export class ImmutableLineageStore {
  private readonly nodes: LineageNodeExt[] = [];
  private readonly edges: LineageEdge[] = [];
  private tipHash: string | null = null;

  appendNode(input: {
    nodeId: string;
    stage: VerticalSliceStage;
    refId: string;
    at: string;
    payload: unknown;
  }): LineageNodeExt {
    const prevHash = this.tipHash;
    const payloadDigest = sha256(JSON.stringify(input.payload));
    const hash = sha256(
      JSON.stringify({
        nodeId: input.nodeId,
        stage: input.stage,
        refId: input.refId,
        at: input.at,
        prevHash,
        payloadDigest,
      })
    );
    const node: LineageNodeExt = {
      nodeId: input.nodeId,
      stage: input.stage,
      refId: input.refId,
      at: input.at,
      hash,
      prevHash,
      payloadDigest,
    };
    this.nodes.push(node);
    this.tipHash = hash;
    return node;
  }

  link(fromNodeId: string, toNodeId: string): LineageEdge {
    const edge: LineageEdge = {
      edgeId: `e_${fromNodeId}_${toNodeId}`,
      fromNodeId,
      toNodeId,
      relation: "DERIVES",
    };
    this.edges.push(edge);
    return edge;
  }

  snapshot(): {
    nodes: LineageNodeExt[];
    edges: LineageEdge[];
    tipHash: string | null;
  } {
    return {
      nodes: [...this.nodes],
      edges: [...this.edges],
      tipHash: this.tipHash,
    };
  }

  /**
   * Verify hash chain: recompute each node hash from canonical fields +
   * payloadDigest, and verify prevHash adjacency.
   */
  verify(): { ok: boolean; brokenAt?: string; mode: string } {
    let prev: string | null = null;
    for (const n of this.nodes) {
      if (n.prevHash !== prev) {
        return { ok: false, brokenAt: n.nodeId, mode: "prevHash_chain" };
      }
      const digest = n.payloadDigest;
      if (!digest) {
        return {
          ok: false,
          brokenAt: n.nodeId,
          mode: "missing_payload_digest",
        };
      }
      const recomputed = sha256(
        JSON.stringify({
          nodeId: n.nodeId,
          stage: n.stage,
          refId: n.refId,
          at: n.at,
          prevHash: n.prevHash,
          payloadDigest: digest,
        })
      );
      if (recomputed !== n.hash) {
        return { ok: false, brokenAt: n.nodeId, mode: "hash_recompute" };
      }
      prev = n.hash;
    }
    return { ok: true, mode: "hash_recompute+prevHash" };
  }
}
