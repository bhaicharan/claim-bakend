// server.js const express = require("express"); const cors = require("cors"); const dotenv = require("dotenv"); const app = express(); const claimHandler = require("./claim");

// Load env dotenv.config();

app.use(cors({ origin: '*', methods: ['GET', 'POST'], allowedHeaders: ['Content-Type'] })); app.use(express.json());

app.post("/claim", claimHandler);

const PORT = process.env.PORT || 3000; app.listen(PORT, () => { console.log("✅ Claim API running on port " + PORT); });
