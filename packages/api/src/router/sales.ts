import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import type { db as database } from "@acme/db/client";
import { and, desc, eq } from "@acme/db";
import { SalesBusiness, SalesLead, SalesOrder } from "@acme/db/schema";

import { salesProviderReady, salesTool } from "../sales/mcp";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

const shortText = z.string().trim().min(1).max(200);
const longText = z.string().trim().min(1).max(6000);
const email = z.email().max(254);
const profile = z.object({
  name: shortText,
  offering: longText,
  audience: longText,
  market: shortText,
  terms: longText,
  ordersEmail: email,
});
const prospect = z.object({
  name: shortText,
  company: shortText,
  rationale: longText,
  profileUrl: z
    .string()
    .max(500)
    .regex(/^https:\/\/(?:www\.)?linkedin\.com\/in\/[a-z0-9_%.-]+\/?$/i)
    .transform(
      (value) =>
        `https://www.linkedin.com${new URL(value).pathname.replace(/\/$/, "")}`,
    ),
});
const confirmed = z.object({ accepted: z.literal(true) });

async function businessFor(db: typeof database, ownerId: string) {
  const business = await db.query.SalesBusiness.findFirst({
    where: eq(SalesBusiness.ownerId, ownerId),
  });
  if (!business) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Save your business profile first.",
    });
  }
  return business;
}

function providerProfile(business: typeof SalesBusiness.$inferSelect) {
  const { name, offering, audience, market, terms } = business;
  return { name, offering, audience, market, terms };
}

async function orderLink(db: typeof database, token: string) {
  const [link] = await db
    .select({
      leadId: SalesLead.id,
      ownerId: SalesLead.ownerId,
      name: SalesBusiness.name,
      recipient: SalesBusiness.ordersEmail,
    })
    .from(SalesLead)
    .innerJoin(SalesBusiness, eq(SalesLead.ownerId, SalesBusiness.ownerId))
    .where(eq(SalesLead.orderToken, token));
  if (!link)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "This order link is unavailable.",
    });
  return link;
}

async function emailOrder(
  db: typeof database,
  ownerId: string,
  order: typeof SalesOrder.$inferSelect,
) {
  if (order.emailedAt) return;
  await salesTool(
    "send_order_email",
    {
      ownerId,
      idempotencyKey: order.id,
      to: order.recipient,
      order: {
        id: order.id,
        name: order.name,
        email: order.email,
        details: order.details,
      },
    },
    confirmed,
  );
  await db
    .update(SalesOrder)
    .set({ emailedAt: new Date() })
    .where(eq(SalesOrder.id, order.id));
}

