const express = require('express');
const cors = require('cors');
const app = express();
const claim = require('./claim');

app.use(cors());
app.use(express.json());

app.post('/claim', async (req, res) => {
  try {
    const { user, referrer } = req.body;
    const result = await claim.claimSOL(user, referrer);
    res.json({ success: true, result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.listen(3000, () => {
  console.log('Claim API running on port 3000');
});
