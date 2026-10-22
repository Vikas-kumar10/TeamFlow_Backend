
import { Router } from "express";

import {
  createWorkspace,
  getMyWorkspaces,
  getWorkspaceById,
} from "../controllers/workspace.controller.js";

import { protect } from "../middleware/auth.middleware.js";

const router = Router();

// All workspace routes require authentication
router.use(protect);

router.post("/", createWorkspace);
router.get("/", getMyWorkspaces);
router.get("/:workspaceId", getWorkspaceById);

export default router;
