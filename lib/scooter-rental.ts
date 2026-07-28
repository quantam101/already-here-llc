export const rentalPricing = {
  weeklyRate: 155,
  monthlyRate: 550,
  onboardingCharge: 305,
  securityDeposit: 150,
  firstWeekRent: 155
} as const;

export const baseInclusions = [
  'Registered & inspected scooter',
  'Hard-mounted commercial rear cargo trunk box',
  'Heavy-duty disc brake lock + reminder cable',
  'Standard vibration-dampening phone mount',
  'High-visibility 3M reflective safety vest',
  'Unlimited local mileage within approved 30–40 mile radius',
  'Scheduled routine maintenance'
] as const;

export const addOnItems = [
  { name: 'Wireless fast-charging phone mount', weekly: 5, purchase: null as number | null },
  { name: 'LED flashing active safety vest', weekly: 4, purchase: null },
  { name: 'Touchscreen all-weather riding gloves', weekly: 3, purchase: 25 },
  { name: 'DOT-approved helmet (+ sanitary liner)', weekly: 5, purchase: null }
] as const;

export const replacementFees = [
  { item: 'Rear cargo trunk box', fee: 100, note: 'Includes box, mounting rack, and key/lock barrel' },
  { item: 'Hardwired cellular GPS tracker', fee: 85, note: 'Unit replacement, wiring setup, SIM re-activation' },
  { item: 'DOT-approved helmet', fee: 60, note: 'Must be replaced if dropped or involved in a fall' },
  { item: 'Heavy-duty disc brake lock', fee: 45, note: 'Includes lock body, reminder cable, and keys' },
  { item: 'Ignition key / key fob', fee: 35, note: 'Blank key cutting and pairing labor' },
  { item: 'Phone mount / wireless mount', fee: 30, note: 'Standard or wireless mount replacement' },
  { item: 'High-vis / LED vest', fee: 25, note: 'Vest replacement' },
  { item: 'GPS tampering penalty', fee: 150, note: 'Direct breach; immediate remote vehicle immobilization' }
] as const;

export const ownerResponsibilities = [
  'Engine oil changes every 1,000 miles or 30 days',
  'Standard tire tread and brake pad replacement from normal wear',
  'Routine battery and electrical system health checks',
  'Free 15-minute inspection every 1,000 miles or 30 days'
] as const;

export const renterResponsibilities = [
  'Fuel (gasoline)',
  'Flat tire repairs / punctures sustained during operation',
  'Damage from accidents, drops, crashes, or neglect',
  'All parking, red-light, speed-camera, and moving violations',
  'Tolls and impound fees',
  'Returning scooter in same condition, less normal wear-and-tear'
] as const;

export const fleetFinancials = {
  upfrontEquipmentTotal: 910,
  monthlyOverhead: 119,
  weeklyGrossFullFleet: 465,
  monthlyGrossFullFleet: 1998,
  monthlyAddOnsFullFleet: 36,
  netMonthlyProfitFullFleet: 1915
} as const;
