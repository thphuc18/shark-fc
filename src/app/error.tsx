"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home, Loader2 } from "lucide-react";

/**
 * Lưới an toàn: khi trang bị lỗi runtime (mất mạng khi tải chunk,
 * cache trình duyệt cũ..., lỗi dữ liệu...) sẽ hiện màn hình này
 * THAY VÌ màn hình đen.
 *
 * Với lỗi "tải không được file code cũ" (do cache), trang sẽ TỰ TẢI LẠI
 * một lần để tự hồi phục.
 */

/** Nhận diện lỗi do trình duyệt không tải được chunk code (cache cũ / mạng) */
function isChunkLoadError(message: string): boolean {
  return /dynamically imported|chunk|loading css|networkerror|load failed|failed to fetch/i.test(
    message
  );
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [autoReloading, setAutoReloading] = useState(false);

  useEffect(() => {
    console.error("Page error:", error);
    const msg = error.message || "";
    if (!isChunkLoadError(msg)) return;

    // Lỗi tải chunk: tự tải lại trang MỘT lần (query param giúp bỏ qua cache)
    try {
      if (!window.sessionStorage.getItem("__sharkfc_reloading")) {
        window.sessionStorage.setItem("__sharkfc_reloading", "1");
        setAutoReloading(true);
        const t = setTimeout(() => {
          window.location.href = window.location.pathname + "?reload=" + Date.now();
        }, 500);
        return () => clearTimeout(t);
      }
      // Đã thử tự tải rồi mà vẫn lỗi → bỏ cờ, để user bấm tay
      window.sessionStorage.removeItem("__sharkfc_reloading");
    } catch {
      // sessionStorage không khả dụng — bỏ qua
    }
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-500">
        <AlertTriangle className="w-8 h-8" />
      </div>
      <div>
        <h2 className="text-base font-extrabold text-slate-800">
          Đã có lỗi xảy ra
        </h2>
        {autoReloading ? (
          <p className="text-xs font-medium text-blue-600 max-w-xs mt-2 leading-relaxed flex items-center justify-center gap-1.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            App đang tự tải lại trang...
          </p>
        ) : (
          <p className="text-xs font-medium text-slate-500 max-w-xs mt-2 leading-relaxed">
            Có thể do mạng bị gián đoạn hoặc trình duyệt giữ phiên bản cũ.
            Hãy thử lại nhé!
          </p>
        )}
        <p className="text-[10px] font-mono text-slate-400 max-w-xs mt-2 break-words">
          {error.message}
        </p>
      </div>
      <div className="flex gap-2 mt-2">
        <button
          onClick={() => {
            window.location.href =
              window.location.pathname + "?reload=" + Date.now();
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition"
        >
          <RefreshCw className="w-4 h-4" /> Tải lại trang
        </button>
        <button
          onClick={reset}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 active:scale-95 transition"
        >
          <RefreshCw className="w-4 h-4" /> Thử lại
        </button>
        <Link
          href="/"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 active:scale-95 transition"
        >
          <Home className="w-4 h-4" /> Trang chủ
        </Link>
      </div>
    </div>
  );
}
