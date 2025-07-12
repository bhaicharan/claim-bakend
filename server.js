require('dotenv').config();
const express = require('express');
const cors = require('cors');
const claimRoute = require('./claim');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Claim route
app.use('/claim', claimRoute);

// Root route
app.get('/', (req, res) => {
  res.send('✅ Claim Backend is live!');
});

app.listen(PORT, () => {
  console.log(`🟢 Server is running on port ${PORT}`);
});

