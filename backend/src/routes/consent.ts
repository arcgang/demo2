import { Router, Request, Response } from 'express';
import {
  insertConsent,
  findByUserId,
  CONSENT_TYPES,
  type ConsentType,
} from '../modules/consent/consentStore';

const router = Router();

router.post('/', (req: Request, res: Response) => {
  const { consentType, granted, purposeDescription, sessionId, userId } = req.body as Record<string, unknown>;

  const errors: string[] = [];

  if (!consentType || typeof consentType !== 'string') {
    errors.push('consentType is required');
  } else if (!(CONSENT_TYPES as readonly string[]).includes(consentType)) {
    errors.push(`consentType must be one of: ${CONSENT_TYPES.join(', ')}`);
  }

  if (granted === undefined || granted === null || typeof granted !== 'boolean') {
    errors.push('granted is required and must be a boolean');
  }

  if (!sessionId || typeof sessionId !== 'string') {
    errors.push('sessionId is required');
  }

  if (errors.length > 0) {
    res.status(400).json({ errorCode: 'VALIDATION_ERROR', errors });
    return;
  }

  const record = insertConsent({
    consentType: consentType as ConsentType,
    granted: granted as boolean,
    purposeDescription: purposeDescription != null ? String(purposeDescription) : null,
    sessionId: sessionId as string,
    userId: userId != null ? String(userId) : null,
    ipAddress: req.ip ?? null,
    userAgent: req.headers['user-agent'] ?? null,
  });

  res.status(201).json({
    id: record.id,
    consentType: record.consentType,
    granted: record.granted,
    createdAt: record.createdAt,
  });
});

router.get('/', (req: Request, res: Response) => {
  const { userId } = req.query as Record<string, string | undefined>;

  if (!userId || typeof userId !== 'string' || !userId.trim()) {
    res.status(400).json({ errorCode: 'MISSING_USER_ID', message: 'Query parameter userId is required.' });
    return;
  }

  const records = findByUserId(userId);

  res.status(200).json(
    records.map((r) => ({
      id: r.id,
      consentType: r.consentType,
      granted: r.granted,
      createdAt: r.createdAt,
      userId: r.userId ?? undefined,
      sessionId: r.sessionId,
    })),
  );
});

export default router;
