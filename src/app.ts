import express from 'express';
import { agentRoutes } from './routes/index.ts';

const app = express();
app.use(express.json());

app.use('/ai', agentRoutes);

const port = 3000;
app.listen(port, () => console.log(`Server running at http://localhost:${port}`));