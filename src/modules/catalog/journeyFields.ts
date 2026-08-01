export type InputType = 'text' | 'email' | 'tel' | 'select' | 'password' | 'checkbox';

export interface FieldDefinition {
  name: string;
  label: string;
  inputType: InputType;
  required: boolean;
  collectionStep: number;
}

type JourneyType = 'purchase' | 'onboarding' | 'activation';

const PURCHASE_FIELDS: FieldDefinition[] = [
  { name: 'firstName', label: 'First Name', inputType: 'text', required: true, collectionStep: 1 },
  { name: 'lastName', label: 'Last Name', inputType: 'text', required: true, collectionStep: 1 },
  { name: 'email', label: 'Email Address', inputType: 'email', required: true, collectionStep: 1 },
  { name: 'phone', label: 'Phone Number', inputType: 'tel', required: true, collectionStep: 1 },
  { name: 'deliveryAddress', label: 'Delivery Address', inputType: 'text', required: true, collectionStep: 1 },
  { name: 'marketingConsent', label: 'Marketing Consent', inputType: 'checkbox', required: false, collectionStep: 1 },
  { name: 'paymentToken', label: 'Payment Method', inputType: 'text', required: true, collectionStep: 2 },
  { name: 'billingPostalCode', label: 'Billing Postal Code', inputType: 'text', required: false, collectionStep: 2 },
];

const ONBOARDING_FIELDS: FieldDefinition[] = [
  { name: 'firstName', label: 'First Name', inputType: 'text', required: true, collectionStep: 1 },
  { name: 'lastName', label: 'Last Name', inputType: 'text', required: true, collectionStep: 1 },
  { name: 'email', label: 'Email Address', inputType: 'email', required: true, collectionStep: 1 },
  { name: 'phone', label: 'Phone Number', inputType: 'tel', required: true, collectionStep: 1 },
  { name: 'deliveryAddress', label: 'Delivery Address', inputType: 'text', required: true, collectionStep: 1 },
  { name: 'paymentToken', label: 'Payment Method', inputType: 'text', required: true, collectionStep: 2 },
  { name: 'idDocumentType', label: 'Identity Document Type', inputType: 'select', required: true, collectionStep: 3 },
  { name: 'idDocumentNumber', label: 'Identity Document Number', inputType: 'text', required: true, collectionStep: 3 },
  { name: 'addressLine1', label: 'Residential Address Line 1', inputType: 'text', required: true, collectionStep: 3 },
  { name: 'city', label: 'City', inputType: 'text', required: true, collectionStep: 3 },
  { name: 'postalCode', label: 'Postal Code', inputType: 'text', required: false, collectionStep: 3 },
  { name: 'portingMsisdn', label: 'Number to Port', inputType: 'tel', required: false, collectionStep: 3 },
  { name: 'marketingConsent', label: 'Marketing Consent', inputType: 'checkbox', required: false, collectionStep: 3 },
];

const ACTIVATION_FIELDS: FieldDefinition[] = [
  { name: 'eid', label: 'eSIM EID', inputType: 'text', required: true, collectionStep: 1 },
  { name: 'deviceModel', label: 'Device Model', inputType: 'text', required: true, collectionStep: 1 },
  { name: 'activationConfirmation', label: 'Confirm Activation', inputType: 'checkbox', required: true, collectionStep: 1 },
  { name: 'preferredNetwork', label: 'Preferred Network Band', inputType: 'select', required: false, collectionStep: 1 },
];

const REGISTRY: Record<JourneyType, FieldDefinition[]> = {
  purchase: PURCHASE_FIELDS,
  onboarding: ONBOARDING_FIELDS,
  activation: ACTIVATION_FIELDS,
};

export function getJourneyFields(journeyType: string): FieldDefinition[] | null {
  if (!Object.prototype.hasOwnProperty.call(REGISTRY, journeyType)) {
    return null;
  }
  return [...REGISTRY[journeyType as JourneyType]];
}
