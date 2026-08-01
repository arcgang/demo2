export interface FieldError {
  field: string;
  message: string;
}

const TOP_LEVEL_REQUIRED = ['orderId', 'customerId', 'type'] as const;
const IDENTITY_REQUIRED = ['firstName', 'lastName', 'idNumber', 'addressLine1', 'city'] as const;
const VALID_TYPES = new Set(['KYC', 'RICA']);

export function validateVerificationInput(body: Record<string, unknown>): FieldError[] {
  const errors: FieldError[] = [];

  for (const field of TOP_LEVEL_REQUIRED) {
    const v = body[field];
    if (v === undefined || v === null || v === '') {
      errors.push({ field, message: `${field} is required and must not be empty.` });
    }
  }

  if (typeof body.type === 'string' && body.type !== '' && !VALID_TYPES.has(body.type)) {
    errors.push({ field: 'type', message: 'type must be "KYC" or "RICA".' });
  }

  const identity = body.identityFields;
  if (identity === undefined || identity === null || typeof identity !== 'object') {
    errors.push({ field: 'identityFields', message: 'identityFields is required.' });
  } else {
    const id = identity as Record<string, unknown>;
    for (const field of IDENTITY_REQUIRED) {
      const v = id[field];
      if (v === undefined || v === null || v === '') {
        errors.push({ field: `identityFields.${field}`, message: `identityFields.${field} is required and must not be empty.` });
      }
    }
  }

  return errors;
}
