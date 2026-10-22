import mongoose from "mongoose";
import Project from "../models/Project.js";
import Activity from "../models/Activity.js";

export const getProjectActivities = async (req, res) => {
  const { workspaceId, projectId } = req.params;

  if (!mongoose.isValidObjectId(projectId)) {
    return res.status(400).json({
      success: false,
      message: "Valid project ID is required",
    });
  }

  const project = await Project.findOne({
    _id: projectId,
    workspace: workspaceId,
  }).select("_id");

  if (!project) {
    return res.status(404).json({
      success: false,
      message: "Project not found in this workspace",
    });
  }

  const activities = await Activity.find({
    workspace: workspaceId,
    project: projectId,
  })
    .populate("actor", "name email")
    .populate("task", "title status")
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  return res.status(200).json({
    success: true,
    count: activities.length,
    activities,
  });
};
