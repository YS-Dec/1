const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors()); // ✅ Allow cross-origin requests

app.get("/", (req, res) => {
  res.send("🚀 Hello, Firebase Cloud Run!");
});

// ✅ Listen on PORT 8080 for Cloud Run
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});