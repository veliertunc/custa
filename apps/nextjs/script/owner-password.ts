import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { hashPassword } from "better-auth/crypto";
import { z } from "zod/v4";

import { and, eq } from "@acme/db";
import { db } from "@acme/db/client";
import { account, session, user } from "@acme/db/schema";

import "../src/env";

async function setOwnerPassword() {
  const email = z.email().safeParse(process.argv[2]?.trim().toLowerCase());
  if (!email.success) {
    throw new Error("Provide a valid owner email.");
  }
  if (process.stdin.isTTY) {
    throw new Error(
      "Pipe the password to this command through standard input.",
    );
  }
  const password = readFileSync(0, "utf8").replace(/\r?\n$/, "");
  if (password.length < 12 || password.length > 128) {
    throw new Error("Use a password between 12 and 128 characters.");
  }

  const displayName = process.argv[3]?.trim();
  const name = displayName?.length ? displayName : email.data;
  const passwordHash = await hashPassword(password);

  try {
    await db.transaction(async (tx) => {
      const now = new Date();
      await tx
        .insert(user)
        .values({
          id: randomUUID(),
          name,
          email: email.data,
          emailVerified: false,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing({ target: user.email });
      const [owner] = await tx
        .select({ id: user.id })
        .from(user)
        .where(eq(user.email, email.data))
        .for("update");
      if (!owner) throw new Error("Missing owner record");

      const credentials = await tx
        .update(account)
        .set({ password: passwordHash, updatedAt: now })
        .where(
          and(
            eq(account.userId, owner.id),
            eq(account.providerId, "credential"),
          ),
        )
        .returning({ id: account.id });
      if (credentials.length === 0) {
        await tx.insert(account).values({
          id: randomUUID(),
          accountId: owner.id,
          providerId: "credential",
          userId: owner.id,
          password: passwordHash,
          createdAt: now,
          updatedAt: now,
        });
      }
      await tx.delete(session).where(eq(session.userId, owner.id));
    });
  } catch {
    throw new Error(
      "Could not set the owner password. Check the database connection and schema.",
    );
  }

  console.log(`Password set for ${email.data}. Active sessions were revoked.`);
}

try {
  await setOwnerPassword();
} catch (error) {
  console.error(
    error instanceof Error
      ? error.message
      : "Could not set the owner password.",
  );
  process.exitCode = 1;
} finally {
  await db.$client.end();
}
