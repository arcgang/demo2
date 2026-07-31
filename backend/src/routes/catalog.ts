import { Router, Request, Response } from 'express';
import { getSimEsimCatalog } from '../modules/catalog/simEsimCatalog';

const router = Router();

router.get('/sim-esim', (_req: Request, res: Response) => {
  res.status(200).json(getSimEsimCatalog());
});

export default router;
