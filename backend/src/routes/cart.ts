import { Router, Request, Response } from 'express';
import { resolveSession } from '../modules/upgrade/sessionStore';

const router = Router();

const LINE_ITEMS = {
  device: 18999.00,
  accessories: 998.00,
  activationFee: 0.00,
  plan: 799.00,
};

const VAT_RATE = 0.15;

router.get('/summary', (req: Request, res: Response) => {
  const { state } = resolveSession(req, res);

  const { device, accessories, activationFee, plan } = LINE_ITEMS;
  const subtotal = device + accessories + activationFee;
  const vat = Math.round(subtotal * VAT_RATE * 100) / 100;

  const tradeIn = state.tradeIn as Record<string, unknown> | null;
  const financing = state.financing as Record<string, unknown> | null;

  const notices: Array<{ field: string; message: string }> = [];

  let tradeInCredit: number | undefined;
  if (tradeIn && typeof tradeIn.estimatedCredit === 'number' && tradeIn.estimatedCredit > 0) {
    tradeInCredit = -tradeIn.estimatedCredit;
    if (tradeIn.asyncPending === true) {
      notices.push({
        field: 'tradeInCredit',
        message: 'Final credit subject to device inspection — confirmed after receipt.',
      });
    }
  }

  const total = Math.round((subtotal + vat + (tradeInCredit ?? 0)) * 100) / 100;

  const onceOff: Record<string, number | undefined> = {
    device,
    accessories,
    activationFee,
    subtotal,
    vat,
    total,
  };
  if (tradeInCredit !== undefined) {
    onceOff.tradeInCredit = tradeInCredit;
  }

  let financingSummary: { monthlyAmount: number; termMonths: number; asyncPending: boolean } | undefined;
  if (
    financing &&
    typeof financing.monthlyAmount === 'number' &&
    typeof financing.termMonths === 'number'
  ) {
    const asyncPending = financing.asyncPending === true;
    financingSummary = {
      monthlyAmount: financing.monthlyAmount,
      termMonths: financing.termMonths,
      asyncPending,
    };
    if (asyncPending) {
      notices.push({
        field: 'financing',
        message: 'Financing terms are indicative — final rate confirmed at sign-off.',
      });
    }
  }

  const body: Record<string, unknown> = {
    onceOff,
    recurring: {
      plan,
      monthlySubtotal: plan,
    },
    notices,
  };
  if (financingSummary !== undefined) {
    body.financing = financingSummary;
  }

  res.status(200).json(body);
});

export default router;
