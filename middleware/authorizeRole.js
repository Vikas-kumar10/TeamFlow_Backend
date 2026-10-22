
const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.workspaceMember) {
      return res.status(500).json({
        success: false,
        message:
          "Workspace membership is missing. Use requireWorkspace before authorizeRole.",
      });
    }

    if (!allowedRoles.includes(req.workspaceMember.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action",
      });
    }

    next();
  };
};

export default authorizeRole;
