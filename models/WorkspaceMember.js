
import mongoose from "mongoose";

const workspaceMemberSchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: [true, "Workspace ID is required"],
      index: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },

    role: {
      type: String,
      enum: ["admin", "manager", "member"],
      default: "member",
      required: true,
    },

    status: {
      type: String,
      enum: ["active", "pending", "suspended"],
      default: "active",
      required: true,
    },

    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// A user can have only one membership per workspace.
workspaceMemberSchema.index(
  { workspace: 1, user: 1 },
   { unique: true }
);

// Helpful for finding members by workspace and role.
workspaceMemberSchema.index({
  workspace: 1,
  role: 1,
  status: 1,
});

const WorkspaceMember = mongoose.model(
  "WorkspaceMember",
  workspaceMemberSchema
);

export default WorkspaceMember;
