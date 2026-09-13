import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";

import { IBrokerDeskClient } from "../../api/structures/BrokerDeskActorsClient";
import { IPage } from "../../api/structures/IPage";
import {
  deleteAdminClients,
  getAdminClientsAt,
  patchAdminClients,
  postAdminClients,
  putAdminClients,
} from "../../providers/admin/clients";

/**
 * Admin-managed portal client identity roster.
 *
 * Administrators provision insured customers' sign-in accounts against
 * existing client profiles inside their own organization. Public
 * registration never creates these identities; the customer establishes the
 * initial credential through the password reset flow on first login.
 *
 * Every record is tenant-scoped to the administrator's brokerage; clients of
 * other organizations are never reachable through these endpoints.
 */
@Controller("admin/clients")
export class BrokerDeskActorsAdminClientsController {
  /**
   * List portal client identities.
   *
   * Filters by name, email, status and assigned producer; supports
   * pagination and ordering. Returns lightweight summaries suitable for
   * roster tables.
   *
   * @param body Search and pagination criteria.
   * @returns Page of client identity summaries.
   */
  @TypedRoute.Patch()
  public async index(
    @TypedBody() body: IBrokerDeskClient.IRequest,
  ): Promise<IPage<IBrokerDeskClient.ISummary>> {
    return patchAdminClients(body);
  }

  /**
   * Retrieve a single portal client identity.
   *
   * @param clientId Target client identity key.
   * @returns Full client identity record.
   */
  @TypedRoute.Get(":clientId")
  public async at(
    @TypedParam("clientId") clientId: string,
  ): Promise<IBrokerDeskClient> {
    return getAdminClientsAt(clientId);
  }

  /**
   * Provision a new portal client identity.
   *
   * Creates the sign-in account bound to the supplied client profile; the
   * initial credential is established through the password reset flow.
   *
   * @param body Creation payload.
   * @returns The created client identity.
   */
  @TypedRoute.Post()
  public async create(
    @TypedBody() body: IBrokerDeskClient.ICreate,
  ): Promise<IBrokerDeskClient> {
    return postAdminClients(body);
  }

  /**
   * Update a portal client identity.
   *
   * @param clientId Target client identity key.
   * @param body Patched fields.
   * @returns The updated client identity.
   */
  @TypedRoute.Put(":clientId")
  public async update(
    @TypedParam("clientId") clientId: string,
    @TypedBody() body: IBrokerDeskClient.IUpdate,
  ): Promise<IBrokerDeskClient> {
    return putAdminClients(clientId, body);
  }

  /**
   * Deactivate a portal client identity.
   *
   * Soft-deletes the identity; historical records are preserved.
   *
   * @param clientId Target client identity key.
   */
  @TypedRoute.Delete(":clientId")
  public async erase(
    @TypedParam("clientId") clientId: string,
  ): Promise<void> {
    return deleteAdminClients(clientId);
  }
}
