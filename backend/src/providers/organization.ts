import { IBrokerDeskOrganization } from "../api/structures/BrokerDeskSystematicOrganization";
import { MyGlobal } from "../MyGlobal";
import { requireAdmin } from "./auth/admin";
import {
  parseSettings,
  toOrganization,
} from "../transformers/organization";

export const getAdminOrganizationMe = async (): Promise<IBrokerDeskOrganization> => {
  const { admin } = await requireAdmin();
  const org = await MyGlobal.prisma.broker_desk_organizations.findFirstOrThrow({
    where: { id: admin.broker_desk_organization_id },
  });
  return toOrganization(org);
};

export const putAdminOrganizationMe = async (
  body: IBrokerDeskOrganization.IUpdate,
): Promise<IBrokerDeskOrganization> => {
  const { admin } = await requireAdmin();
  const org = await MyGlobal.prisma.broker_desk_organizations.update({
    where: { id: admin.broker_desk_organization_id },
    data: {
      legal_name: body.legal_name ?? undefined,
      operating_name:
        body.operating_name === undefined ? undefined : body.operating_name,
      primary_province: body.primary_province ?? undefined,
      phone: body.phone === undefined ? undefined : body.phone,
      hst_gst_number:
        body.hst_gst_number === undefined ? undefined : body.hst_gst_number,
      address_line1:
        body.address_line1 === undefined ? undefined : body.address_line1,
      address_line2:
        body.address_line2 === undefined ? undefined : body.address_line2,
      city: body.city === undefined ? undefined : body.city,
      province: body.province === undefined ? undefined : body.province,
      postal_code:
        body.postal_code === undefined ? undefined : body.postal_code,
      updated_at: new Date(),
    },
  });
  return toOrganization(org);
};

export const getAdminOrganizationSettings =
  async (): Promise<IBrokerDeskOrganization.ISettings> => {
    const { admin } = await requireAdmin();
    const org = await MyGlobal.prisma.broker_desk_organizations.findFirstOrThrow({
      where: { id: admin.broker_desk_organization_id },
    });
    return parseSettings(org.settings);
  };
