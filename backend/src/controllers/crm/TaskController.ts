import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import { tags } from "typia";

import {
  IBrokerDeskTask,
  IPageIBrokerDeskTaskSummary,
} from "../../api/structures/BrokerDeskCrmTask";
import {
  deleteCrmTask,
  getCrmTask,
  getCrmTasksMe,
  patchCrmTasks,
  postCrmTask,
  putCrmTask,
} from "../../providers/crm/tasks";

/**
 * Task controller for follow-up work items across the brokerage.
 *
 * CSRs coordinate task life for the whole agency; producers and
 * administrators see their assigned queues. Assignees are resolved through
 * the role-specific assignment junctions, never as nullable actor keys.
 */
@Controller("tasks")
export class BrokerDeskCrmTaskController {
  /**
   * List and filter tasks of the acting organization.
   *
   * Supports status, client, policy, due-date range, and free-text title
   * filters with pagination.
   *
   * @param body Search and filter criteria.
   * @returns Paginated task summaries.
   */
  @TypedRoute.Patch()
  public async index(
    @TypedBody() body: IBrokerDeskTask.IRequest,
  ): Promise<IPageIBrokerDeskTaskSummary> {
    return patchCrmTasks(body);
  }

  /**
   * List the tasks assigned to the acting staff member.
   *
   * Returns the personal queue resolved through whichever assignment junction
   * matches the acting role.
   *
   * @returns The acting staff member's assigned tasks.
   */
  @TypedRoute.Get("me")
  public async me(): Promise<IBrokerDeskTask.IMyQueue> {
    return getCrmTasksMe();
  }

  /**
   * Read one task in full detail, including anchors and resolved assignee.
   *
   * @param taskId Primary key of the task.
   * @returns The task detail.
   */
  @TypedRoute.Get(":taskId")
  public async at(
    @TypedParam("taskId") taskId: string & tags.Format<"uuid">,
  ): Promise<IBrokerDeskTask> {
    return getCrmTask(taskId);
  }

  /**
   * Create a task and bind its assignee.
   *
   * Exactly one assignee reference must be supplied; the owning organization
   * comes from the acting JWT identity.
   *
   * @param body Task creation payload.
   * @returns The created task.
   */
  @TypedRoute.Post()
  public async create(
    @TypedBody() body: IBrokerDeskTask.ICreate,
  ): Promise<IBrokerDeskTask> {
    return postCrmTask(body);
  }

  /**
   * Update a task: adjust content, due date, status, or reassign.
   *
   * Reassignment retires the prior assignment row and creates the
   * replacement for the new role kind.
   *
   * @param taskId Primary key of the task.
   * @param body Fields to update, all optional.
   * @returns The updated task.
   */
  @TypedRoute.Put(":taskId")
  public async update(
    @TypedParam("taskId") taskId: string & tags.Format<"uuid">,
    @TypedBody() body: IBrokerDeskTask.IUpdate,
  ): Promise<IBrokerDeskTask> {
    return putCrmTask(taskId, body);
  }

  /**
   * Delete a task record.
   *
   * @param taskId Primary key of the task.
   * @returns Nothing.
   */
  @TypedRoute.Delete(":taskId")
  public async erase(
    @TypedParam("taskId") taskId: string & tags.Format<"uuid">,
  ): Promise<void> {
    return deleteCrmTask(taskId);
  }
}
