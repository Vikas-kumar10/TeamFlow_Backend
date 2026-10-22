
import { Router } from "express";

import { protect } from "../middleware/auth.middleware.js";
import requireWorkspace from "../middleware/requireWorkspace.js";

import {
  createTask,
  getProjectTasks,
  getTaskById,
  updateTask,
  updateTaskStatus,
  deleteTask,
} from "../controllers/task.controller.js";

const router = Router({ mergeParams: true });

router.use(protect);
router.use(requireWorkspace);

router
  .route("/")
  .get(getProjectTasks)
  .post(createTask);

router.patch("/:taskId/status", updateTaskStatus);

router
  .route("/:taskId")
  .get(getTaskById)
  .patch(updateTask)
  .delete(deleteTask);

export default router;
