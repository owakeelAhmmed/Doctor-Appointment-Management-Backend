export function notFound(req, res, next) {
  res.status(404).json({ message: "Route not found" });
}

export function errorHandler(err, req, res, next) {
  console.error("❌ Error:", err);
  res.status(err.statusCode || 500).json({
    message: err.message || "Internal Server Error",
  });
}