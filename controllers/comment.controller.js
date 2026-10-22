
import mongoose from "mongoose";

import Comment from "../models/Comment.js";
import Task from "../models/Task.js";
import Project from "../models/Project.js";
import { logActivity } from "../services/activity.service.js";

const validId = (id) => mongoose.isValidObjectId(id);

const isManager = (req) =>
  ["admin", "manager"].includes(req.workspaceMember.role);

const findTask = async (req) => {
  const { workspaceId, projectId, taskId } = req.params;

  if (
    !validId(workspaceId) ||
    !validId(projectId) ||
    !validId(taskId)
  ) {
    return null;
  }

  const project = await Project.findOne({
    _id: projectId,
    workspace: workspaceId,
  }).select("_id");

  if (!project) return null;

  return Task.findOne({
    _id: taskId,
    project: projectId,
    workspace: workspaceId,
  });
};

// POST: Add a comment
export const createComment = async (req, res) => {
  const task = await findTask(req);

  if (!task) {
    return res.status(404).json({
      success: false,
      message: "Task not found in this workspace and project",
    });
  }

  const content =
    typeof req.body.content === "string"
      ? req.body.content.trim()
      : "";

  if (!content || content.length > 2000) {
    return res.status(400).json({
      success: false,
      message: "Comment must contain 1 to 2000 characters",
    });
  }

  const comment = await Comment.create({
    workspace: req.workspaceId,
    project: req.params.projectId,
    task: task._id,
    author: req.user._id,
    content,
  });

  const populatedComment = await Comment.findById(comment._id)
    .populate("author", "name email");

  await logActivity({
    workspaceId: req.workspaceId,
    projectId: req.params.projectId,
    taskId: task._id,
    actorId: req.user._id,
    action: "comment_added",
    message: `${req.user.name} added a comment to "${task.title}"`,
    changes: [],
  });

  return res.status(201).json({
    success: true,
    message: "Comment added successfully",
    comment: populatedComment,
  });
};

// GET: List comments for a task
export const getTaskComments = async (req, res) => {
  const task = await findTask(req);

  if (!task) {
    return res.status(404).json({
      success: false,
      message: "Task not found in this workspace and project",
    });
  }

  const comments = await Comment.find({
    workspace: req.workspaceId,
    project: req.params.projectId,
    task: task._id,
  })
    .populate("author", "name email")
    .sort({ createdAt: 1 })
    .lean();

  return res.status(200).json({
    success: true,
    count: comments.length,
    comments,
  });
};

// PATCH: Edit your own comment.
// Admin/Manager can also moderate comments in their workspace.
export const updateComment = async (req, res) => {
  const { commentId } = req.params;

  if (!validId(commentId)) {
    return res.status(400).json({
      success: false,
      message: "Valid comment ID is required",
    });
  }

  const comment = await Comment.findOne({
    _id: commentId,
    workspace: req.workspaceId,
    project: req.params.projectId,
    task: req.params.taskId,
  });

  if (!comment) {
    return res.status(404).json({
      success: false,
      message: "Comment not found",
    });
  }

  const isOwner =
    comment.author.toString() === req.user._id.toString();

  if (!isOwner && !isManager(req)) {
    return res.status(403).json({
      success: false,
      message: "You can only edit your own comments",
    });
  }

  if (typeof req.body.content !== "string") {
    return res.status(400).json({
      success: false,
      message: "Comment content is required",
    });
  }

  const content = req.body.content.trim();

  if (!content || content.length > 2000) {
    return res.status(400).json({
      success: false,
      message: "Comment must contain 1 to 2000 characters",
    });
  }

  const oldContent = comment.content;

  if (oldContent === content) {
    return res.status(200).json({
      success: true,
      message: "Comment is unchanged",
      comment,
    });
  }

  comment.content = content;
  await comment.save();

  const task = await Task.findById(comment.task).select("title");

  await logActivity({
    workspaceId: req.workspaceId,
    projectId: comment.project,
    taskId: comment.task,
    actorId: req.user._id,
    action: "comment_updated",
    message: `${req.user.name} updated a comment on "${task?.title || "task"}"`,
    changes: [],
  });

  return res.status(200).json({
    success: true,
    message: "Comment updated successfully",
    comment,
  });
};

// DELETE: Delete your own comment.
// Admin/Manager can moderate comments in their workspace.
export const deleteComment = async (req, res) => {
  const { commentId } = req.params;

  if (!validId(commentId)) {
    return res.status(400).json({
      success: false,
      message: "Valid comment ID is required",
    });
  }

  const comment = await Comment.findOne({
    _id: commentId,
    workspace: req.workspaceId,
    project: req.params.projectId,
    task: req.params.taskId,
  });

  if (!comment) {
    return res.status(404).json({
      success: false,
      message: "Comment not found",
    });
  }

  const isOwner =
    comment.author.toString() === req.user._id.toString();

  if (!isOwner && !isManager(req)) {
    return res.status(403).json({
      success: false,
      message: "You can only delete your own comments",
    });
  }

  const task = await Task.findById(comment.task).select("title");

  await logActivity({
    workspaceId: req.workspaceId,
    projectId: comment.project,
    taskId: comment.task,
    actorId: req.user._id,
    action: "comment_deleted",
    message: `${req.user.name} deleted a comment on "${task?.title || "task"}"`,
    changes: [],
  });

  await comment.deleteOne();

  return res.status(200).json({
    success: true,
    message: "Comment deleted successfully",
  });
};
