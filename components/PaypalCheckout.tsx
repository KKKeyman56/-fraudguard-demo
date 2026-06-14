"use client";

import { useEffect, useRef, useState } from "react";

const CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
const CURRENCY = process.env.NEXT_PUBLIC_PREMIUM_CURRENCY ?? "USD";

type Props = {
  onSuccess: (premiumUntil: string) => void;
  onError: (message: string) => void;
};

// Memuat SDK PayPal sekali saja, lalu render tombolnya. Tidak butuh dependency
// npm tambahan — cukup script resmi PayPal + window.paypal.Buttons.
declare global {
  interface Window {
    paypal?: {
      Buttons: (opts: Record<string, unknown>) => {
        render: (el: HTMLElement) => Promise<void>;
      };
    };
  }
}

function loadSdk(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.paypal) return Promise.resolve();

  const existing = document.querySelector<HTMLScriptElement>(
    "script[data-paypal-sdk]"
  );
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Gagal memuat PayPal SDK"))
      );
    });
  }

  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(
      CLIENT_ID!
    )}&currency=${encodeURIComponent(CURRENCY)}&intent=capture`;
    s.async = true;
    s.dataset.paypalSdk = "true";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Gagal memuat PayPal SDK"));
    document.body.appendChild(s);
  });
}

export default function PaypalCheckout({ onSuccess, onError }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const rendered = useRef(false);

  useEffect(() => {
    if (!CLIENT_ID || rendered.current) return;

    let cancelled = false;
    loadSdk()
      .then(() => {
        if (cancelled || rendered.current || !window.paypal || !containerRef.current)
          return;
        rendered.current = true;
        setReady(true);

        window.paypal
          .Buttons({
            style: { layout: "vertical", shape: "pill", label: "paypal" },
            createOrder: async () => {
              const res = await fetch("/api/paypal/create-order", {
                method: "POST",
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error ?? "Gagal membuat order.");
              return data.id as string;
            },
            onApprove: async (data: { orderID: string }) => {
              const res = await fetch("/api/paypal/capture-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderID: data.orderID }),
              });
              const json = await res.json();
              if (!res.ok) {
                onError(json.error ?? "Pembayaran gagal diproses.");
                return;
              }
              onSuccess(json.premium_until as string);
            },
            onError: () => {
              onError("Terjadi kesalahan pada PayPal. Coba lagi.");
            },
          })
          .render(containerRef.current)
          .catch(() => onError("Gagal menampilkan tombol PayPal."));
      })
      .catch(() => onError("Gagal memuat PayPal. Periksa koneksi internet."));

    return () => {
      cancelled = true;
    };
  }, [onSuccess, onError]);

  if (!CLIENT_ID) {
    return (
      <p className="muted">
        Pembayaran PayPal belum dikonfigurasi (atur{" "}
        <code>NEXT_PUBLIC_PAYPAL_CLIENT_ID</code>).
      </p>
    );
  }

  return (
    <div>
      {!ready && <p className="muted">Memuat PayPal…</p>}
      <div ref={containerRef} />
    </div>
  );
}
