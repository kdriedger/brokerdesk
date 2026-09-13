import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import { tags } from "typia";

import { IBrokerDeskAddress } from "../../api/structures/BrokerDeskCrmAddress";
import {
  deleteCrmClientAddress,
  getCrmClientAddress,
  getCrmClientAddresses,
  postCrmClientAddress,
  putCrmClientAddress,
} from "../../providers/crm/addresses";

/**
 * Client address controller: attach, list, read, update, and detach typed
 * addresses (mailing, billing, risk) owned by a client.
 *
 * Client addresses are subsidiary to clients and nested under the client
 * path; the shared address space enforces single ownership per address row.
 */
@Controller("clients/:clientId/addresses")
export class BrokerDeskCrmClientAddressController {
  /**
   * List addresses owned by a client.
   *
   * @param clientId Primary key of the parent client.
   * @returns The client's owned addresses.
   */
  @TypedRoute.Get()
  public async index(
    @TypedParam("clientId") clientId: string & tags.Format<"uuid">,
  ): Promise<IBrokerDeskAddress[]> {
    return getCrmClientAddresses(clientId);
  }

  /**
   * Read one address owned by a client.
   *
   * @param clientId Primary key of the parent client.
   * @param addressId Primary key of the address.
   * @returns The address detail.
   */
  @TypedRoute.Get(":addressId")
  public async at(
    @TypedParam("clientId") clientId: string & tags.Format<"uuid">,
    @TypedParam("addressId") addressId: string & tags.Format<"uuid">,
  ): Promise<IBrokerDeskAddress> {
    return getCrmClientAddress(clientId, addressId);
  }

  /**
   * Attach a new typed address to a client.
   *
   * Risk addresses feed coverage eligibility and province-aware taxation;
   * mailing and billing addresses support correspondence and invoicing.
   *
   * @param clientId Primary key of the parent client.
   * @param body Address creation payload.
   * @returns The created address with ownership binding.
   */
  @TypedRoute.Post()
  public async create(
    @TypedParam("clientId") clientId: string & tags.Format<"uuid">,
    @TypedBody() body: IBrokerDeskAddress.ICreate,
  ): Promise<IBrokerDeskAddress> {
    return postCrmClientAddress(clientId, body);
  }

  /**
   * Update an address owned by a client.
   *
   * @param clientId Primary key of the parent client.
   * @param addressId Primary key of the address.
   * @param body Fields to update, all optional.
   * @returns The updated address.
   */
  @TypedRoute.Put(":addressId")
  public async update(
    @TypedParam("clientId") clientId: string & tags.Format<"uuid">,
    @TypedParam("addressId") addressId: string & tags.Format<"uuid">,
    @TypedBody() body: IBrokerDeskAddress.IUpdate,
  ): Promise<IBrokerDeskAddress> {
    return putCrmClientAddress(clientId, addressId, body);
  }

  /**
   * Detach an address from a client, removing the ownership binding and
   * soft-deleting the address row.
   *
   * @param clientId Primary key of the parent client.
   * @param addressId Primary key of the address.
   * @returns Nothing.
   */
  @TypedRoute.Delete(":addressId")
  public async erase(
    @TypedParam("clientId") clientId: string & tags.Format<"uuid">,
    @TypedParam("addressId") addressId: string & tags.Format<"uuid">,
  ): Promise<void> {
    return deleteCrmClientAddress(clientId, addressId);
  }
}

/** Paginated address page alias (organization office locations). */
export interface IPageIBrokerDeskAddressPage {
  pagination: {
    page: number;
    limit: number;
    total_count: number;
    total_pages: number;
  };
  data: IBrokerDeskAddress[];
}
