/**
 * One-time setup script: creates the institution owner account and organization.
 *
 * Usage:
 *   npx tsx scripts/setup-owner.ts
 *
 * What it does (server-side, no HTTP server required):
 *   1. Creates a Better Auth user + account (email/password) via auth.api.signUpEmail
 *   2. Creates an organization via auth.api.createOrganization using the new userId
 *      → Better Auth automatically inserts a `member` row with role "owner"
 */

import "dotenv/config";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { auth } from "../src/lib/auth";

const rl = readline.createInterface({ input, output });

async function prompt(question: string): Promise<string> {
  const answer = await rl.question(question);
  return answer.trim();
}

async function promptRequired(question: string): Promise<string> {
  while (true) {
    const value = await prompt(question);
    if (value.length > 0) return value;
    console.error("  This field is required.");
  }
}

async function main() {
  console.log("\n=== Student Management — Initial Owner Setup ===\n");

  // ── User information ──────────────────────────────────────────────────────
  console.log("Owner account details:");
  const name = await promptRequired("  Full name:    ");
  const email = await promptRequired("  Email:        ");
  const password = await promptRequired("  Password:     ");

  // ── Organization information ───────────────────────────────────────────────
  console.log("\nOrganization details:");
  const orgName = await promptRequired("  Name:         ");
  const rawSlug = await promptRequired("  Slug (URL-safe, e.g. my-uni): ");
  const orgSlug = rawSlug.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  if (orgSlug !== rawSlug) {
    console.log(`  Slug normalised to: ${orgSlug}`);
  }

  rl.close();
  console.log("\nCreating account and organization…");

  // ── Step 1: create the user account ────────────────────────────────────────
  const signUpResult = await auth.api.signUpEmail({
    body: { name, email, password },
  });

  // Better Auth returns null on failure (invalid email, weak password, etc.)
  if (!signUpResult?.user) {
    console.error(
      "\nFailed to create user account. The email may already be registered, " +
        "or the password does not meet the minimum strength requirements."
    );
    process.exit(1);
  }

  const userId = signUpResult.user.id;
  console.log(`✓ User created  (id: ${userId})`);

  // ── Step 2: create the organization and assign owner role ──────────────────
  // Calling auth.api.createOrganization server-side with userId (no session
  // headers) makes Better Auth use that userId as the creator.
  // The creatorRole option defaults to "owner", so a member row is inserted
  // with role="owner" automatically.
  const org = await auth.api.createOrganization({
    body: {
      name: orgName,
      slug: orgSlug,
      userId, // identifies creator on server-side calls
    },
  });

  if (!org) {
    console.error(
      "\nFailed to create organization. The slug may already be taken."
    );
    process.exit(1);
  }

  console.log(`✓ Organization created (id: ${org.id}, slug: ${org.slug})`);
  console.log(`✓ Owner role assigned to ${email}`);

  console.log("\n=== Setup complete ===");
  console.log(
    `You can now sign in at your app with ${email} as the institution owner.\n`
  );
}

main().catch((err) => {
  console.error("\nUnexpected error:", err);
  process.exit(1);
});
