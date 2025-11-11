import axios from 'axios';

const NPPES_API_URL = 'https://npiregistry.cms.hhs.gov/api/';

export interface NPPESResult {
  number: string;
  enumeration_type: string;
  basic: {
    first_name: string;
    last_name: string;
    middle_name?: string;
    credential: string;
    sole_proprietor: string;
    gender: string;
    enumeration_date: string;
    last_updated: string;
    status: string;
    name?: string; // For organizations
  };
  taxonomies: Array<{
    code: string;
    desc: string;
    primary: boolean;
    state: string;
    license: string;
  }>;
  addresses: Array<{
    country_code: string;
    country_name: string;
    address_purpose: string;
    address_type: string;
    address_1: string;
    address_2?: string;
    city: string;
    state: string;
    postal_code: string;
    telephone_number: string;
    fax_number?: string;
  }>;
}

export interface NPPESResponse {
  result_count: number;
  results: NPPESResult[];
}

/**
 * Verify doctor NPI number via NPPES API
 */
export async function verifyNPI(npiNumber: string): Promise<NPPESResult | null> {
  // Allow test NPIs in development mode
  if (process.env.NODE_ENV === 'development' && npiNumber === '1234567890') {
    return {
      number: '1234567890',
      enumeration_type: 'NPI-1',
      basic: {
        first_name: 'Sarah',
        last_name: 'Smith',
        credential: 'MD',
        sole_proprietor: 'YES',
        gender: 'F',
        enumeration_date: '2015-01-01',
        last_updated: '2024-01-01',
        status: 'A',
      },
      taxonomies: [
        {
          code: '207Q00000X',
          desc: 'Family Medicine',
          primary: true,
          state: 'CA',
          license: 'MD12345',
        },
      ],
      addresses: [
        {
          country_code: 'US',
          country_name: 'United States',
          address_purpose: 'LOCATION',
          address_type: 'DOM',
          address_1: '123 Main St',
          city: 'San Francisco',
          state: 'CA',
          postal_code: '94102',
          telephone_number: '555-1234',
        },
      ],
    };
  }

  try {
    const response = await axios.get<NPPESResponse>(NPPES_API_URL, {
      params: {
        number: npiNumber,
        version: '2.1',
      },
    });

    if (response.data.result_count > 0) {
      return response.data.results[0];
    }

    return null;
  } catch (error) {
    console.error('NPPES verification failed:', error);
    throw new Error('Failed to verify NPI number');
  }
}

/**
 * Search doctors by name and state
 */
export async function searchNPPES(
  firstName: string,
  lastName: string,
  state?: string
): Promise<NPPESResult[]> {
  try {
    const params: any = {
      first_name: firstName,
      last_name: lastName,
      version: '2.1',
      enumeration_type: 'NPI-1', // Individual providers only
    };

    if (state) {
      params.state = state;
    }

    const response = await axios.get<NPPESResponse>(NPPES_API_URL, { params });

    return response.data.results || [];
  } catch (error) {
    console.error('NPPES search failed:', error);
    return [];
  }
}

/**
 * Extract specialty from NPPES taxonomy
 */
export function extractSpecialty(result: NPPESResult): string {
  const primaryTaxonomy = result.taxonomies.find(t => t.primary);
  return primaryTaxonomy?.desc || result.taxonomies[0]?.desc || 'General Practice';
}

/**
 * Validate doctor data against NPPES
 */
export async function validateDoctorData(
  npiNumber: string,
  firstName: string,
  lastName: string,
  licenseState: string
): Promise<{
  valid: boolean;
  message?: string;
  nppesData?: NPPESResult;
}> {
  const result = await verifyNPI(npiNumber);

  if (!result) {
    return {
      valid: false,
      message: 'NPI number not found in NPPES database',
    };
  }

  // Check if it's an individual (not organization)
  if (result.enumeration_type !== 'NPI-1') {
    return {
      valid: false,
      message: 'NPI must be for an individual provider, not an organization',
    };
  }

  // Check if active
  if (result.basic.status !== 'A') {
    return {
      valid: false,
      message: 'NPI is not active',
    };
  }

  // Fuzzy name match (case-insensitive, ignore middle names)
  const nppesFirstName = result.basic.first_name.toLowerCase();
  const nppesLastName = result.basic.last_name.toLowerCase();
  const providedFirstName = firstName.toLowerCase();
  const providedLastName = lastName.toLowerCase();

  if (nppesFirstName !== providedFirstName || nppesLastName !== providedLastName) {
    return {
      valid: false,
      message: `Name mismatch: NPPES has ${result.basic.first_name} ${result.basic.last_name}`,
    };
  }

  // Check if licensed in the provided state
  const hasLicenseInState = result.taxonomies.some(
    t => t.state === licenseState && t.license
  );

  if (!hasLicenseInState) {
    return {
      valid: false,
      message: `No active license found in ${licenseState}`,
    };
  }

  return {
    valid: true,
    nppesData: result,
  };
}
