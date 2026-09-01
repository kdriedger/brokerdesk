import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";

import { IBrokerDeskNotification } from "../../api/structures/BrokerDeskSystematicNotification";
import { IPage } from "../../api/structures/IPage";

/**
 * In-app notification inbox for staff.
 *
 * Notifications are generated for task due, licence expiring, policy
 * expiring, renewal due, and submission status changes. Each record targets
 * a single recipient; only the authenticated user's own notifications are
 * reachable. Marking read is idempotent.
 */
@Controller("notifications")
export class BrokerDeskSystematicNotificationController {
  /**
   * List the authenticated user's notifications.
   *
   * Filters by type and read state; supports pagination and ordering.
   *
   * @param body Search and pagination criteria.
   * @returns Page of notification summaries.
   */
  @TypedRoute.Patch()
  public async index(
    @TypedBody() body: IBrokerDeskNotification.IRequest,
  ): Promise<IPage<IBrokerDeskNotification.ISummary>> {
    throw new Error("Not implemented");
  }

  /**
   * Retrieve one of the authenticated user's notifications.
   *
   * @param notificationId Target notification key.
   * @returns The full notification record.
   */
  @TypedRoute.Get(":notificationId")
  public async at(
    @TypedParam("notificationId") notificationId: string,
  ): Promise<IBrokerDeskNotification> {
    throw new Error("Not implemented");
  }

  /**
   * Mark a notification as read.
   *
   * Idempotent: marking an already-read notification succeeds without
   * changing anything.
   *
   * @param notificationId Target notification key.
   * @returns The refreshed notification record.
   */
  @TypedRoute.Patch(":notificationId/read")
  public async markRead(
    @TypedParam("notificationId") notificationId: string,
  ): Promise<IBrokerDeskNotification> {
    throw new Error("Not implemented");
  }

  /**
   * Count unread notifications for the authenticated user.
   *
   * Lightweight badge endpoint for the staff UI.
   *
   * @returns The number of unread notifications.
   */
  @TypedRoute.Get("unread-count")
  public async unreadCount(): Promise<IBrokerDeskNotification.IUnreadCount> {
    throw new Error("Not implemented");
  }
}