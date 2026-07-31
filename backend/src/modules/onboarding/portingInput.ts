export interface PortingInput {
  marketCode: string;
  donorNetwork: string;
  accountHolderName: string;
  accountNumber: string;
  idNumber: string;
  portingReference?: string;
}

export interface FieldError {
  field: string;
  message: string;
}

const REQUIRED_FIELDS: Array<keyof Omit<PortingInput, 'portingReference'>> = [
  'marketCode',
  'donorNetwork',
  'accountHolderName',
  'accountNumber',
  'idNumber',
];

export function validatePortingInput(body: Record<string, unknown>): FieldError[] {
  const errors: FieldError[] = [];
  for (const field of REQUIRED_FIELDS) {
    const value = body[field];
    if (value === undefined || value === null || value === '') {
      errors.push({ field, message: `${field} is required and must not be empty.` });
    }
  }
  return errors;
}
