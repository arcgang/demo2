export type InputType = 'text' | 'email' | 'tel' | 'select' | 'password' | 'checkbox';

export interface FieldDefinition {
  name: string;
  label: string;
  inputType: InputType;
  required: boolean;
  businessPurpose: string;
  collectionStep: number;
}

export type JourneyType = 'purchase' | 'onboarding' | 'activation';

// ---------------------------------------------------------------------------
// Purchase journey: customer details (step 1) + payment tokenization (step 2)
// ---------------------------------------------------------------------------

const PURCHASE_FIELDS: FieldDefinition[] = [
  // Step 1 — customer details
  {
    name: 'firstName',
    label: 'First Name',
    inputType: 'text',
    required: true,
    businessPurpose: 'Customer identification for order and delivery records.',
    collectionStep: 1,
  },
  {
    name: 'lastName',
    label: 'Last Name',
    inputType: 'text',
    required: true,
    businessPurpose: 'Customer identification for order and delivery records.',
    collectionStep: 1,
  },
  {
    name: 'email',
    label: 'Email Address',
    inputType: 'email',
    required: true,
    businessPurpose: 'Order confirmation and transactional communication.',
    collectionStep: 1,
  },
  {
    name: 'phone',
    label: 'Phone Number',
    inputType: 'tel',
    required: true,
    businessPurpose: 'Contact number for order confirmation and delivery coordination.',
    collectionStep: 1,
  },
  {
    name: 'deliveryAddress',
    label: 'Delivery Address',
    inputType: 'text',
    required: true,
    businessPurpose: 'Physical delivery of purchased device or SIM card.',
    collectionStep: 1,
  },
  {
    name: 'marketingConsent',
    label: 'Marketing Consent',
    inputType: 'checkbox',
    required: false,
    businessPurpose: '',
    collectionStep: 1,
  },
  // Step 2 — payment tokenization
  {
    name: 'paymentToken',
    label: 'Payment Method',
    inputType: 'text',
    required: true,
    businessPurpose: 'PCI-DSS compliant payment tokenization for order settlement. Raw card data is never stored.',
    collectionStep: 2,
  },
  {
    name: 'billingPostalCode',
    label: 'Billing Postal Code',
    inputType: 'text',
    required: false,
    businessPurpose: '',
    collectionStep: 2,
  },
];

// ---------------------------------------------------------------------------
// Onboarding journey: customer details (step 1) + payment (step 2) + RICA/KYC identity (step 3)
// ---------------------------------------------------------------------------

const ONBOARDING_FIELDS: FieldDefinition[] = [
  // Step 1 — customer details (same as purchase)
  {
    name: 'firstName',
    label: 'First Name',
    inputType: 'text',
    required: true,
    businessPurpose: 'Customer identification for SIM/eSIM registration and order records.',
    collectionStep: 1,
  },
  {
    name: 'lastName',
    label: 'Last Name',
    inputType: 'text',
    required: true,
    businessPurpose: 'Customer identification for SIM/eSIM registration and order records.',
    collectionStep: 1,
  },
  {
    name: 'email',
    label: 'Email Address',
    inputType: 'email',
    required: true,
    businessPurpose: 'Order confirmation and transactional communication.',
    collectionStep: 1,
  },
  {
    name: 'phone',
    label: 'Phone Number',
    inputType: 'tel',
    required: true,
    businessPurpose: 'RICA identification and primary contact number for the new SIM.',
    collectionStep: 1,
  },
  {
    name: 'deliveryAddress',
    label: 'Delivery Address',
    inputType: 'text',
    required: true,
    businessPurpose: 'Physical delivery of SIM card or onboarding kit.',
    collectionStep: 1,
  },
  // Step 2 — payment tokenization (gate before identity)
  {
    name: 'paymentToken',
    label: 'Payment Method',
    inputType: 'text',
    required: true,
    businessPurpose: 'PCI-DSS compliant payment tokenization. Payment must be confirmed before identity verification proceeds.',
    collectionStep: 2,
  },
  // Step 3 — RICA/KYC identity fields (gated behind payment)
  {
    name: 'idDocumentType',
    label: 'Identity Document Type',
    inputType: 'select',
    required: true,
    businessPurpose: 'RICA regulatory identification — required by South African law to register a SIM card.',
    collectionStep: 3,
  },
  {
    name: 'idDocumentNumber',
    label: 'Identity Document Number',
    inputType: 'text',
    required: true,
    businessPurpose: 'RICA regulatory identification — the document number is used to verify customer identity as mandated by the Regulation of Interception of Communications Act.',
    collectionStep: 3,
  },
  {
    name: 'addressLine1',
    label: 'Residential Address Line 1',
    inputType: 'text',
    required: true,
    businessPurpose: 'RICA verification — residential address is required for SIM registration compliance.',
    collectionStep: 3,
  },
  {
    name: 'city',
    label: 'City',
    inputType: 'text',
    required: true,
    businessPurpose: 'RICA verification — residential city required for identity and address confirmation.',
    collectionStep: 3,
  },
  {
    name: 'postalCode',
    label: 'Postal Code',
    inputType: 'text',
    required: false,
    businessPurpose: '',
    collectionStep: 3,
  },
  {
    name: 'portingMsisdn',
    label: 'Number to Port',
    inputType: 'tel',
    required: false,
    businessPurpose: '',
    collectionStep: 3,
  },
  {
    name: 'marketingConsent',
    label: 'Marketing Consent',
    inputType: 'checkbox',
    required: false,
    businessPurpose: '',
    collectionStep: 3,
  },
];

// ---------------------------------------------------------------------------
// Activation journey: eSIM-only subset — device EID + confirmation
// ---------------------------------------------------------------------------

const ACTIVATION_FIELDS: FieldDefinition[] = [
  {
    name: 'eid',
    label: 'eSIM EID',
    inputType: 'text',
    required: true,
    businessPurpose: 'eSIM Identifier (EID) uniquely identifies the embedded SIM hardware for profile provisioning and activation.',
    collectionStep: 1,
  },
  {
    name: 'deviceModel',
    label: 'Device Model',
    inputType: 'text',
    required: true,
    businessPurpose: 'Device model is required to validate eSIM compatibility and provision the correct activation profile.',
    collectionStep: 1,
  },
  {
    name: 'activationConfirmation',
    label: 'Confirm Activation',
    inputType: 'checkbox',
    required: true,
    businessPurpose: 'Explicit customer confirmation is required before eSIM profile download to comply with consent and audit requirements.',
    collectionStep: 1,
  },
  {
    name: 'preferredNetwork',
    label: 'Preferred Network Band',
    inputType: 'select',
    required: false,
    businessPurpose: '',
    collectionStep: 1,
  },
];

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

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
