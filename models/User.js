
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please enter a valid email address",
      ],
    },

    role: {
      type: String,
      enum: ["Member", "Manager", "Admin"],
      default: "Member",
    },
    title: { type: String, default: "Team Member", trim: true },
    department: { type: String, default: "", trim: true },
    location: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    bio: { type: String, default: "", trim: true },
    avatar: { type: String, default: "" },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    notificationPrefs: { type: mongoose.Schema.Types.Mixed, default: {} },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

export default User;
