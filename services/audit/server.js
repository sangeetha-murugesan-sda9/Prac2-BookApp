const express = require('express');
const cors = require('cors');
const eventsRouter = require('./routes/events');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/', eventsRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'audit' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`audit service running on http://localhost:${PORT}`);
  });
}

module.exports = app;
