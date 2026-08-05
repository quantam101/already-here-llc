import { z } from 'zod';

export const gincMemberSchema = z.object({
  type: z.enum(['owner', 'renter', 'worker', 'business']),
  role: z.enum(['admin', 'moderator', 'member']).optional(),
  fullName: z.string().min(1).max(120),
  email: z.string().email().max(160),
  phone: z.string().min(1).max(40),
  city: z.string().min(1).max(120),
  state: z.string().min(1).max(40),
  zip: z.string().max(20).optional().default(''),
  skills: z.string().max(1500).optional().default(''),
  bio: z.string().max(3000).optional().default('')
});

export const gincListingSchema = z.object({
  memberId: z.string().max(40).optional().default(''),
  title: z.string().min(1).max(200),
  category: z.string().min(1).max(120),
  assetType: z.string().min(1).max(80),
  city: z.string().min(1).max(120),
  state: z.string().min(1).max(40),
  price: z.string().min(1).max(80),
  period: z.string().max(80).optional().default(''),
  description: z.string().max(3000).optional().default('')
});

export const gincJobSchema = z.object({
  memberId: z.string().max(40).optional().default(''),
  title: z.string().min(1).max(200),
  category: z.string().min(1).max(120),
  assetType: z.string().max(80).optional().default(''),
  city: z.string().min(1).max(120),
  state: z.string().min(1).max(40),
  schedule: z.string().min(1).max(300),
  budget: z.string().max(80).optional().default(''),
  description: z.string().max(3000).optional().default('')
});

export type GincMemberInput = z.infer<typeof gincMemberSchema>;
export type GincListingInput = z.infer<typeof gincListingSchema>;
export type GincJobInput = z.infer<typeof gincJobSchema>;
