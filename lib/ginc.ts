export const gincConfig = {
  name: 'GINC',
  fullName: 'Growth & Interconnected Networks Collective',
  tagline: 'A DBA of Already Here LLC',
  mission:
    'Connect people, vehicles, equipment, and work across every state. Turn idle assets into income and turn one-time jobs into lasting working relationships.',
  url: '/ginc'
};

export const gincCategories = [
  'Delivery & gig vehicles',
  'Farming & agriculture',
  'Construction & landscaping',
  'Entertainment & events',
  'Camping & outdoor',
  'Parties & celebrations',
  'Bounce houses & party inflatables',
  'Water sports & bicycles',
  'Apartments & rooms',
  'Storage & parking',
  'Fleet & commercial overflow',
  'Specialty & unique',
  'Labor / work crew',
  'Roofing / trades',
  'Delivery / courier work',
  'General help / miscellaneous'
];

export const gincAssetTypes = [
  'Scooter / moped',
  'Motorcycle',
  'Car',
  'SUV',
  'Van / cargo van',
  'Box truck',
  'Pickup truck',
  'Trailer',
  'RV / camper',
  'ATV / UTV',
  'Tractor / farm equipment',
  'Skid steer / mini excavator',
  'Food truck',
  'Party bus / limo',
  'Bounce house / inflatable',
  'Kayak / paddleboard / boat',
  'Bicycle / e-bike',
  'Tools / equipment',
  'Apartment / room',
  'Storage / parking',
  'Other'
];

export type GincMemberType = 'owner' | 'renter' | 'worker' | 'business';

export interface GincMember {
  id: string;
  type: GincMemberType;
  fullName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  zip: string;
  skills?: string;
  bio?: string;
  createdAt: string;
}

export interface GincListing {
  id: string;
  memberId: string;
  title: string;
  category: string;
  assetType: string;
  city: string;
  state: string;
  price: string;
  period: string;
  description: string;
  status: 'available' | 'rented' | 'sold' | 'unavailable';
  createdAt: string;
}

export interface GincJob {
  id: string;
  memberId: string;
  title: string;
  category: string;
  assetType: string;
  city: string;
  state: string;
  schedule: string;
  budget: string;
  description: string;
  status: 'open' | 'filled' | 'closed';
  createdAt: string;
}

export interface GincNetwork {
  members: GincMember[];
  listings: GincListing[];
  jobs: GincJob[];
}

export interface GincMatch {
  score: number;
  listing?: GincListing;
  job?: GincJob;
  member?: GincMember;
  reason: string;
}
