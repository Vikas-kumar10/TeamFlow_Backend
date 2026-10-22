import { Router } from "express";

import { protect } from "../middleware/auth.middleware.js";
import requireWorkspace from "../middleware/requireWorkspace.js";

import { getProjectActivities } from "../controllers/activity.controller.js";

const router = Router({ mergeParams: true });

router.use(protect);
router.use(requireWorkspace);

router.get("/", getProjectActivities);

export default router;
