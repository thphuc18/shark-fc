import Link from "next/link";
import { Shell } from "@/components/Shell";

export default function NotFound() {
  return (
    <Shell>
      <div className="flex-1 flex flex-col items-center justify-center gap-3 py-20 text-center">
        <div className="text-5xl">⚽</div>
        <h2 className="text-lg font-extrabold text-slate-800">404</h2>
        <p className="text-sm text-slate-500 font-medium">
          Không tìm thấy trang này
        </p>
        <Link
          href="/"
          className="mt-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-extrabold"
        >
          Về trang chủ
        </Link>
      </div>
    </Shell>
  );
}
