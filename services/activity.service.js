
import Activity from "../models/Activity.js";

export const logActivity = async ({
  workspaceId,
  projectId,
  taskId,
  actorId,
  action,
  message,
  changes = [],
}) => {
  try {
    return await Activity.create({
      workspace: workspaceId,
      project: projectId,
      task: taskId,
      actor: actorId,
      action,
      message,
      changes,
    });
  } catch (error) {
    // Activity logging failure should not undo the task operation.
    console.error("Activity logging failed:", error.message);
    return null;
  }
};
