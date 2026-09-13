import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import { tags } from "typia";

import {
  IBrokerDeskCarrier,
  IBrokerDeskCarrierAppointment,
  IPageIBrokerDeskCarrierAppointmentISummary,
  IPageIBrokerDeskCarrierISummary,
} from "../../api/structures/BrokerDeskCatalogueCarrier";
import {
  deleteCarrier,
  deleteCarrierAppointment,
  getCarrier,
  getCarrierAppointment,
  patchCarrierAppointments,
  patchCarriers,
  postCarrierAppointments,
  postCarriers,
  putCarrier,
  putCarrierAppointment,
} from "../../providers/catalogue/carrier";

/**
 * Catalogue carrier administration controller.
 *
 * Provides full CRUD over the shared insurance-carrier reference data, plus
 * the nested appointment surface that binds carriers to the brokerage
 * organization and feeds compliance dashboards with appointment status and
 * expiry information.
 */
@Controller("carriers")
export class BrokerDeskCatalogueCarrierController {
  /**
   * List carriers with pagination, search, and filters.
   *
   * Returns the catalogue of insurance carriers visible to the authenticated
   * organization, filterable by free-text search and active flag.
   *
   * @param body Pagination and filter criteria.
   * @returns Paginated carrier summary list.
   */
  @TypedRoute.Patch()
  public async index(
    @TypedBody() body: IBrokerDeskCarrier.IRequest,
  ): Promise<IPageIBrokerDeskCarrierISummary> {
    return patchCarriers(body);
  }

  /**
   * Create a new carrier catalogue entry.
   *
   * ADMIN-only operation registering a carrier with its unique code and
   * producer-support contact channels.
   *
   * @param body Carrier creation attributes.
   * @returns The newly created carrier.
   */
  @TypedRoute.Post()
  public async create(
    @TypedBody() body: IBrokerDeskCarrier.ICreate,
  ): Promise<IBrokerDeskCarrier> {
    return postCarriers(body);
  }

  /**
   * Fetch a carrier by id.
   *
   * Returns the full carrier record including its product summaries.
   *
   * @param carrierId Target carrier id.
   * @returns The carrier detail.
   */
  @TypedRoute.Get(":carrierId")
  public async at(
    @TypedParam("carrierId") carrierId: string & tags.Format<"uuid">,
  ): Promise<IBrokerDeskCarrier> {
    return getCarrier(carrierId);
  }

  /**
   * Update a carrier's attributes.
   *
   * @param carrierId Target carrier id.
   * @param body Fields to update.
   * @returns The updated carrier.
   */
  @TypedRoute.Put(":carrierId")
  public async update(
    @TypedParam("carrierId") carrierId: string & tags.Format<"uuid">,
    @TypedBody() body: IBrokerDeskCarrier.IUpdate,
  ): Promise<IBrokerDeskCarrier> {
    return putCarrier(carrierId, body);
  }

  /**
   * Delete a carrier catalogue entry.
   *
   * Historical quote lines, submissions, policies, and commissions retain
   * their carrier references for audit continuity.
   *
   * @param carrierId Target carrier id.
   */
  @TypedRoute.Delete(":carrierId")
  public async erase(
    @TypedParam("carrierId") carrierId: string & tags.Format<"uuid">,
  ): Promise<void> {
    return deleteCarrier(carrierId);
  }
}

/**
 * Carrier appointment administration controller.
 *
 * Manages the junction records binding the brokerage organization to carriers,
 * including the status and expiry date consumed by compliance-alert scans.
 * Nested under the carrier resource so the whole appointment book of a carrier
 * can be reviewed in place.
 */
@Controller("carriers/:carrierId/appointments")
export class BrokerDeskCatalogueCarrierAppointmentController {
  /**
   * List appointments for a carrier with pagination and filters.
   *
   * Supports compliance review with status filtering and an
   * expiring-within-days window that surfaces appointments whose expiry is
   * imminent.
   *
   * @param carrierId Parent carrier id.
   * @param body Pagination and filter criteria.
   * @returns Paginated appointment summary list.
   */
  @TypedRoute.Patch()
  public async index(
    @TypedParam("carrierId") carrierId: string & tags.Format<"uuid">,
    @TypedBody() body: IBrokerDeskCarrierAppointment.IRequest,
  ): Promise<IPageIBrokerDeskCarrierAppointmentISummary> {
    return patchCarrierAppointments(carrierId, body);
  }

  /**
   * Create an appointment of this carrier to the organization.
   *
   * ADMIN-only operation recording the start of a placing-authority term.
   *
   * @param carrierId Parent carrier id.
   * @param body Appointment creation attributes.
   * @returns The newly created appointment.
   */
  @TypedRoute.Post()
  public async create(
    @TypedParam("carrierId") carrierId: string & tags.Format<"uuid">,
    @TypedBody() body: IBrokerDeskCarrierAppointment.ICreate,
  ): Promise<IBrokerDeskCarrierAppointment> {
    return postCarrierAppointments(carrierId, body);
  }

  /**
   * Fetch an appointment by id.
   *
   * @param carrierId Parent carrier id.
   * @param appointmentId Target appointment id.
   * @returns The appointment detail.
   */
  @TypedRoute.Get(":appointmentId")
  public async at(
    @TypedParam("carrierId") carrierId: string & tags.Format<"uuid">,
    @TypedParam("appointmentId") appointmentId: string & tags.Format<"uuid">,
  ): Promise<IBrokerDeskCarrierAppointment> {
    return getCarrierAppointment(carrierId, appointmentId);
  }

  /**
   * Update an appointment's status or term dates.
   *
   * Typical use is a renewal pushing expires_at forward or a termination
   * changing status.
   *
   * @param carrierId Parent carrier id.
   * @param appointmentId Target appointment id.
   * @param body Fields to update.
   * @returns The updated appointment.
   */
  @TypedRoute.Put(":appointmentId")
  public async update(
    @TypedParam("carrierId") carrierId: string & tags.Format<"uuid">,
    @TypedParam("appointmentId") appointmentId: string & tags.Format<"uuid">,
    @TypedBody() body: IBrokerDeskCarrierAppointment.IUpdate,
  ): Promise<IBrokerDeskCarrierAppointment> {
    return putCarrierAppointment(carrierId, appointmentId, body);
  }

  /**
   * Soft-delete an appointment, preserving historical audit trails.
   *
   * @param carrierId Parent carrier id.
   * @param appointmentId Target appointment id.
   */
  @TypedRoute.Delete(":appointmentId")
  public async erase(
    @TypedParam("carrierId") carrierId: string & tags.Format<"uuid">,
    @TypedParam("appointmentId") appointmentId: string & tags.Format<"uuid">,
  ): Promise<void> {
    return deleteCarrierAppointment(carrierId, appointmentId);
  }
}
