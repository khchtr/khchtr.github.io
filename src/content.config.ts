import { glob, file } from "astro/loaders";
import { defineCollection, } from "astro:content";
import { z } from 'astro/zod';

const posts = defineCollection({
  loader: glob({ base: 'src/content/posts/', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    image: z.string().default("/static/blog-placeholder.png"),
    draft: z.boolean().optional(),
    language: z.enum(["en", "hy"]).default("en"),
  }),
});

export const collections = { posts };
