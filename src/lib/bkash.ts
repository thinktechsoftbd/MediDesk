// Official bKash Tokenized Checkout client (developer.bka.sh).
// Talks straight to bKash — no aggregator in between.

const BASE = () => process.env.BKASH_BASE_URL || "https://tokenized.sandbox.bka.sh/v1.2.0-beta";

export function bkashConfigured() {
  return !!(
    process.env.BKASH_APP_KEY &&
    process.env.BKASH_APP_SECRET &&
    process.env.BKASH_USERNAME &&
    process.env.BKASH_PASSWORD
  );
}

// id_token cache — bKash grants last ~1 hour
let cachedToken: { token: string; exp: number } | null = null;

async function grantToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.exp) return cachedToken.token;

  const r = await fetch(`${BASE()}/tokenized/checkout/token/grant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      username: process.env.BKASH_USERNAME!,
      password: process.env.BKASH_PASSWORD!,
    },
    body: JSON.stringify({
      app_key: process.env.BKASH_APP_KEY,
      app_secret: process.env.BKASH_APP_SECRET,
    }),
    cache: "no-store",
  });

  const d = await r.json();
  if (!r.ok || !d.id_token) {
    throw new Error(`bKash token grant failed: ${d.statusMessage || d.message || r.status}`);
  }
  // refresh 5 minutes before expiry
  cachedToken = { token: d.id_token, exp: Date.now() + (Number(d.expires_in || 3600) - 300) * 1000 };
  return d.id_token;
}

async function call(path: string, body: any) {
  const token = await grantToken();
  const r = await fetch(`${BASE()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: token,
      "X-APP-Key": process.env.BKASH_APP_KEY!,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  return r.json();
}

// Step 1: create the payment — returns bkashURL to send the payer to
export async function bkashCreatePayment(opts: {
  amount: number;
  invoice: string;
  payerReference?: string;
  callbackURL: string;
}) {
  const d = await call("/tokenized/checkout/create", {
    mode: "0011", // tokenized URL checkout
    payerReference: opts.payerReference || "01",
    callbackURL: opts.callbackURL,
    amount: opts.amount.toFixed(2),
    currency: "BDT",
    intent: "sale",
    merchantInvoiceNumber: opts.invoice,
  });
  if (d.statusCode !== "0000" || !d.bkashURL) {
    throw new Error(`bKash create failed: ${d.statusMessage || d.errorMessage || d.statusCode}`);
  }
  return d as { paymentID: string; bkashURL: string };
}

// Step 2 (after the payer approves on the bKash page): execute to complete
export async function bkashExecutePayment(paymentID: string) {
  const d = await call("/tokenized/checkout/execute", { paymentID });
  return d as {
    statusCode: string;
    statusMessage?: string;
    trxID?: string;
    transactionStatus?: string;
    customerMsisdn?: string;
    amount?: string;
  };
}

// Safety net when execute times out: ask bKash what happened
export async function bkashQueryPayment(paymentID: string) {
  return call("/tokenized/checkout/payment/status", { paymentID });
}
