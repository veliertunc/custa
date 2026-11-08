import { sql } from "drizzle-orm";
import { pgTable, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { user } from "./auth-schema";

export const Post = pgTable("post", (t) => ({
  id: t.uuid().notNull().primaryKey().defaultRandom(),
  title: t.varchar({ length: 256 }).notNull(),
  content: t.text().notNull(),
  createdAt: t.timestamp().defaultNow().notNull(),
  updatedAt: t
    .timestamp({ mode: "date", withTimezone: true })
    .$onUpdateFn(() => sql`now()`),
}));

export const CreatePostSchema = createInsertSchema(Post, {
  title: z.string().max(256),
  content: z.string().max(256),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export * from "./auth-schema";

export const SalesBusiness = pgTable("sales_business", (t) => ({
  ownerId: t
    .text()
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  name: t.text().notNull(),
  offering: t.text().notNull(),
  audience: t.text().notNull(),
  market: t.text().notNull(),
  terms: t.text().notNull(),
  ordersEmail: t.text().notNull(),
  pitch: t.text(),
  research: t.text(),
}));

export const SalesLead = pgTable(
  "sales_lead",
  (t) => ({
    id: t.uuid().primaryKey().defaultRandom(),
    ownerId: t
      .text()
      .notNull()
      .references(() => SalesBusiness.ownerId, { onDelete: "cascade" }),
    profileUrl: t.text().notNull(),
    name: t.text().notNull(),
    company: t.text().notNull(),
    rationale: t.text().notNull(),
    sentAt: t.timestamp({ withTimezone: true }),
    orderToken: t.uuid().notNull().unique().defaultRandom(),
  }),
  (t) => [unique().on(t.ownerId, t.profileUrl)],
);

export const SalesOrder = pgTable("sales_order", (t) => ({
  id: t.uuid().primaryKey().defaultRandom(),
  leadId: t
    .uuid()
    .notNull()
    .unique()
    .references(() => SalesLead.id, { onDelete: "cascade" }),
  name: t.text().notNull(),
  email: t.text().notNull(),
  details: t.text().notNull(),
  recipient: t.text().notNull(),
  createdAt: t.timestamp({ withTimezone: true }).defaultNow().notNull(),
  emailedAt: t.timestamp({ withTimezone: true }),
}));
