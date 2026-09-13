import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import { tags } from "typia";

import { IBrokerDeskClientContact } from "../../api/structures/BrokerDeskCrmClient";
import {
  deleteCrmClientContact,
  getCrmClientContact,
  getCrmClientContacts,
  postCrmClientContact,
  putCrmClientContact,
} from "../../providers/crm/contacts";

/**
 * Contact directory controller nested under business clients.
 *
 * Contacts are subsidiary to clients and therefore have no standalone
 * endpoints; every operation is scoped beneath the parent client path, and
 * exactly one primary contact per client is maintained at the application
 * layer.
 */
@Controller("clients/:clientId/contacts")
export class BrokerDeskCrmClientContactController {
  /**
   * List the contact directory of a client.
   *
   * Returns non-deleted contacts ordered with the primary contact first.
   *
   * @param clientId Primary key of the parent client.
   * @returns The client's contacts.
   */
  @TypedRoute.Get()
  public async index(
    @TypedParam("clientId") clientId: string & tags.Format<"uuid">,
  ): Promise<IBrokerDeskClientContact[]> {
    return getCrmClientContacts(clientId);
  }

  /**
   * Read one contact of a client.
   *
   * @param clientId Primary key of the parent client.
   * @param contactId Primary key of the contact.
   * @returns The contact detail.
   */
  @TypedRoute.Get(":contactId")
  public async at(
    @TypedParam("clientId") clientId: string & tags.Format<"uuid">,
    @TypedParam("contactId") contactId: string & tags.Format<"uuid">,
  ): Promise<IBrokerDeskClientContact> {
    return getCrmClientContact(clientId, contactId);
  }

  /**
   * Create a contact under a business client.
   *
   * When marked primary, any previous primary designation on the client is
   * cleared so exactly one primary contact remains.
   *
   * @param clientId Primary key of the parent client.
   * @param body Contact creation payload.
   * @returns The created contact.
   */
  @TypedRoute.Post()
  public async create(
    @TypedParam("clientId") clientId: string & tags.Format<"uuid">,
    @TypedBody() body: IBrokerDeskClientContact.ICreate,
  ): Promise<IBrokerDeskClientContact> {
    return postCrmClientContact(clientId, body);
  }

  /**
   * Update a contact's details.
   *
   * @param clientId Primary key of the parent client.
   * @param contactId Primary key of the contact.
   * @param body Fields to update, all optional.
   * @returns The updated contact.
   */
  @TypedRoute.Put(":contactId")
  public async update(
    @TypedParam("clientId") clientId: string & tags.Format<"uuid">,
    @TypedParam("contactId") contactId: string & tags.Format<"uuid">,
    @TypedBody() body: IBrokerDeskClientContact.IUpdate,
  ): Promise<IBrokerDeskClientContact> {
    return putCrmClientContact(clientId, contactId, body);
  }

  /**
   * Soft-delete a contact, keeping historical activities attributable.
   *
   * @param clientId Primary key of the parent client.
   * @param contactId Primary key of the contact.
   * @returns Nothing.
   */
  @TypedRoute.Delete(":contactId")
  public async erase(
    @TypedParam("clientId") clientId: string & tags.Format<"uuid">,
    @TypedParam("contactId") contactId: string & tags.Format<"uuid">,
  ): Promise<void> {
    return deleteCrmClientContact(clientId, contactId);
  }
}
