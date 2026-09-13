import { createHash, randomBytes, randomUUID } from "node:crypto";

import { HttpException } from "@nestjs/common";

import {
  IBrokerDeskAdmin,
  IBrokerDeskAdminSession,
} from "../../api/structures/BrokerDeskActorsAdmin";
import { IPage } from "../../api/structures/IPage";
import { MyGlobal } from "../../MyGlobal";
import { toAdmin, toAdminSessionSummary } from "../../transformers/admin";
import {
  defaultSettings,
  toOrganizationSummary,
} from "../../transformers/organization";
import { JwtUtil } from "../../utils/JwtUtil";
import { pageArgs, pageOf } from "../../utils/pagination";
import { PasswordUtil } from "../../utils/PasswordUtil";

const ACCESS_MS = 30 * 60 * 1000;
const SESSION_MS = 14 * 24 * 60 * 60 * 1000;
const RESET_MS = 60 * 60 * 1000;

const adminInclude = {
  organization: true,
  sessions: { orderBy: { created_at: "desc" as const }, take: 20 },
};

const requireAdmin = async () => {
  const token = JwtUtil.bearer();
  if (!token) throw new HttpException("Unauthorized", 401);
  const payload = JwtUtil.verify(token, "access");
  if (payload.typ !== "admin") throw new HttpException("Forbidden", 403);
  const admin = await MyGlobal.prisma.broker_desk_admins.findFirst({
    where: { id: payload.aid, deleted_at: null },
    include: adminInclude,
  });
  if (!admin || !admin.active) throw new HttpException("Unauthorized", 401);
  const session = await MyGlobal.prisma.broker_desk_admin_sessions.findFirst({
    where: { id: payload.sid, broker_desk_admin_id: admin.id },
  });
  if (!session || session.expired_at.getTime() <= Date.now())
    throw new HttpException("Unauthorized", 401);
  return { admin, session, payload };
};

const issueFor = async (adminId: string, sessionId: string, orgId: string) => {
  const admin = await MyGlobal.prisma.broker_desk_admins.findFirstOrThrow({
    where: { id: adminId },
    include: adminInclude,
  });
  return {
    admin: toAdmin(admin),
    token: JwtUtil.issue({
      typ: "admin",
      aid: adminId,
      sid: sessionId,
      oid: orgId,
    }),
  };
};

const hashToken = (token: string): string =>
  createHash("sha256").update(token).digest("hex");

export const postAuthAdminJoin = async (
  body: IBrokerDeskAdmin.IJoin,
): Promise<IBrokerDeskAdmin.IAuthorized> => {
  const existing = await MyGlobal.prisma.broker_desk_admins.findFirst({
    where: { email: body.email },
  });
  if (existing) throw new HttpException("Email already registered", 409);

  const now = new Date();
  const ctx = MyGlobal.request();
  const orgId = randomUUID();
  const adminId = randomUUID();
  const sessionId = randomUUID();
  const settings = JSON.stringify(body.organization.settings ?? defaultSettings());

  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.broker_desk_organizations.create({
      data: {
        id: orgId,
        legal_name: body.organization.legal_name,
        operating_name: body.organization.operating_name ?? null,
        primary_province: body.organization.primary_province,
        phone: body.organization.phone ?? null,
        hst_gst_number: body.organization.hst_gst_number ?? null,
        default_currency: "CAD",
        settings,
        address_line1: body.organization.address_line1 ?? null,
        address_line2: body.organization.address_line2 ?? null,
        city: body.organization.city ?? null,
        province: body.organization.province ?? null,
        postal_code: body.organization.postal_code ?? null,
        created_at: now,
        updated_at: now,
      },
    });
    await tx.broker_desk_admins.create({
      data: {
        id: adminId,
        broker_desk_organization_id: orgId,
        email: body.email,
        password_hash: PasswordUtil.hash(body.password),
        display_name: body.display_name,
        active: true,
        created_at: now,
        updated_at: now,
      },
    });
    await tx.broker_desk_admin_sessions.create({
      data: {
        id: sessionId,
        broker_desk_admin_id: adminId,
        ip: ctx.ip,
        href: ctx.href,
        referrer: ctx.referrer,
        created_at: now,
        expired_at: new Date(now.getTime() + SESSION_MS),
      },
    });
  });

  return issueFor(adminId, sessionId, orgId);
};

export const postAuthAdminLogin = async (
  body: IBrokerDeskAdmin.ILogin,
): Promise<IBrokerDeskAdmin.IAuthorized> => {
  const admin = await MyGlobal.prisma.broker_desk_admins.findFirst({
    where: { email: body.email, deleted_at: null },
  });
  if (!admin || !PasswordUtil.equals(body.password, admin.password_hash))
    throw new HttpException("Invalid credentials", 401);
  if (!admin.active) throw new HttpException("Account deactivated", 403);

  const now = new Date();
  const ctx = MyGlobal.request();
  const session = await MyGlobal.prisma.broker_desk_admin_sessions.create({
    data: {
      id: randomUUID(),
      broker_desk_admin_id: admin.id,
      ip: ctx.ip,
      href: ctx.href,
      referrer: ctx.referrer,
      created_at: now,
      expired_at: new Date(now.getTime() + SESSION_MS),
    },
  });
  return issueFor(admin.id, session.id, admin.broker_desk_organization_id);
};

