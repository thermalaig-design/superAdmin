import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';

import routes from './src/routes/index.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5005;

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api', routes);

app.use((_req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
