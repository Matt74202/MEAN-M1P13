const express = require('express');
const cors = require('cors');
require('dotenv').config();

const routes = require('./routes');

const app = express();

/**
 * CORS – prêt pour Netlify / Vercel (HTTPS)
 */
app.use(
  cors({
    origin: [
      'http://localhost:4200',
      process.env.FRONTEND_URL
    ],
    credentials: true
  })
);

app.use(express.json());

app.use('/api', routes);

module.exports = app;