export const salesRouter = createTRPCRouter({
  workspace: protectedProcedure.query(async ({ ctx }) => {
    const ownerId = ctx.session.user.id;
    const [business, leads, orders] = await Promise.all([
      ctx.db.query.SalesBusiness.findFirst({
        where: eq(SalesBusiness.ownerId, ownerId),
      }),
      ctx.db.query.SalesLead.findMany({
        where: eq(SalesLead.ownerId, ownerId),
        orderBy: SalesLead.name,
      }),
      ctx.db
        .select({
          id: SalesOrder.id,
          name: SalesOrder.name,
          email: SalesOrder.email,
          details: SalesOrder.details,
          emailedAt: SalesOrder.emailedAt,
          createdAt: SalesOrder.createdAt,
        })
        .from(SalesOrder)
        .innerJoin(SalesLead, eq(SalesOrder.leadId, SalesLead.id))
        .where(eq(SalesLead.ownerId, ownerId))
        .orderBy(desc(SalesOrder.createdAt)),
    ]);
    return { business, leads, orders, providerReady: salesProviderReady() };
  }),
  saveBusiness: protectedProcedure
    .input(profile)
    .mutation(async ({ ctx, input }) => {
      const ownerId = ctx.session.user.id;
      await ctx.db
        .insert(SalesBusiness)
        .values({ ownerId, ...input })
        .onConflictDoUpdate({
          target: SalesBusiness.ownerId,
          set: { ...input, pitch: null, research: null },
        });
    }),
  generatePitch: protectedProcedure.mutation(async ({ ctx }) => {
    const ownerId = ctx.session.user.id;
    const business = await businessFor(ctx.db, ownerId);
    const { pitch } = await salesTool(
      "create_sales_pitch",
      {
        ownerId,
        business: providerProfile(business),
      },
      z.object({ pitch: longText }),
    );
    await ctx.db
      .update(SalesBusiness)
      .set({ pitch })
      .where(eq(SalesBusiness.ownerId, ownerId));
  }),
  findLeads: protectedProcedure.mutation(async ({ ctx }) => {
    const ownerId = ctx.session.user.id;
    const business = await businessFor(ctx.db, ownerId);
    const { research, leads } = await salesTool(
      "research_linkedin_market",
      {
        ownerId,
        business: providerProfile(business),
        limit: 25,
      },
      z.object({ research: longText, leads: z.array(prospect).max(25) }),
    );
    if (leads.length) {
      await ctx.db
        .insert(SalesLead)
        .values(leads.map((lead) => ({ ...lead, ownerId })))
        .onConflictDoNothing({
          target: [SalesLead.ownerId, SalesLead.profileUrl],
        });
    }
    await ctx.db
      .update(SalesBusiness)
      .set({ research })
      .where(eq(SalesBusiness.ownerId, ownerId));
  }),
  sendOutreach: protectedProcedure
    .input(
      z.object({
        leadId: z.uuid(),
        message: z.string().trim().min(1).max(1800),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const ownerId = ctx.session.user.id;
      const lead = await ctx.db.query.SalesLead.findFirst({
        where: and(
          eq(SalesLead.ownerId, ownerId),
          eq(SalesLead.id, input.leadId),
        ),
      });
      if (!lead) throw new TRPCError({ code: "NOT_FOUND" });
      if (lead.sentAt) return;
      const origin = z
        .url({ protocol: /^https?$/ })
        .safeParse(process.env.SALES_PUBLIC_URL);
      if (!origin.success) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Configure the public order link origin.",
        });
      }
      const orderUrl = new URL(`/order/${lead.orderToken}`, origin.data).href;
      await salesTool(
        "send_linkedin_outreach",
        {
          ownerId,
          idempotencyKey: lead.id,
          profileUrl: lead.profileUrl,
          message: `${input.message}\n\nSubmit your order request: ${orderUrl}`,
        },
        confirmed,
      );
      await ctx.db
        .update(SalesLead)
        .set({ sentAt: new Date() })
        .where(eq(SalesLead.id, lead.id));
    }),
  orderPage: publicProcedure.input(z.uuid()).query(async ({ ctx, input }) => {
    const link = await orderLink(ctx.db, input);
    const order = await ctx.db.query.SalesOrder.findFirst({
      columns: { id: true },
      where: eq(SalesOrder.leadId, link.leadId),
    });
    return { name: link.name, submitted: Boolean(order) };
  }),
  submitOrder: publicProcedure
    .input(
      z.object({
        token: z.uuid(),
        name: shortText,
        email,
        details: longText,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const link = await orderLink(ctx.db, input.token);
      const [order] = await ctx.db
        .insert(SalesOrder)
        .values({
          leadId: link.leadId,
          recipient: link.recipient,
          name: input.name,
          email: input.email,
          details: input.details,
        })
        .onConflictDoNothing({ target: SalesOrder.leadId })
        .returning();
      if (order) {
        try {
          await emailOrder(ctx.db, link.ownerId, order);
        } catch {
          // The owner can retry notification from the persisted order.
        }
      }
    }),
  retryOrderEmail: protectedProcedure
    .input(z.uuid())
    .mutation(async ({ ctx, input }) => {
      const ownerId = ctx.session.user.id;
      const [entry] = await ctx.db
        .select({ order: SalesOrder })
        .from(SalesOrder)
        .innerJoin(SalesLead, eq(SalesOrder.leadId, SalesLead.id))
        .where(and(eq(SalesOrder.id, input), eq(SalesLead.ownerId, ownerId)));
      if (!entry) throw new TRPCError({ code: "NOT_FOUND" });
      await emailOrder(ctx.db, ownerId, entry.order);
    }),
});
