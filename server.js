const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();

// ✅ Enable JSON body parsing
app.use(express.json());

// ✅ Enable CORS for frontend requests
app.use(cors());

// ✅ Route import
const claimRoute = require("./claim");

// ✅ Use route
app.use("/claim", claimRoute);

// ✅ Default route (optional)
app.get("/", (req, res) => {
  res.send("✅ Claim backend is running");
});

// ✅ Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server started on port ${PORT}`);
});
