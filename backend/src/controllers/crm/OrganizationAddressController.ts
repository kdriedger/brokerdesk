import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import { tags } from "typia";

import { IBrokerDeskAddress } from "../../api/structures/BrokerDeskCrmAddress";

/**
 * Organization office-address controller: manage the brokerage's own office
 * locations bound through the organization ownership junction.
 *
 * Administrative staff manage the roster of office locations; bindings are
 * append-only once established.
 */
@Controller("organization/addresses")
export class BrokerDeskCrmOrganizationAddressController {
  /**
   * List office locations of the acting organization.
   *
   * @returns The organization's owned addresses.
   */
  @TypedRoute.Get()
  public async index(): Promise<IBrokerDeskAddress[]> {
    throw new Error("Not implemented");
  }

  /**
   * Bind a new typed address as an office location of the acting
   * organization.
   *
   * @param body Address creation payload.
   * @returns The created address with ownership binding.
   */
  @TypedRoute.Post()
  public async create(
    @TypedBody() body: IBrokerDeskAddress.ICreate,
  ): Promise<IBrokerDeskAddress> {
    throw new Error("Not implemented");
  }

  /**
   * Read one office location of the acting organization.
   *
   * @param addressId Primary key of the address.
   * @returns The address detail.
   */
  @TypedRoute.Get(":addressId")
  public async at(
    @TypedParam("addressId") addressId: string & tags.Format<"uuid">,
  ): Promise<IBrokerDeskAddress> {
    throw new Error("Not implemented");
  }
}
