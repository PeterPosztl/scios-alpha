import {
  AuditEventSchema,
  type AuditEvent,
} from "@scios/data-fabric";

export type Role = "researcher" | "operator" | "risk_officer" | "admin";

export type Action =
  | "read_features"
  | "register_model"
  | "start_experiment"
  | "propose_order"
  | "execution:submit"
  | "approve_order"
  | "override_risk"
  | "manage_users"
  | "view_audit";

const MATRIX: Record<Role, ReadonlySet<Action>> = {
  researcher: new Set([
    "read_features",
    "register_model",
    "start_experiment",
    "view_audit",
  ]),
  operator: new Set([
    "read_features",
    "propose_order",
    "execution:submit",
    "view_audit",
  ]),
  risk_officer: new Set([
    "read_features",
    "approve_order",
    "override_risk",
    "view_audit",
  ]),
  admin: new Set([
    "read_features",
    "register_model",
    "start_experiment",
    "propose_order",
    "execution:submit",
    "approve_order",
    "override_risk",
    "manage_users",
    "view_audit",
  ]),
};

const auditLog: AuditEvent[] = [];

export function can(role: Role, action: Action): boolean {
  return MATRIX[role]?.has(action) ?? false;
}

export function audit(
  actor: string,
  action: string,
  target: string,
  metadata?: Record<string, unknown>
): AuditEvent[] {
  const event = AuditEventSchema.parse({
    actor,
    action,
    target,
    timestamp: new Date().toISOString(),
    ...(metadata ? { metadata } : {}),
  });
  auditLog.push(event);
  return [...auditLog];
}

export function getAuditLog(): AuditEvent[] {
  return [...auditLog];
}

export function clearAuditLog(): void {
  auditLog.length = 0;
}
