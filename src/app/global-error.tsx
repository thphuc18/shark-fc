"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

/**
 * Lưới an toàn cuối cùng: bắt lỗi ngay cả khi root layout bị crash.
 * Bắt buộc phải tự chứa <html> và <body>.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error("Global error:", error);

  return (
    <html lang="vi">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          background: "#f1f5f9",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ textAlign: "center", padding: 32 }}>
          <div
            style={{
              width: 64,
              height: 64,
              margin: "0 auto 16px",
              borderRadius: 16,
              background: "#fff1f2",
              border: "1px solid #fecdd3",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#f43f5e",
            }}
          >
            <AlertTriangle style={{ width: 32, height: 32 }} />
          </div>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: "#1e293b" }}>
            Đã có lỗi xảy ra
          </h2>
          <p
            style={{
              fontSize: 12,
              color: "#64748b",
              marginTop: 8,
              maxWidth: 280,
              marginLeft: "auto",
              marginRight: "auto",
              lineHeight: 1.6,
            }}
          >
            Có thể do mạng bị gián đoạn. Hãy thử tải lại trang nhé!
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 16,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 18px",
              borderRadius: 12,
              border: "none",
              background: "#2563eb",
              color: "#fff",
              fontSize: 12,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            <RefreshCw style={{ width: 14, height: 14 }} /> Tải lại
          </button>
        </div>
      </body>
    </html>
  );
}
