
import { Router } from "express";

import { protect } from "../middleware/auth.middleware.js";
import requireWorkspace from "../middleware/requireWorkspace.js";
import authorizeRole from "../middleware/authorizeRole.js";

import {
  createProject,
  getWorkspaceProjects,
  getProjectById,
  updateProject,
  deleteProject,
} from "../controllers/project.controller.js";

const router = Router({ mergeParams: true });

router.use(protect);
router.use(requireWorkspace);

router.get("/", getWorkspaceProjects);

router.post(
  "/",
  authorizeRole("admin", "manager"),
  createProject
);

router.get("/:projectId", getProjectById);

router.patch(
  "/:projectId",
  authorizeRole("admin", "manager"),
  updateProject
);

router.delete(
  "/:projectId",
  authorizeRole("admin"),
  deleteProject
);

export default router;
