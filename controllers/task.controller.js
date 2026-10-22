import mongoose from "mongoose";

import Task from "../models/Task.js";
import Project from "../models/Project.js";
import WorkspaceMember from "../models/WorkspaceMember.js";
import asyncHandler from "../utils/asyncHandler.js";
import { logActivity } from "../services/activity.service.js";

const validStatuses = ["todo", "in_progress", "review", "done"];
const validPriorities = ["low", "medium", "high", "urgent"];
const managerRoles = ["admin", "manager"];

const isManager = (req) => managerRoles.includes(req.workspaceMember?.role);

const validId = (id) => mongoose.isValidObjectId(id);

const parseDueDate = (value) => {
  if (value === null || value === "") return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? undefined : date;
};

// Verify that the project belongs to the requested workspace.
const findProject = async (req) => {
  return Project.findOne({
    _id: req.params.projectId,
    workspace: req.workspaceId,
    status: { $ne: "archived" },
  });
};

// Verify the assignee is an active member of this workspace.
const isActiveWorkspaceMember = async (workspaceId, userId) => {
  const membership = await WorkspaceMember.findOne({
    workspace: workspaceId,
    user: userId,
    status: "active",
  });

  return Boolean(membership);
};

// POST /api/workspaces/:workspaceId/projects/:projectId/tasks

export const createTask = asyncHandler(async (req, res) => {
  if (!isManager(req)) {
    return res.status(403).json({
      success: false,
      message: "Only workspace admins and managers can create tasks",
    });
  }

  if (!validId(req.params.projectId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid project ID",
    });
  }

  const project = await findProject(req);

  if (!project) {
    return res.status(404).json({
      success: false,
      message: "Project not found in this workspace",
    });
  }

  const { title, description, assignedTo, priority, dueDate } = req.body;

  if (
    typeof title !== "string" ||
    title.trim().length < 2 ||
    title.trim().length > 150
  ) {
    return res.status(400).json({
      success: false,
      message: "Task title must be between 2 and 150 characters",
    });
  }

  if (
    description !== undefined &&
    (typeof description !== "string" || description.length > 2000)
  ) {
    return res.status(400).json({
      success: false,
      message: "Description must be a string of at most 2000 characters",
    });
  }

  if (priority !== undefined && !validPriorities.includes(priority)) {
    return res.status(400).json({
      success: false,
      message: "Invalid task priority",
    });
  }

  let parsedDueDate = null;

  if (dueDate !== undefined && dueDate !== null && dueDate !== "") {
    parsedDueDate = parseDueDate(dueDate);

    if (parsedDueDate === undefined) {
      return res.status(400).json({
        success: false,
        message: "Invalid due date",
      });
    }
  }

  let assigneeId = null;

  if (assignedTo !== undefined && assignedTo !== null && assignedTo !== "") {
    if (!validId(assignedTo)) {
      return res.status(400).json({
        success: false,
        message: "Invalid assigned user ID",
      });
    }

    const activeMember = await isActiveWorkspaceMember(
      req.workspaceId,
      assignedTo,
    );

    if (!activeMember) {
      return res.status(400).json({
        success: false,
        message: "Assignee must be an active member of this workspace",
      });
    }

    assigneeId = assignedTo;
  }

  // 1. Create task
  const task = await Task.create({
    title: title.trim(),
    description: description?.trim() || "",
    workspace: req.workspaceId,
    project: project._id,
    assignedTo: assigneeId,
    createdBy: req.user._id,
    priority: priority || "medium",
    dueDate: parsedDueDate,
  });

  // 2. Populate user details
  await task.populate([
    { path: "assignedTo", select: "name email" },
    { path: "createdBy", select: "name email" },
  ]);

  // 3. Log task creation
  await logActivity({
    workspaceId: req.workspaceId,
    projectId: project._id,
    taskId: task._id,
    actorId: req.user._id,
    action: "task_created",
    message: `${req.user.name} created task "${task.title}"`,
    changes: [
      {
        field: "title",
        oldValue: null,
        newValue: task.title,
      },
      {
        field: "status",
        oldValue: null,
        newValue: task.status,
      },
    ],
  });

  // 4. Log initial assignment, if any
  if (task.assignedTo) {
    await logActivity({
      workspaceId: req.workspaceId,
      projectId: project._id,
      taskId: task._id,
      actorId: req.user._id,
      action: "task_assigned",
      message: `${req.user.name} assigned task "${task.title}"`,
      changes: [
        {
          field: "assignedTo",
          oldValue: null,
          newValue: task.assignedTo._id.toString(),
        },
      ],
    });
  }

  // 5. Send response
  return res.status(201).json({
    success: true,
    message: "Task created successfully",
    task,
  });
});

// GET /api/workspaces/:workspaceId/projects/:projectId/tasks
export const getProjectTasks = asyncHandler(async (req, res) => {
  if (!validId(req.params.projectId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid project ID",
    });
  }

  const project = await findProject(req);

  if (!project) {
    return res.status(404).json({
      success: false,
      message: "Project not found in this workspace",
    });
  }

  const filter = {
    workspace: req.workspaceId,
    project: project._id,
  };

  // Members see their own assigned tasks.
  // Admins and managers can see all tasks in this project.
  if (!isManager(req)) {
    filter.assignedTo = req.user._id;
  }

  const tasks = await Task.find(filter)
    .populate("assignedTo", "name email")
    .populate("createdBy", "name email")
    .sort({ createdAt: -1 });

  return res.status(200).json({
    success: true,
    count: tasks.length,
    tasks,
  });
});

