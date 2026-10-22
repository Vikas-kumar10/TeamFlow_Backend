
import mongoose from "mongoose";
import User from "../models/User.js";
import Workspace from "../models/Workspace.js";
import WorkspaceMember from "../models/WorkspaceMember.js";
import asyncHandler from "../utils/asyncHandler.js";

// Helper: check whether current user is an active workspace admin
const requireWorkspaceAdmin = async (workspaceId, userId) => {
  const membership = await WorkspaceMember.findOne({
    workspace: workspaceId,
    user: userId,
    role: "admin",
    status: "active",
  });

  return membership;
};

// POST /api/workspaces/:workspaceId/members
export const addWorkspaceMember = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const { email, role } = req.body;

  if (!mongoose.isValidObjectId(workspaceId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid workspace ID",
    });
  }

  const admin = await requireWorkspaceAdmin(
    workspaceId,
    req.user._id
  );

  if (!admin) {
    return res.status(403).json({
      success: false,
      message: "Only workspace admins can add members",
    });
  }

  if (typeof email !== "string" || !email.trim()) {
    return res.status(400).json({
      success: false,
      message: "Member email is required",
    });
  }

  const allowedRoles = ["manager", "member"];

  if (role !== undefined && !allowedRoles.includes(role)) {
    return res.status(400).json({
      success: false,
      message: "New members can be assigned manager or member role",
    });
  }

  const workspace = await Workspace.findById(workspaceId);

  if (!workspace) {
    return res.status(404).json({
      success: false,
      message: "Workspace not found",
    });
  }

  const user = await User.findOne({
    email: email.trim().toLowerCase(),
    isActive: true,
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "Active registered user not found for this email",
    });
  }

  const existingMembership = await WorkspaceMember.findOne({
    workspace: workspaceId,
    user: user._id,
  });

  if (existingMembership) {
    return res.status(409).json({
      success: false,
      message: "This user already has a membership in this workspace",
    });
  }

  const membership = await WorkspaceMember.create({
    workspace: workspaceId,
    user: user._id,
    role: role || "member",
    status: "active",
    invitedBy: req.user._id,
    joinedAt: new Date(),
  });

  await membership.populate("user", "name email");

  return res.status(201).json({
    success: true,
    message: "Workspace member added successfully",
    membership,
  });
});

// GET /api/workspaces/:workspaceId/members
export const getWorkspaceMembers = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;

  if (!mongoose.isValidObjectId(workspaceId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid workspace ID",
    });
  }

  const currentMembership = await WorkspaceMember.findOne({
    workspace: workspaceId,
    user: req.user._id,
    status: "active",
  });

  if (!currentMembership) {
    return res.status(403).json({
      success: false,
      message: "You are not an active member of this workspace",
    });
  }

  const members = await WorkspaceMember.find({
    workspace: workspaceId,
    status: { $ne: "suspended" },
  })
    .populate("user", "name email")
    .populate("invitedBy", "name email")
    .sort({ createdAt: 1 });

  return res.status(200).json({
    success: true,
    count: members.length,
    members,
  });
});

// PATCH /api/workspaces/:workspaceId/members/:userId/role
export const updateWorkspaceMemberRole = asyncHandler(
  async (req, res) => {
    const { workspaceId, userId } = req.params;
    const { role } = req.body;

    if (
      !mongoose.isValidObjectId(workspaceId) ||
      !mongoose.isValidObjectId(userId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid workspace ID or user ID",
      });
    }

    const admin = await requireWorkspaceAdmin(
      workspaceId,
      req.user._id
    );

    if (!admin) {
      return res.status(403).json({
        success: false,
        message: "Only workspace admins can change member roles",
      });
    }

    if (!["manager", "member"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Role must be manager or member",
      });
    }

    if (req.user._id.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: "You cannot change your own role",
      });
    }

    const membership = await WorkspaceMember.findOne({
      workspace: workspaceId,
      user: userId,
      status: { $ne: "suspended" },
    });

    if (!membership) {
      return res.status(404).json({
        success: false,
        message: "Workspace member not found",
      });
    }

    if (membership.role === "admin") {
      return res.status(403).json({
        success: false,
        message: "This endpoint cannot change an admin's role",
      });
    }

    membership.role = role;
    await membership.save();

    await membership.populate("user", "name email");

    return res.status(200).json({
      success: true,
      message: "Member role updated successfully",
      membership,
    });
  }
);

// DELETE /api/workspaces/:workspaceId/members/:userId
export const removeWorkspaceMember = asyncHandler(
  async (req, res) => {
    const { workspaceId, userId } = req.params;

    if (
      !mongoose.isValidObjectId(workspaceId) ||
      !mongoose.isValidObjectId(userId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid workspace ID or user ID",
      });
    }

    const admin = await requireWorkspaceAdmin(
      workspaceId,
      req.user._id
    );

    if (!admin) {
      return res.status(403).json({
        success: false,
        message: "Only workspace admins can remove members",
      });
    }

    if (req.user._id.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: "You cannot remove yourself as workspace admin",
      });
    }

    const membership = await WorkspaceMember.findOne({
      workspace: workspaceId,
      user: userId,
    });

    if (!membership) {
      return res.status(404).json({
        success: false,
        message: "Workspace member not found",
      });
    }

    if (membership.role === "admin") {
      return res.status(403).json({
        success: false,
        message: "An admin cannot be removed through this endpoint",
      });
    }

    await WorkspaceMember.deleteOne({ _id: membership._id });

    return res.status(200).json({
      success: true,
      message: "Workspace member removed successfully",
    });
  }
);
