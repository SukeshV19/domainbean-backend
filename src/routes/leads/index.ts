import { Router } from 'express';
import { GET, POST } from './route';

const router = Router();

// GET /leads?userId=xxx - Fetch leads for a user
router.get('/', GET);

// POST /leads - Create a new lead
router.post('/', POST);

export default router;