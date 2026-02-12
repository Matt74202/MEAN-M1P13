const express = require('express');
const cors = require('cors');
require('dotenv').config();

const routes = require('./routes');

const app = express();

app.use(cors({
  origin: ['http://localhost:4200', process.env.FRONTEND_URL].filter(Boolean),
  credentials: true
}));

app.use(express.json());

app.use('/api', routes);

app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

module.exports = app;