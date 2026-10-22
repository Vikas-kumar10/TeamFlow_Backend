
import mongoose from "mongoose";
import WorkspaceMember from "../models/WorkspaceMember.js";

const requireWorkspace = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;

    if (!workspaceId || !mongoose.isValidObjectId(workspaceId)) {
      return res.status(400).json({
        success: false,
        message: "Valid workspace ID is required",
      });
    }

    // authenticate middleware should run before this middleware.
    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        message: "User authentication required",
      });
    }

    // console.log("Workspace ID:", workspaceId);
    // console.log("Logged-in User ID:", req.user._id);

    const membership = await WorkspaceMember.findOne({
      workspace: workspaceId,
      user: req.user._id,
      status: "active",
    });

    // console.log("Membership found:", membership);

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: "You are not an active member of this workspace",
      });
    }

    req.workspaceMember = membership;
    req.workspaceId = workspaceId;

    next();
  } catch (error) {
    next(error);
  }
};

export default requireWorkspace;
