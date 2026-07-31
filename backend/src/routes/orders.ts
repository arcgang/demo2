import { Router, Request, Response } from 'express';
import { buildStatusResponse } from '../modules/activation/statusScenarios';

const router = Router();

router.get('/:id/status', (req: Request, res: Response) => {
  const { id } = req.params;
  const scenario = req.query.scenario as string | undefined;

  if (!scenario) {
    res.status(404).json({ errorCode: 'SCENARIO_REQUIRED', message: 'Query parameter ?scenario is required for stub responses.' });
    return;
  }

  const response = buildStatusResponse(id, scenario);
  if (!response) {
    res.status(404).json({ errorCode: 'SCENARIO_NOT_FOUND', message: `Unknown scenario: ${scenario}` });
    return;
  }

  res.status(200).json(response);
});

export default router;
