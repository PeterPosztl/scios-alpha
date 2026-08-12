import type { ModelMeta } from "@scios/data-fabric";

export class InMemoryModelRegistry {
  private models = new Map<string, ModelMeta>();

  register(meta: ModelMeta): void {
    this.models.set(meta.modelId, meta);
  }

  get(modelId: string): ModelMeta | undefined {
    return this.models.get(modelId);
  }

  list(): ModelMeta[] {
    return Array.from(this.models.values());
  }
}

export const modelRegistry = new InMemoryModelRegistry();
