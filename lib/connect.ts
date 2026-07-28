export const connectMission = 'Match people with work, contracts, and each other. Drivers, technicians, contractors, event staff, delivery operators, and skilled workers connected with the businesses, vehicle owners, and fleet operators who need them.';

export const connectRoles = [
  { id: 'driver', title: 'Driver / courier', description: 'Delivery drivers, gig drivers, route drivers, CDL and non-CDL couriers.' },
  { id: 'technician', title: 'Technician / mechanic', description: 'Auto, scooter, equipment, trailer, and small-engine repair and maintenance.' },
  { id: 'contractor', title: 'Contractor / laborer', description: 'Construction, landscaping, farm labor, event setup, and general labor.' },
  { id: 'event_staff', title: 'Event staff', description: 'Setup, teardown, drivers, attendants, and support for entertainment and party vehicles.' },
  { id: 'operator', title: 'Equipment operator', description: 'Skid steer, mini excavator, tractor, UTV, and specialty vehicle operators.' },
  { id: 'detailer', title: 'Detailer / cleaner', description: 'Vehicle washing, detailing, sanitation, and turnaround cleaning.' },
  { id: 'dispatcher', title: 'Dispatcher / coordinator', description: 'Route planning, scheduling, and customer coordination.' },
  { id: 'other_skill', title: 'Other skilled role', description: 'Any other skill or service that pairs with vehicle, equipment, or delivery needs.' }
] as const;

export const connectNeeds = [
  { id: 'driver_needed', title: 'Need a driver or courier', description: 'Find vetted drivers for delivery, route, event, or personal driving.' },
  { id: 'technician_needed', title: 'Need a technician or mechanic', description: 'Find repair and maintenance help for vehicles, trailers, and equipment.' },
  { id: 'contractor_needed', title: 'Need contractors or laborers', description: 'Find skilled or general labor for construction, landscaping, farm, or event work.' },
  { id: 'operator_needed', title: 'Need an equipment operator', description: 'Find certified or experienced operators for heavy or specialty equipment.' },
  { id: 'staff_needed', title: 'Need event or support staff', description: 'Find setup, teardown, attendant, and event support staff.' },
  { id: 'detailer_needed', title: 'Need detailer or cleaner', description: 'Find vehicle and equipment cleaning professionals.' },
  { id: 'partner_needed', title: 'Need a partner or co-operator', description: 'Find someone to co-operate, manage, or grow a vehicle or equipment asset.' },
  { id: 'general_work', title: 'General work / contract need', description: 'Any other labor, contract, or service need.' }
] as const;

export const availabilityTypes = [
  'Full-time',
  'Part-time',
  'Nights / weekends',
  'Seasonal',
  'Project-based',
  'On-call',
  'Flexible'
] as const;

export const engagementTypes = [
  'W-2 employment',
  '1099 independent contractor',
  'Temporary / seasonal',
  'Day labor / gig',
  'Revenue-share / partnership',
  'Volunteer / trade',
  'Open'
] as const;
