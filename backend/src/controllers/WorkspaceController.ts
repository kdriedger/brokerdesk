import { Controller, Get } from "@nestjs/common";

import {
  getWorkspaceCarriers,
  getWorkspaceClients,
  getWorkspaceDashboard,
  getWorkspacePolicies,
  getWorkspaceQuotes,
  getWorkspaceReports,
} from "../providers/workspace";

@Controller("workspace")
export class WorkspaceController {
  @Get("dashboard")
  public dashboard() {
    return getWorkspaceDashboard();
  }

  @Get("clients")
  public clients() {
    return getWorkspaceClients();
  }

  @Get("quotes")
  public quotes() {
    return getWorkspaceQuotes();
  }

  @Get("policies")
  public policies() {
    return getWorkspacePolicies();
  }

  @Get("carriers")
  public carriers() {
    return getWorkspaceCarriers();
  }

  @Get("reports")
  public reports() {
    return getWorkspaceReports();
  }
}
