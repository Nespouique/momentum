function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const STYLES = `
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#09090b;color:#fafafa;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
  main{width:100%;max-width:420px;background:#18181b;border:1px solid #27272a;border-radius:14px;padding:28px}
  h1{margin:0 0 4px;font-size:20px}
  .brand{color:#a1a1aa;font-size:13px;margin:0 0 20px}
  p{line-height:1.5;margin:0 0 14px;font-size:14px}
  .muted{color:#a1a1aa;font-size:13px}
  .scope{background:#09090b;border:1px solid #27272a;border-radius:10px;padding:12px 14px;margin:0 0 18px;font-size:13px;line-height:1.5}
  label{display:block;font-size:13px;margin:0 0 6px;color:#d4d4d8}
  input{width:100%;height:44px;margin:0 0 14px;padding:0 12px;border-radius:8px;border:1px solid #3f3f46;background:#09090b;color:#fafafa;font-size:16px}
  input:focus{outline:2px solid #fafafa;outline-offset:1px}
  .actions{display:flex;gap:10px;margin-top:6px}
  button{flex:1;height:48px;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;border:1px solid #3f3f46;background:transparent;color:#fafafa}
  button.primary{background:#fafafa;color:#18181b;border-color:#fafafa}
  .error{background:#2a1215;border:1px solid #7f1d1d;color:#fca5a5;border-radius:8px;padding:10px 12px;margin:0 0 14px;font-size:13px}
`;

function layout(title: string, body: string): string {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(title)}</title>
<style>${STYLES}</style>
</head>
<body><main>${body}</main></body>
</html>`;
}

export interface ConsentPageOptions {
  clientName: string;
  redirectTarget: string;
  ticket: string;
  error?: string | undefined;
  email?: string | undefined;
}

export function renderConsentPage(options: ConsentPageOptions): string {
  const error = options.error
    ? `<div class="error" role="alert">${escapeHtml(options.error)}</div>`
    : "";
  return layout(
    "Autoriser l'accès à Momentum",
    `<h1>Autoriser l'accès</h1>
<p class="brand">Momentum</p>
<p><strong>${escapeHtml(options.clientName)}</strong> demande l'accès à votre compte Momentum.</p>
<div class="scope">Accès en <strong>lecture seule</strong> à vos séances, performances, mensurations et suivi quotidien. Aucune modification n'est possible.</div>
${error}
<form method="post" action="/oauth/authorize">
<input type="hidden" name="ticket" value="${escapeHtml(options.ticket)}">
<label for="email">Email</label>
<input id="email" name="email" type="email" autocomplete="username" required value="${escapeHtml(options.email ?? "")}">
<label for="password">Mot de passe</label>
<input id="password" name="password" type="password" autocomplete="current-password" required>
<div class="actions">
<button type="submit" name="action" value="deny" formnovalidate>Refuser</button>
<button type="submit" name="action" value="approve" class="primary">Autoriser</button>
</div>
</form>
<p class="muted" style="margin-top:16px">Vous serez redirigé vers <strong>${escapeHtml(options.redirectTarget)}</strong>. Vous pouvez révoquer cet accès à tout moment depuis Paramètres &gt; Connexions MCP.</p>`
  );
}

export function renderErrorPage(message: string): string {
  return layout(
    "Autorisation impossible",
    `<h1>Autorisation impossible</h1>
<p class="brand">Momentum</p>
<div class="error" role="alert">${escapeHtml(message)}</div>
<p class="muted">Fermez cette page et relancez la connexion depuis votre application.</p>`
  );
}
