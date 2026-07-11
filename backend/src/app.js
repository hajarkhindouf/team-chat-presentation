const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const chatRoutes = require('./routes/chat');
const pollRoutes = require('./routes/poll');

function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('tiny'));
  }

  app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', service: 'chat-backend' });
  });

  app.use('/api/chat', chatRoutes);
  app.use('/api/chat', pollRoutes);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: 'not found' });
  });

  // Error handler
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  });

  return app;
}

module.exports = { createApp };
