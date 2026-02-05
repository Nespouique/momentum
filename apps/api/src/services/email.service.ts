import { Resend } from "resend";

const resend = new Resend(process.env["RESEND_API_KEY"]);
const FROM_EMAIL =
  process.env["RESEND_FROM_EMAIL"] || "noreply@hallais.bzh";

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string
): Promise<void> {
  await resend.emails.send({
    from: `Momentum <${FROM_EMAIL}>`,
    to,
    subject: "Réinitialisation de votre mot de passe - Momentum",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
        <h2 style="color: #1a1a1a; margin-bottom: 16px;">Réinitialisation de mot de passe</h2>
        <p style="color: #4a4a4a; line-height: 1.6;">
          Vous avez demandé la réinitialisation de votre mot de passe Momentum.
          Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe :
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}"
             style="background-color: #2563eb; color: #ffffff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
            Réinitialiser mon mot de passe
          </a>
        </div>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
          Ce lien expire dans 1 heure. Si vous n'avez pas demandé cette réinitialisation,
          vous pouvez ignorer cet email en toute sécurité.
        </p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #9ca3af; font-size: 12px;">Momentum — Votre coach fitness</p>
      </div>
    `,
  });
}
