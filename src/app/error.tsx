"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

/**
 * Lưới an toàn: khi trang bị lỗi runtime (mất mạng khi tải chunk,
 * lỗi dữ liệu...) sẽ hiện màn hình này THAY VÌ màn hình đen.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log để dễ debug
    console.error("Page error:", error);
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
        <p className="text-xs font-medium text-slate-500 max-w-xs mt-2 leading-relaxed">
          Có thể do mạng bị gián đoạn khi tải trang. Hãy thử lại nhé!
        </p>
      </div>
      <div className="flex gap-2 mt-2">
        <button
          onClick={reset}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition"
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
