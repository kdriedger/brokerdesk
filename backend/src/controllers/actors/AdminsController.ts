import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import { tags } from "typia";

import { IBrokerDeskAdmin } from "../../api/structures/BrokerDeskActorsAdmin";
import { IPage } from "../../api/structures/IPage";
import {
  deleteAdminAdmins,
  getAdminAdminsAt,
  patchAdminAdmins,
  postAdminAdmins,
  putAdminAdmins,
} from "../../providers/admin/admins";

/**
 * Admin-managed administrator account roster.
 *
 * Administrators invite and administer colleague accounts inside their own
 * organization: provisioning, profile edits, and activation flips are all
 * tenant-scoped and recorded in the append-only audit trail. Invited
 * accounts complete their credential through the setup / password reset
 * flows; no plaintext password is ever accepted here.
 */
@Controller("admin/admins")
export class BrokerDeskActorsAdminsController {
  /**
   * List administrator accounts of the caller's organization.
   *
   * @param body Search, filter, and pagination criteria.
   * @returns Paginated administrator summaries.
   */
  @TypedRoute.Patch()
  public async index(
    @TypedBody() body: IBrokerDeskAdmin.IRequest,
  ): Promise<IPage<IBrokerDeskAdmin.ISummary>> {
    return patchAdminAdmins(body);
  }

  /**
   * Invite a new administrator into the caller's organization.
   *
   * The invited account receives a verification / setup message and completes
   * its credential out of band.
   *
   * @param body Invitation body (email, display name, activation standing).
   * @returns The newly provisioned administrator.
   */
  @TypedRoute.Post()
  public async create(
    @TypedBody() body: IBrokerDeskAdmin.ICreate,
  ): Promise<IBrokerDeskAdmin> {
    return postAdminAdmins(body);
  }

  /**
   * Retrieve one administrator account in detail.
   *
   * @param adminId Target administrator identifier.
   * @returns The administrator record.
   */
  @TypedRoute.Get(":adminId")
  public async at(
    @TypedParam("adminId") adminId: string & tags.Format<"uuid">,
  ): Promise<IBrokerDeskAdmin> {
    return getAdminAdminsAt(adminId);
  }

  /**
   * Update an administrator account.
   *
   * Role-sensitive changes such as deactivation terminate the colleague's
   * open sessions immediately; the last active administrator of an
   * organization is protected.
   *
   * @param adminId Target administrator identifier.
   * @param body Mutable account fields.
   * @returns The updated administrator record.
   */
  @TypedRoute.Put(":adminId")
  public async update(
    @TypedParam("adminId") adminId: string & tags.Format<"uuid">,
    @TypedBody() body: IBrokerDeskAdmin.IUpdate,
  ): Promise<IBrokerDeskAdmin> {
    return putAdminAdmins(adminId, body);
  }

  /**
   * Soft-delete an administrator account.
   *
   * The row is retained for audit traceability while disappearing from
   * listings; self-removal and removal of the last active administrator are
   * rejected.
   *
   * @param adminId Target administrator identifier.
   */
  @TypedRoute.Delete(":adminId")
  public async erase(
    @TypedParam("adminId") adminId: string & tags.Format<"uuid">,
  ): Promise<void> {
    return deleteAdminAdmins(adminId);
  }
}
