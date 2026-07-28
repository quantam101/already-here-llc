export const marketplaceMission = 'One place to list, rent, lease, sell, share, or request any vehicle or fleet asset — from scooters and delivery vehicles to farm equipment, construction machines, party and entertainment vehicles, RVs, trailers, and fleet overflow.';

export const marketplaceCategories = [
  {
    id: 'delivery',
    title: 'Delivery & gig vehicles',
    examples: 'Scooters, cargo vans, box trucks, refrigerated vans',
    audience: 'DoorDash, Uber Eats, Grubhub, Amazon Flex, couriers, last-mile fleets'
  },
  {
    id: 'farming',
    title: 'Farming & agriculture',
    examples: 'Tractors, UTVs, ATVs, sprayers, harvest attachments, flatbed trailers',
    audience: 'Small farms, ranches, orchards, agricultural contractors'
  },
  {
    id: 'construction',
    title: 'Construction & landscaping',
    examples: 'Skid steers, mini excavators, dump trailers, utility trailers, work trucks',
    audience: 'Contractors, landscapers, handymen, remodelers'
  },
  {
    id: 'entertainment',
    title: 'Entertainment & events',
    examples: 'Party buses, sprinter vans, mobile stages, food trucks, AV vehicles',
    audience: 'Event planners, promoters, DJs, caterers, production companies'
  },
  {
    id: 'camping',
    title: 'Camping & outdoor',
    examples: 'RVs, camper vans, trailers, rooftop tents, overland rigs',
    audience: 'Campers, overlanders, outdoor renters, weekend travelers'
  },
  {
    id: 'parties',
    title: 'Parties & celebrations',
    examples: 'Limo-style vans, mobile bars, photo-booth trailers, tailgate setups',
    audience: 'Party hosts, wedding planners, tailgaters, social clubs'
  },
  {
    id: 'fleet',
    title: 'Fleet & commercial overflow',
    examples: 'Cars, trucks, vans, trailers available by the week or month',
    audience: 'Fleet operators, rental companies, logistics firms, corporate transportation'
  },
  {
    id: 'specialty',
    title: 'Specialty & unique',
    examples: 'Classic cars, motorcycles, scooters, vintage trucks, mobile workshops',
    audience: 'Enthusiasts, collectors, creators, marketers, film productions'
  }
] as const;

export const arrangementTypes = [
  { id: 'rent', label: 'Short-term rental' },
  { id: 'lease', label: 'Weekly / monthly lease' },
  { id: 'sell', label: 'Sale' },
  { id: 'revenue_share', label: 'Revenue-share' },
  { id: 'managed_fleet', label: 'Managed fleet partnership' },
  { id: 'service', label: 'Service / maintenance contract' }
] as const;

export const vehicleTypes = [
  'Scooter / moped',
  'Motorcycle',
  'Car',
  'SUV',
  'Van / cargo van',
  'Box truck',
  'Pickup truck',
  'Trailer (utility / cargo / flatbed)',
  'RV / motorhome',
  'Camper van',
  'ATV / UTV',
  'Tractor / farm equipment',
  'Skid steer / mini excavator',
  'Food truck / mobile kitchen',
  'Party bus / limo van',
  'Off-road vehicle / UTV / ATV',
  'Jeep / 4x4 / overland rig',
  'Sand rail / dune buggy',
  'Dirt bike',
  'Side-by-side',
  'Car hauler / equipment trailer',
  'ATV / motorcycle trailer',
  'Boat / watercraft trailer',
  'Specialty / other'
] as const;

export const fleetMarketplaceFeatures = [
  'List any vehicle, trailer, or equipment asset',
  'Request vehicles or capacity by category and schedule',
  'Screened owners, operators, and renters',
  'Insurance, contract, and responsibility verification',
  'Maintenance and inspection coordination',
  'GPS, telematics, and condition documentation support'
] as const;

export const howItWorks = [
  ['Submit', 'Tell us what you have or what you need. Category, vehicle type, schedule, and budget.'],
  ['Screen', 'We review ownership, registration, insurance, condition, and fit.'],
  ['Match', 'Qualified supply is matched to qualified demand in the operating database.'],
  ['Operate', 'Written agreement, payment terms, and operating rules are confirmed before any handoff.'],
  ['Track', 'Condition photos, inspection checkpoints, and telemetry keep both sides protected.']
] as const;