export const postAuthAdminRefresh = async (
  body: IBrokerDeskAdmin.IRefresh,
): Promise<IBrokerDeskAdmin.IAuthorized> => {
  const payload = JwtUtil.verify(body.refresh_token, "refresh");
  if (payload.typ !== "admin") throw new HttpException("Forbidden", 403);
  const admin = await MyGlobal.prisma.broker_desk_admins.findFirst({
    where: { id: payload.aid, deleted_at: null },
  });
  if (!admin || !admin.active) throw new HttpException("Unauthorized", 401);
  const session = await MyGlobal.prisma.broker_desk_admin_sessions.findFirst({
    where: { id: payload.sid, broker_desk_admin_id: admin.id },
  });
  if (!session || session.expired_at.getTime() <= Date.now())
    throw new HttpException("Unauthorized", 401);
  await MyGlobal.prisma.broker_desk_admin_sessions.update({
    where: { id: session.id },
    data: { expired_at: new Date(Date.now() + SESSION_MS) },
  });
  return issueFor(admin.id, session.id, admin.broker_desk_organization_id);
};

export const postAuthAdminPasswordResetRequest = async (
  body: IBrokerDeskAdmin.IRequestPasswordReset,
): Promise<void> => {
  const admin = await MyGlobal.prisma.broker_desk_admins.findFirst({
    where: { email: body.email, deleted_at: null, active: true },
  });
  if (!admin) return;
  const token = randomBytes(24).toString("hex");
  const now = new Date();
  await MyGlobal.prisma.broker_desk_admin_password_resets.create({
    data: {
      id: randomUUID(),
      broker_desk_admin_id: admin.id,
      token_hash: hashToken(token),
      expired_at: new Date(now.getTime() + RESET_MS),
      created_at: now,
    },
  });
  if (process.env.NODE_ENV !== "production")
    console.log(`[dev] admin password reset token for ${admin.email}: ${token}`);
};

export const postAuthAdminPasswordResetConfirm = async (
  body: IBrokerDeskAdmin.IConfirmPasswordReset,
): Promise<void> => {
  const row = await MyGlobal.prisma.broker_desk_admin_password_resets.findFirst({
    where: { token_hash: hashToken(body.token) },
  });
  if (
    !row ||
    row.consumed_at !== null ||
    row.expired_at.getTime() <= Date.now()
  )
    throw new HttpException("Invalid or expired token", 400);
  const now = new Date();
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.broker_desk_admins.update({
      where: { id: row.broker_desk_admin_id },
      data: {
        password_hash: PasswordUtil.hash(body.new_password),
        updated_at: now,
      },
    }),
    MyGlobal.prisma.broker_desk_admin_password_resets.update({
      where: { id: row.id },
      data: { consumed_at: now },
    }),
  ]);
};

export const postAuthAdminEmailVerifyRequest = async (
  body: IBrokerDeskAdmin.IRequestEmailVerification,
): Promise<void> => {
  const admin = await MyGlobal.prisma.broker_desk_admins.findFirst({
    where: { email: body.email, deleted_at: null },
  });
  if (!admin) return;
  const token = randomBytes(24).toString("hex");
  const now = new Date();
  await MyGlobal.prisma.broker_desk_admin_email_verifications.create({
    data: {
      id: randomUUID(),
      broker_desk_admin_id: admin.id,
      email: body.email,
      token: hashToken(token),
      created_at: now,
      expires_at: new Date(now.getTime() + RESET_MS),
    },
  });
  if (process.env.NODE_ENV !== "production")
    console.log(`[dev] admin email verify token for ${body.email}: ${token}`);
};

export const postAuthAdminEmailVerifyConfirm = async (
  body: IBrokerDeskAdmin.IConfirmEmailVerification,
): Promise<void> => {
  const row =
    await MyGlobal.prisma.broker_desk_admin_email_verifications.findFirst({
      where: { token: hashToken(body.token), email: body.email },
    });
  if (
    !row ||
    row.consumed_at !== null ||
    row.expires_at.getTime() <= Date.now()
  )
    throw new HttpException("Invalid or expired token", 400);
  await MyGlobal.prisma.broker_desk_admin_email_verifications.update({
    where: { id: row.id },
    data: { consumed_at: new Date() },
  });
};

export const patchAuthAdminSessions = async (
  body: IBrokerDeskAdminSession.IRequest,
): Promise<IPage<IBrokerDeskAdminSession.ISummary>> => {
  const { admin } = await requireAdmin();
  const { page, limit, skip } = pageArgs(body);
  const where = { broker_desk_admin_id: admin.id };
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.broker_desk_admin_sessions.count({ where }),
    MyGlobal.prisma.broker_desk_admin_sessions.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
  ]);
  return pageOf(rows.map(toAdminSessionSummary), total, page, limit);
};

export const getAuthAdminMe = async (): Promise<IBrokerDeskAdmin> => {
  const { admin } = await requireAdmin();
  return toAdmin(admin);
};

export const putAuthAdminMe = async (
  body: IBrokerDeskAdmin.IUpdate,
): Promise<IBrokerDeskAdmin> => {
  const { admin } = await requireAdmin();
  const updated = await MyGlobal.prisma.broker_desk_admins.update({
    where: { id: admin.id },
    data: {
      email: body.email ?? undefined,
      display_name: body.display_name ?? undefined,
      active: body.active ?? undefined,
      updated_at: new Date(),
    },
    include: adminInclude,
  });
  if (body.active === false) {
    await MyGlobal.prisma.broker_desk_admin_sessions.updateMany({
      where: {
        broker_desk_admin_id: admin.id,
        expired_at: { gt: new Date() },
      },
      data: { expired_at: new Date() },
    });
  }
  return toAdmin(updated);
};

export { requireAdmin, toOrganizationSummary, ACCESS_MS };
