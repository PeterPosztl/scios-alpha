import {
  STATUS,
  buildShellRegistry,
  buildApplicationRegistry,
  buildWorkspaceRegistry,
  buildServiceRegistry,
  buildCommandRegistry,
  buildNotificationModel,
  buildJobModel,
  buildEnvironmentObjectModel,
} from "./registries.js";

export class OsEnvironment {
  constructor() {
    this.shell = buildShellRegistry();
    this.applications = buildApplicationRegistry();
    this.workspaces = buildWorkspaceRegistry();
    this.services = buildServiceRegistry();
    this.commands = buildCommandRegistry();
    this.notifications = buildNotificationModel();
    this.jobs = buildJobModel();
    this.objects = buildEnvironmentObjectModel();
  }

  snapshot() {
    return {
      schema: "sci-os-environment-snapshot/v1",
      label: "ALPHA_NON_PRODUCTION",
      at: new Date().toISOString(),
      shellId: this.shell.shellId,
      appCount: this.applications.apps.length,
      availableApps: this.applications.apps.filter((a) => a.status === "AVAILABLE")
        .length,
      commandCount: this.commands.commands.length,
      serviceCount: this.services.services.length,
      statusSemantics: Object.values(STATUS),
    };
  }
}

export {
  STATUS,
  buildShellRegistry,
  buildApplicationRegistry,
  buildWorkspaceRegistry,
  buildServiceRegistry,
  buildCommandRegistry,
  buildNotificationModel,
  buildJobModel,
  buildEnvironmentObjectModel,
};