// GET /api/workspaces/:workspaceId/projects/:projectId/tasks/:taskId
export const getTaskById = asyncHandler(async (req, res) => {
  const { projectId, taskId } = req.params;

  if (!validId(projectId) || !validId(taskId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid project ID or task ID",
    });
  }

  const project = await findProject(req);

  if (!project) {
    return res.status(404).json({
      success: false,
      message: "Project not found in this workspace",
    });
  }

  const filter = {
    _id: taskId,
    workspace: req.workspaceId,
    project: project._id,
  };

  if (!isManager(req)) {
    filter.assignedTo = req.user._id;
  }

  const task = await Task.findOne(filter)
    .populate("assignedTo", "name email")
    .populate("createdBy", "name email");

  if (!task) {
    return res.status(404).json({
      success: false,
      message: "Task not found or you do not have access",
    });
  }

  return res.status(200).json({
    success: true,
    task,
  });
});

// PATCH /api/workspaces/:workspaceId/projects/:projectId/tasks/:taskId
// Admin/Manager can update task details.
export const updateTask = asyncHandler(async (req, res) => {
  if (!isManager(req)) {
    return res.status(403).json({
      success: false,
      message: "Only workspace admins and managers can edit task details",
    });
  }

  const { projectId, taskId } = req.params;

  if (!validId(projectId) || !validId(taskId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid project ID or task ID",
    });
  }

  const project = await findProject(req);

  if (!project) {
    return res.status(404).json({
      success: false,
      message: "Project not found in this workspace",
    });
  }

  const task = await Task.findOne({
    _id: taskId,
    workspace: req.workspaceId,
    project: project._id,
  });

  if (!task) {
    return res.status(404).json({
      success: false,
      message: "Task not found in this project",
    });
  }

  const { title, description, assignedTo, status, priority, dueDate } =
    req.body;

  if (title !== undefined) {
    if (
      typeof title !== "string" ||
      title.trim().length < 2 ||
      title.trim().length > 150
    ) {
      return res.status(400).json({
        success: false,
        message: "Task title must be between 2 and 150 characters",
      });
    }

    task.title = title.trim();
  }

  if (description !== undefined) {
    if (typeof description !== "string" || description.length > 2000) {
      return res.status(400).json({
        success: false,
        message: "Invalid task description",
      });
    }

    task.description = description.trim();
  }

  if (status !== undefined) {
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task status",
      });
    }

    task.status = status;
  }

  if (priority !== undefined) {
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task priority",
      });
    }

    task.priority = priority;
  }

  if (assignedTo !== undefined) {
    if (assignedTo === null || assignedTo === "") {
      task.assignedTo = null;
    } else {
      if (!validId(assignedTo)) {
        return res.status(400).json({
          success: false,
          message: "Invalid assigned user ID",
        });
      }

      const activeMember = await isActiveWorkspaceMember(
        req.workspaceId,
        assignedTo,
      );

      if (!activeMember) {
        return res.status(400).json({
          success: false,
          message: "Assignee must be an active workspace member",
        });
      }

      task.assignedTo = assignedTo;
    }
  }

  if (dueDate !== undefined) {
    const parsedDate = parseDueDate(dueDate);

    if (parsedDate === undefined) {
      return res.status(400).json({
        success: false,
        message: "Invalid due date",
      });
    }

    task.dueDate = parsedDate;
  }

  await task.save();

  await task.populate([
    { path: "assignedTo", select: "name email" },
    { path: "createdBy", select: "name email" },
  ]);

  return res.status(200).json({
    success: true,
    message: "Task updated successfully",
    task,
  });
});

// PATCH /api/workspaces/:workspaceId/projects/:projectId/tasks/:taskId/status
// An assigned member can update only their own task status.
export const updateTaskStatus = asyncHandler(async (req, res) => {
  const { projectId, taskId } = req.params;
  const { status } = req.body;

  if (!validId(projectId) || !validId(taskId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid project ID or task ID",
    });
  }

  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid task status",
    });
  }

  const project = await findProject(req);

  if (!project) {
    return res.status(404).json({
      success: false,
      message: "Project not found in this workspace",
    });
  }

  const filter = {
    _id: taskId,
    workspace: req.workspaceId,
    project: project._id,
  };

  if (!isManager(req)) {
    filter.assignedTo = req.user._id;
  }

  const task = await Task.findOne(filter);

  if (!task) {
    return res.status(404).json({
      success: false,
      message: "Task not found or you are not assigned to it",
    });
  }

  task.status = status;
  await task.save();

  return res.status(200).json({
    success: true,
    message: "Task status updated successfully",
    task,
  });
});

// DELETE /api/workspaces/:workspaceId/projects/:projectId/tasks/:taskId
export const deleteTask = asyncHandler(async (req, res) => {
  if (!isManager(req)) {
    return res.status(403).json({
      success: false,
      message: "Only workspace admins and managers can delete tasks",
    });
  }

  const { projectId, taskId } = req.params;

  if (!validId(projectId) || !validId(taskId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid project ID or task ID",
    });
  }

  const project = await findProject(req);

  if (!project) {
    return res.status(404).json({
      success: false,
      message: "Project not found in this workspace",
    });
  }

  const task = await Task.findOne({
    _id: taskId,
    workspace: req.workspaceId,
    project: project._id,
  });

  if (!task) {
    return res.status(404).json({
      success: false,
      message: "Task not found in this project",
    });
  }

  await task.deleteOne();

  return res.status(200).json({
    success: true,
    message: "Task deleted successfully",
  });
});
