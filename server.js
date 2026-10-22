
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";

import connectDB from "./config/db.js";

import authRoutes from "./routes/auth.routes.js";
import workspaceRoutes from "./routes/workspace.routes.js";
import workspaceMemberRoutes from "./routes/workspaceMember.routes.js";
import projectRoutes from "./routes/project.routes.js";
import taskRoutes from "./routes/task.routes.js";
import activityRoutes from "./routes/activity.routes.js";
import commentRoutes from "./routes/comment.routes.js";

const app = express();

// Allowed frontend origins
const allowedOrigins = (
  process.env.CLIENT_URL || "http://localhost:5173"
)
  .split(",")
  .map((url) => url.trim())
  .filter(Boolean);

// Middleware
app.use(
  cors({
    origin(origin, callback) {
      // Allow Postman, server-to-server requests, and requests without Origin.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked origin: ${origin}`));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "TeamFlow API is running",
  });
});

// Authentication APIs
app.use("/api/auth", authRoutes);

// Workspace APIs
app.use("/api/workspaces", workspaceRoutes);

// Workspace member APIs
app.use(
  "/api/workspaces/:workspaceId/members",
  workspaceMemberRoutes
);

// Project APIs
app.use(
  "/api/workspaces/:workspaceId/projects",
  projectRoutes
);

// Task APIs
app.use(
  "/api/workspaces/:workspaceId/projects/:projectId/tasks",
  taskRoutes
);

// Activity history APIs
app.use(
  "/api/workspaces/:workspaceId/projects/:projectId/activities",
  activityRoutes
);

// Task comment APIs
app.use(
  "/api/workspaces/:workspaceId/projects/:projectId/tasks/:taskId/comments",
  commentRoutes
);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("API Error:", err.message);

  if (res.headersSent) {
    return next(err);
  }

  // CORS errors
  if (err.message.startsWith("CORS blocked origin:")) {
    return res.status(403).json({
      success: false,
      message: "This frontend origin is not allowed by CORS",
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message || "Internal server error",
  });
});

// Start server after database connection
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`TeamFlow API running on port ${PORT}`);
      console.log(`Allowed origins: ${allowedOrigins.join(", ")}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
};

startServer();
