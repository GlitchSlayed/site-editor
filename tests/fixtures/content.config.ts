import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';
export const ProjectStatus = z.enum([
  'Concept',
  'In Development',
  'Prototype',
  'Completed',
  'Released',
]);

const common = {
  title: z.string(),
  description: z.string(),
  date: z.coerce.date(),
  updated: z.coerce.date().optional(),
  tags: z.array(z.string()),
  category: z.string().optional(),
  draft: z.boolean().default(false),
  sample: z.boolean().default(false),
  featured: z.boolean().default(false),
};
export const collections = {
 writing: defineCollection({loader:glob({pattern:'**/*.{md,mdx}',base:'./src/content/writing'}),schema:z.object(common)}),
 projects: defineCollection({loader:glob({pattern:'**/*.{md,mdx}',base:'./src/content/projects'}),schema:z.object({
  ...common,
  status: ProjectStatus,
  art:z.enum(['wing','orbit','code']),
  drawing:z.enum(['airfoils','bwb','uki','gofr','rocket','wing','orbit','code']).optional(),
  engineering:z.object({
   question:z.string(), approach:z.string(), constraint:z.string(), evidence:z.string(), nextCheck:z.string(), methods:z.array(z.string()),
  }).optional(),
  visual:z.enum(['dither','grain','mesh','grid','dots','asset','screenshot']).optional(),
  visualAccent:z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  visualImage:z.string().optional(),
  visualImageAlt:z.string().optional(),
  visualLabel:z.string().optional(),
  visualAnimate:z.boolean().default(false),
 })})
};
