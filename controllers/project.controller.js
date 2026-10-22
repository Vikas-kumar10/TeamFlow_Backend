
import mongoose from "mongoose";
import Project from "../models/Project.js";
import asyncHandler from "../utils/asyncHandler.js";

// POST /api/workspaces/:workspaceId/projects
export const createProject = asyncHandler(async (req, res) => {
  const { name, description, startDate, dueDate } = req.body;

  if (typeof name !== "string" || name.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: "Project name must contain at least 2 characters",
    });
  }

  if (name.trim().length > 100) {
    return res.status(400).json({
      success: false,
      message: "Project name cannot exceed 100 characters",
    });
  }

  if (
    description !== undefined &&
    typeof description !== "string"
  ) {
    return res.status(400).json({
      success: false,
      message: "Description must be a string",
    });
  }

  if (
    typeof description === "string" &&
    description.trim().length > 1000
  ) {
    return res.status(400).json({
      success: false,
      message: "Description cannot exceed 1000 characters",
    });
  }

  let parsedStartDate = null;
  let parsedDueDate = null;

  if (startDate !== undefined && startDate !== null && startDate !== "") {
    parsedStartDate = new Date(startDate);

    if (Number.isNaN(parsedStartDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid start date",
      });
    }
  }

  if (dueDate !== undefined && dueDate !== null && dueDate !== "") {
    parsedDueDate = new Date(dueDate);

    if (Number.isNaN(parsedDueDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid due date",
      });
    }
  }

  if (
    parsedStartDate &&
    parsedDueDate &&
    parsedDueDate < parsedStartDate
  ) {
    return res.status(400).json({
      success: false,
      message: "Due date cannot be earlier than start date",
    });
  }

  const project = await Project.create({
    name: name.trim(),
    description: description?.trim() || "",
    workspace: req.workspaceId,
    createdBy: req.user._id,
    startDate: parsedStartDate,
    dueDate: parsedDueDate,
  });

  return res.status(201).json({
    success: true,
    message: "Project created successfully",
    project,
  });
});

// GET /api/workspaces/:workspaceId/projects
export const getWorkspaceProjects = asyncHandler(
  async (req, res) => {
    const projects = await Project.find({
      workspace: req.workspaceId,
      status: { $ne: "archived" },
    })
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: projects.length,
      projects,
    });
  }
);

// GET /api/workspaces/:workspaceId/projects/:projectId
export const getProjectById = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  if (!mongoose.isValidObjectId(projectId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid project ID",
    });
  }

  const project = await Project.findOne({
    _id: projectId,
    workspace: req.workspaceId,
  }).populate("createdBy", "name email");

  if (!project) {
    return res.status(404).json({
      success: false,
      message: "Project not found in this workspace",
    });
  }

  return res.status(200).json({
    success: true,
    project,
  });
});

// PATCH /api/workspaces/:workspaceId/projects/:projectId
export const updateProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { name, description, status, startDate, dueDate } = req.body;

  if (!mongoose.isValidObjectId(projectId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid project ID",
    });
  }

  const project = await Project.findOne({
    _id: projectId,
    workspace: req.workspaceId,
  });

  if (!project) {
    return res.status(404).json({
      success: false,
      message: "Project not found in this workspace",
    });
  }

  if (name !== undefined) {
    if (
      typeof name !== "string" ||
      name.trim().length < 2 ||
      name.trim().length > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Project name must be between 2 and 100 characters",
      });
    }

    project.name = name.trim();
  }

  if (description !== undefined) {
    if (
      typeof description !== "string" ||
      description.trim().length > 1000
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid project description",
      });
    }

    project.description = description.trim();
  }

  if (status !== undefined) {
    if (!["planning", "active", "completed", "archived"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project status",
      });
    }

    project.status = status;
  }

  if (startDate !== undefined) {
    const date = startDate ? new Date(startDate) : null;

    if (date && Number.isNaN(date.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid start date",
      });
    }

    project.startDate = date;
  }

  if (dueDate !== undefined) {
    const date = dueDate ? new Date(dueDate) : null;

    if (date && Number.isNaN(date.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid due date",
      });
    }

    project.dueDate = date;
  }

  if (
    project.startDate &&
    project.dueDate &&
    project.dueDate < project.startDate
  ) {
    return res.status(400).json({
      success: false,
      message: "Due date cannot be earlier than start date",
    });
  }

  await project.save();

  return res.status(200).json({
    success: true,
    message: "Project updated successfully",
    project,
  });
});

// DELETE /api/workspaces/:workspaceId/projects/:projectId
export const deleteProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  if (!mongoose.isValidObjectId(projectId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid project ID",
    });
  }

  const project = await Project.findOne({
    _id: projectId,
    workspace: req.workspaceId,
  });

  if (!project) {
    return res.status(404).json({
      success: false,
      message: "Project not found in this workspace",
    });
  }

  // Task cleanup/archive policy should be implemented
  // before deleting projects that already contain tasks.
  await project.deleteOne();

  return res.status(200).json({
    success: true,
    message: "Project deleted successfully",
  });
});
