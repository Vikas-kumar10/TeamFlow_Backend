
import { Router } from "express";

import { protect } from "../middleware/auth.middleware.js";
import requireWorkspace from "../middleware/requireWorkspace.js";
import authorizeRole from "../middleware/authorizeRole.js";

import {
  addWorkspaceMember,
  getWorkspaceMembers,
  updateWorkspaceMemberRole,
  removeWorkspaceMember,
} from "../controllers/workspaceMember.controller.js";

const router = Router({ mergeParams: true });

router.use(protect);
router.use(requireWorkspace);

// All active workspace members can see the member list.
router.get("/", getWorkspaceMembers);

// Only Admin can manage members.
router.post("/", authorizeRole("admin"), addWorkspaceMember);

router.patch(
  "/:userId/role",
  authorizeRole("admin"),
  updateWorkspaceMemberRole
);

router.delete(
  "/:userId",
  authorizeRole("admin"),
  removeWorkspaceMember
);

export default router;
