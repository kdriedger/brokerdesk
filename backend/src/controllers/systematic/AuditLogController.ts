import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";

import { IBrokerDeskAuditLog } from "../../api/structures/BrokerDeskSystematicAuditLog";
import { IPage } from "../../api/structures/IPage";
import { getAuditLog, patchAuditLogs } from "../../providers/systematic/auditLogs";

@Controller("admin/audit-logs")
export class BrokerDeskSystematicAuditLogController {
  @TypedRoute.Patch()
  public async index(
    @TypedBody() body: IBrokerDeskAuditLog.IRequest,
  ): Promise<IPage<IBrokerDeskAuditLog.ISummary>> {
    return patchAuditLogs(body);
  }

  @TypedRoute.Get(":auditLogId")
  public async at(
    @TypedParam("auditLogId") auditLogId: string,
  ): Promise<IBrokerDeskAuditLog> {
    return getAuditLog(auditLogId);
  }
}
