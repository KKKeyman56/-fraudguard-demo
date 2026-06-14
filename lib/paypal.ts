// Helper PayPal Orders v2 (server-only). Kredensial diambil dari env.
//
// Catatan mata uang: PayPal TIDAK mendukung IDR sebagai mata uang transaksi,
// jadi harga premium ditagih dalam USD (default mendekati Rp 25.000). Atur
// nominalnya lewat env PREMIUM_PRICE_USD / PREMIUM_CURRENCY.

const PAYPAL_ENV = (process.env.PAYPAL_ENV ?? "sandbox").toLowerCase();

export const PAYPAL_BASE =
  PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

export const PREMIUM_DAYS = Math.max(
  1,
  Number(process.env.PREMIUM_DURATION_DAYS ?? "30") || 30
);
export const PREMIUM_PRICE = (process.env.PREMIUM_PRICE_USD ?? "1.99").trim();
export const PREMIUM_CURRENCY = (process.env.PREMIUM_CURRENCY ?? "USD")
  .trim()
  .toUpperCase();

export function paypalConfigured(): boolean {
  return !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

async function accessToken(): Promise<string> {
  const id = process.env.PAYPAL_CLIENT_ID!;
  const secret = process.env.PAYPAL_CLIENT_SECRET!;
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    throw new Error(`PayPal auth gagal: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

export type PaypalOrder = { id: string; status: string };

export async function createOrder(): Promise<PaypalOrder> {
  const token = await accessToken();
  const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: { currency_code: PREMIUM_CURRENCY, value: PREMIUM_PRICE },
          description: `Belajarin Premium ${PREMIUM_DAYS} hari`,
        },
      ],
    }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`PayPal create order gagal: ${JSON.stringify(json)}`);
  }
  return json as PaypalOrder;
}

// Bentuk respons capture yang kita pakai (subset dari Orders v2).
export type PaypalCapture = {
  status: string;
  purchase_units?: Array<{
    payments?: {
      captures?: Array<{
        id: string;
        status: string;
        amount?: { currency_code: string; value: string };
      }>;
    };
  }>;
};

export async function captureOrder(orderId: string): Promise<PaypalCapture> {
  const token = await accessToken();
  const res = await fetch(
    `${PAYPAL_BASE}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`PayPal capture gagal: ${JSON.stringify(json)}`);
  }
  return json as PaypalCapture;
}
