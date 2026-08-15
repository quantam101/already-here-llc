import { VerificationBadge } from '@/lib/badges';

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
  },
  {
    id: 'bounce_houses',
    title: 'Bounce houses & party inflatables',
    examples: 'Bounce houses, water slides, obstacle courses, inflatable games, combo units',
    audience: 'Party hosts, event planners, schools, churches, community events, festival organizers'
  },
  {
    id: 'water_sports',
    title: 'Water sports & bicycles',
    examples: 'Kayaks, paddleboards, jet skis, boats, pontoons, bicycles, e-bikes, watersport trailers',
    audience: 'Outdoor enthusiasts, lake/river renters, tourists, fitness groups, event rentals'
  },
  {
    id: 'housing',
    title: 'Apartments & rooms',
    examples: 'Short-term apartments, guest rooms, shared rooms, furnished suites, vacation rentals',
    audience: 'Travelers, students, temporary workers, relocating families, gig workers'
  },
  {
    id: 'storage',
    title: 'Storage & parking',
    examples: 'Self-storage units, parking spaces, garage bays, covered RV/boat storage, warehouse space',
    audience: 'Residents, vehicle owners, small businesses, contractors, fleet operators'
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
  'Bounce house / inflatable',
  'Water slide / inflatable obstacle course',
  'Kayak / paddleboard',
  'Jet ski / personal watercraft',
  'Boat / pontoon',
  'Bicycle / e-bike',
  'Watersport / bike trailer',
  'Apartment / suite',
  'Room / shared room',
  'Vacation rental / guest house',
  'Self-storage unit',
  'Parking space / garage bay',
  'Covered RV / boat storage',
  'Warehouse / commercial space',
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

export const demoListings: Array<{
  id: string;
  title: string;
  category: string;
  type: string;
  price: string;
  status: 'available' | 'waitlist' | 'coming_soon';
  location: string;
  description: string;
  href: string;
  badges: VerificationBadge[];
}> = [
  { id: 'scooter-001', title: 'Gig delivery scooter', category: 'Delivery & gig vehicles', type: 'Scooter', price: '$155/week or $550/month', status: 'available', location: 'Phoenix / Tempe / Scottsdale', description: 'Turnkey scooter for DoorDash, Uber Eats, Grubhub. Cargo box, GPS, helmet, lock, vest, mount, maintenance included.', href: '/scooter-rentals', badges: ['inspection', 'insurance', 'payment'] },
  { id: 'trailer-001', title: 'Utility trailer rental', category: 'Construction & landscaping', type: 'Utility / cargo trailer', price: 'Submit for quote', status: 'coming_soon', location: 'Phoenix metro', description: 'Short-term utility and cargo trailer rentals for contractors, movers, and haulers.', href: '/marketplace', badges: ['identity'] },
  { id: 'rv-001', title: 'Camper van / RV', category: 'Camping & outdoor', type: 'RV / camper van', price: 'Submit for quote', status: 'coming_soon', location: 'Arizona', description: 'Weekend and overland camper van and RV rentals for road trips and outdoor adventures.', href: '/marketplace', badges: ['identity'] },
  { id: 'event-001', title: 'Party / event vehicle', category: 'Parties & celebrations', type: 'Party bus / limo van', price: 'Submit for quote', status: 'coming_soon', location: 'Phoenix metro', description: 'Party buses, limo vans, and specialty vehicles for celebrations, tailgates, and events.', href: '/marketplace', badges: ['identity'] },
  { id: 'farm-001', title: 'Tractor / UTV rental', category: 'Farming & agriculture', type: 'Tractor / UTV', price: 'Submit for quote', status: 'coming_soon', location: 'Phoenix / rural Arizona', description: 'Seasonal tractor, UTV, and farm equipment rentals for ranches, orchards, and farms.', href: '/marketplace', badges: ['identity'] },
  { id: 'food-001', title: 'Food truck / mobile kitchen', category: 'Entertainment & events', type: 'Food truck', price: 'Submit for quote', status: 'coming_soon', location: 'Phoenix metro', description: 'Food truck and mobile kitchen rentals or revenue-share for events, catering, and pop-ups.', href: '/marketplace', badges: ['identity'] },
  { id: 'bounce-001', title: 'Bounce house / water slide', category: 'Bounce houses & party inflatables', type: 'Bounce house / inflatable', price: 'Submit for quote', status: 'coming_soon', location: 'Phoenix metro', description: 'Bounce houses, water slides, obstacle courses, and inflatable games for parties and events.', href: '/marketplace', badges: ['identity'] },
  { id: 'kayak-001', title: 'Kayak / paddleboard rental', category: 'Water sports & bicycles', type: 'Kayak / paddleboard', price: 'Submit for quote', status: 'coming_soon', location: 'Arizona lakes and rivers', description: 'Kayak, paddleboard, and water sport equipment rentals for lake days and river trips.', href: '/marketplace', badges: ['identity'] },
  { id: 'bike-001', title: 'Bicycle / e-bike rental', category: 'Water sports & bicycles', type: 'Bicycle / e-bike', price: 'Submit for quote', status: 'coming_soon', location: 'Phoenix / Tempe / Scottsdale', description: 'Bike and e-bike rentals for commuting, events, tourism, and recreation.', href: '/marketplace', badges: ['identity'] },
  { id: 'apt-001', title: 'Furnished apartment / suite', category: 'Apartments & rooms', type: 'Apartment / suite', price: 'Submit for quote', status: 'coming_soon', location: 'Phoenix metro', description: 'Short-term furnished apartments, guest suites, and vacation rentals.', href: '/marketplace', badges: ['identity'] },
  { id: 'room-001', title: 'Room / shared room', category: 'Apartments & rooms', type: 'Room / shared room', price: 'Submit for quote', status: 'coming_soon', location: 'Phoenix / Tempe / Scottsdale', description: 'Private or shared rooms for gig workers, students, travelers, and temporary stays.', href: '/marketplace', badges: ['identity'] },
  { id: 'storage-001', title: 'Self-storage / garage / parking', category: 'Storage & parking', type: 'Self-storage unit', price: 'Submit for quote', status: 'coming_soon', location: 'Phoenix metro', description: 'Self-storage units, garage bays, parking spaces, and covered storage for vehicles, boats, and RVs.', href: '/marketplace', badges: ['identity'] }
];
