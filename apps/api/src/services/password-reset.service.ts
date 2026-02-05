import crypto from "crypto";
import { prisma } from "../lib/prisma.js";
import { hashPassword } from "./auth.service.js";
import { sendPasswordResetEmail } from "./email.service.js";

const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
const FRONTEND_URL =
  process.env["FRONTEND_URL"] || "http://localhost:3000";

function generateResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Request a password reset for the given email.
 * Always succeeds silently (no email enumeration).
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return; // Silent — don't reveal if email exists

  const plainToken = generateResetToken();
  const hashedToken = hashToken(plainToken);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: hashedToken,
      passwordResetExpiresAt: expiresAt,
    },
  });

  const resetUrl = `${FRONTEND_URL}/reset-password?token=${plainToken}`;
  await sendPasswordResetEmail(user.email, resetUrl);
}

/**
 * Reset password using a valid token.
 * Returns an error code string on failure, or null on success.
 */
export async function resetPassword(
  token: string,
  newPassword: string
): Promise<"INVALID_RESET_TOKEN" | "EXPIRED_RESET_TOKEN" | null> {
  const hashedToken = hashToken(token);

  const user = await prisma.user.findFirst({
    where: { passwordResetToken: hashedToken },
  });

  if (!user) return "INVALID_RESET_TOKEN";

  if (!user.passwordResetExpiresAt || user.passwordResetExpiresAt < new Date()) {
    // Clear expired token
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: null, passwordResetExpiresAt: null },
    });
    return "EXPIRED_RESET_TOKEN";
  }

  const newHash = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: newHash,
      passwordResetToken: null,
      passwordResetExpiresAt: null,
    },
  });

  return null; // Success
}
