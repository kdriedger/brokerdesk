import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import { tags } from "typia";

import { IBrokerDeskAddress } from "../../api/structures/BrokerDeskCrmAddress";
import {
  getCrmOrganizationAddress,
  getCrmOrganizationAddresses,
  postCrmOrganizationAddress,
} from "../../providers/crm/addresses";

@Controller("organization/addresses")
export class BrokerDeskCrmOrganizationAddressController {
  @TypedRoute.Get()
  public async index(): Promise<IBrokerDeskAddress[]> {
    return getCrmOrganizationAddresses();
  }

  @TypedRoute.Post()
  public async create(
    @TypedBody() body: IBrokerDeskAddress.ICreate,
  ): Promise<IBrokerDeskAddress> {
    return postCrmOrganizationAddress(body);
  }

  @TypedRoute.Get(":addressId")
  public async at(
    @TypedParam("addressId") addressId: string & tags.Format<"uuid">,
  ): Promise<IBrokerDeskAddress> {
    return getCrmOrganizationAddress(addressId);
  }
}
