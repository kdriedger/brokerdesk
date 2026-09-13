import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";

import { IBrokerDeskNotification } from "../../api/structures/BrokerDeskSystematicNotification";
import { IPage } from "../../api/structures/IPage";
import {
  getNotification,
  getNotificationUnreadCount,
  markNotificationRead,
  patchNotifications,
} from "../../providers/systematic/notifications";

@Controller("notifications")
export class BrokerDeskSystematicNotificationController {
  @TypedRoute.Patch()
  public async index(
    @TypedBody() body: IBrokerDeskNotification.IRequest,
  ): Promise<IPage<IBrokerDeskNotification.ISummary>> {
    return patchNotifications(body);
  }

  @TypedRoute.Get(":notificationId")
  public async at(
    @TypedParam("notificationId") notificationId: string,
  ): Promise<IBrokerDeskNotification> {
    return getNotification(notificationId);
  }

  @TypedRoute.Patch(":notificationId/read")
  public async markRead(
    @TypedParam("notificationId") notificationId: string,
  ): Promise<IBrokerDeskNotification> {
    return markNotificationRead(notificationId);
  }

  @TypedRoute.Get("unread-count")
  public async unreadCount(): Promise<IBrokerDeskNotification.IUnreadCount> {
    return getNotificationUnreadCount();
  }
}
