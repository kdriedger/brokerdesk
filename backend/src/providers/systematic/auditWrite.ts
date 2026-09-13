import { randomUUID } from "node:crypto";

import { HttpException } from "@nestjs/common";

import {
  EBrokerDeskAuditAction,
  EBrokerDeskAuditEntityType,
} from "../../api/structures/BrokerDeskSystematicAuditLog";
import { MyGlobal } from "../../MyGlobal";

export const writeAdminAudit = async (args: {
  orgId: string;
  adminId: string;
  sessionId: string;
  action: EBrokerDeskAuditAction;
  entityType: EBrokerDeskAuditEntityType;
  entityRefId: string;
  before?: unknown;
  after?: unknown;
}): Promise<void> => {
  const now = new Date();
  const id = randomUUID();
  await MyGlobal.prisma.broker_desk_audit_logs.create({
    data: {
      id,
      broker_desk_organization_id: args.orgId,
      actor_type: "admin",
      action: args.action,
      entity_type: args.entityType,
      entity_ref_id: args.entityRefId,
      before_data:
        args.before === undefined ? null : JSON.stringify(args.before),
      after_data: args.after === undefined ? null : JSON.stringify(args.after),
      created_at: now,
      adminAttribution: {
        create: {
          id: randomUUID(),
          broker_desk_admin_id: args.adminId,
          broker_desk_admin_session_id: args.sessionId,
          created_at: now,
        },
      },
    },
  });
};

export const isPrismaCode = (error: unknown, code: string): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code: unknown }).code === code;
