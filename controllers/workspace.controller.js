import mongoose from "mongoose";
import Workspace from "../models/Workspace.js";
import WorkspaceMember from "../models/WorkspaceMember.js";
import asyncHandler from "../utils/asyncHandler.js";

// POST /api/workspaces

export const createWorkspace = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  if (typeof name !== "string" || name.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: "Workspace name must contain at least 2 characters",
    });
  }

  if (name.trim().length > 100) {
    return res.status(400).json({
      success: false,
      message: "Workspace name cannot exceed 100 characters",
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

  const workspace = await Workspace.create({
    name: name.trim(),
    description: description?.trim() || "",
    creator: req.user._id,
  });

  try {
    await WorkspaceMember.create({
      workspace: workspace._id,
      user: req.user._id,
      role: "admin",
      status: "active",
      invitedBy: req.user._id,
    });
  } catch (error) {
    await Workspace.findByIdAndDelete(workspace._id);
    throw error;
  }

  return res.status(201).json({
    success: true,
    message: "Workspace created successfully",
    workspace,
  });
});


// GET /api/workspaces
export const getMyWorkspaces = asyncHandler(async (req, res) => {
  const memberships = await WorkspaceMember.find({
    user: req.user._id,
    status: "active",
  })
    .populate("workspace")
    .sort({ createdAt: -1 });

  const workspaces = memberships
    .filter((membership) => membership.workspace)
    .map((membership) => ({
      ...membership.workspace.toObject(),
      membershipRole: membership.role,
    }));

  return res.status(200).json({
    success: true,
    count: workspaces.length,
    workspaces,
  });
});

// GET /api/workspaces/:workspaceId
export const getWorkspaceById = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;

  if (!mongoose.isValidObjectId(workspaceId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid workspace ID",
    });
  }

  const membership = await WorkspaceMember.findOne({
    workspace: workspaceId,
    user: req.user._id,
    status: "active",
  });

  if (!membership) {
    return res.status(404).json({
      success: false,
      message: "Workspace not found",
    });
  }

  const workspace = await Workspace.findById(workspaceId)
    .populate("creator", "name email");

  if (!workspace) {
    return res.status(404).json({
      success: false,
      message: "Workspace not found",
    });
  }

  return res.status(200).json({
    success: true,
    workspace: {
      ...workspace.toObject(),
      membershipRole: membership.role,
    },
  });
});
