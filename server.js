const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();

// ✅ Middleware
app.use(express.json());
app.use(cors());

// ✅ Routes
const claimRoute = require("./claim");
app.use("/claim", claimRoute);

// ✅ Default route
app.get("/", (req, res) => {
  res.send("✅ Claim backend is running");
});

// ✅ Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(🚀 Server running on port ${PORT});
});
