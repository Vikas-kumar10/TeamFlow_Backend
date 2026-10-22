import { Router } from "express";

import { protect } from "../middleware/auth.middleware.js";
import requireWorkspace from "../middleware/requireWorkspace.js";

import {
  createComment,
  getTaskComments,
  updateComment,
  deleteComment,
} from "../controllers/comment.controller.js";

const router = Router({ mergeParams: true });

router.use(protect);
router.use(requireWorkspace);

router
  .route("/")
  .get(getTaskComments)
  .post(createComment);

router
  .route("/:commentId")
  .patch(updateComment)
  .delete(deleteComment);

export default router;
