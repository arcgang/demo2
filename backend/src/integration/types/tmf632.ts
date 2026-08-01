/** TMF632 Party Management — resource type definitions. */

export interface RelatedParty {
  id: string;
  href?: string;
  role?: string;
  name?: string;
}

export interface Individual {
  id: string;
  href?: string;
  givenName?: string;
  familyName?: string;
  fullName?: string;
  gender?: string;
  nationality?: string;
  maritalStatus?: string;
  contactMedium?: Array<{ mediumType: string; characteristic: Record<string, string> }>;
}

export interface Organization {
  id: string;
  href?: string;
  name?: string;
  tradingName?: string;
  organizationType?: string;
  status?: string;
}

export interface PartyRole {
  id: string;
  name: string;
  href?: string;
  status?: string;
  engagedParty?: RelatedParty;
}
