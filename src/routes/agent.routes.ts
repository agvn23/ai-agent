import { Router } from 'express';
import { agentController } from '../controllers/index.ts';

const router = Router();

router.post('/agent', agentController);

export default router;