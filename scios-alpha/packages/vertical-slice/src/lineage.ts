import { createHash } from "node:crypto";
import type {
  LineageEdge,
  LineageNode,
  VerticalSliceStage,
} from "@scios/data-fabric";

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/**
 * Append-only immutable lineage graph with hash chain.
 * In-memory only — durable store ABSENT.
 */
export class ImmutableLineageStore {
  private readonly nodes: LineageNode[] = [];
  private readonly edges: LineageEdge[] = [];
  private tipHash: string | null = null;

  appendNode(input: {
    nodeId: string;
    stage: VerticalSliceStage;
    refId: string;
    at: string;
    payload: unknown;
  }): LineageNode {
    const prevHash = this.tipHash;
    const hash = sha256(
      JSON.stringify({
        nodeId: input.nodeId,
        stage: input.stage,
        refId: input.refId,
        at: input.at,
        prevHash,
        payload: input.payload,
      })
    );
    const node: LineageNode = {
      nodeId: input.nodeId,
      stage: input.stage,
      refId: input.refId,
      at: input.at,
      hash,
      prevHash,
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

  snapshot(): { nodes: LineageNode[]; edges: LineageEdge[]; tipHash: string | null } {
    return {
      nodes: [...this.nodes],
      edges: [...this.edges],
      tipHash: this.tipHash,
    };
  }

  /** Verify hash chain integrity (immutable proof). */
  verify(): { ok: boolean; brokenAt?: string } {
    let prev: string | null = null;
    for (const n of this.nodes) {
      if (n.prevHash !== prev) {
        return { ok: false, brokenAt: n.nodeId };
      }
      prev = n.hash;
    }
    return { ok: true };
  }
}

