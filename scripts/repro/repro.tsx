// Chạy trang /admin (code thật) trong DOM giả lập để săn lỗi runtime
import { JSDOM } from "jsdom";

const dom = new JSDOM(
  `<!doctype html><html><body><div id="root"></div></body></html>`,
  { url: "https://shark-fc.vercel.app/admin", pretendToBeVisual: true }
);
const w: any = dom.window;

(globalThis as any).window = w;
(globalThis as any).document = w.document;
Object.defineProperty(globalThis, "navigator", { value: w.navigator, configurable: true });
(globalThis as any).HTMLElement = w.HTMLElement;
(globalThis as any).Node = w.Node;
(globalThis as any).getComputedStyle = w.getComputedStyle;
(globalThis as any).requestAnimationFrame = (cb: any) => setTimeout(cb, 16);
(globalThis as any).cancelAnimationFrame = (id: any) => clearTimeout(id);
(globalThis as any).CustomEvent = w.CustomEvent;
(globalThis as any).Event = w.Event;
(globalThis as any).localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as any).__mockPathname = "/admin";

const errors: string[] = [];
process.on("unhandledRejection", (e) =>
  errors.push("unhandledRejection: " + (e instanceof Error ? (e.stack || e.message) : String(e)))
);
process.on("uncaughtException", (e) =>
  errors.push("uncaughtException: " + (e.stack || e.message))
);
w.addEventListener("error", (e: any) => errors.push("window.onerror: " + e.message));

const PAGE = (process.argv[2] || "admin") as "admin" | "home" | "players" | "fund" | "matches" | "profile";

async function main() {
  (globalThis as any).__mockPathname = "/" + (PAGE === "home" ? "" : PAGE);
  const React = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { AuthProvider } = await import("@/contexts/AuthContext");
  const { ToastProvider } = await import("@/components/Toast");

  let Page: any;
  if (PAGE === "admin") Page = (await import("@/app/admin/page")).default;
  else if (PAGE === "home") Page = (await import("@/app/page")).default;
  else if (PAGE === "players") Page = (await import("@/app/players/page")).default;
  else if (PAGE === "fund") Page = (await import("@/app/fund/page")).default;
  else if (PAGE === "matches") Page = (await import("@/app/matches/page")).default;
  else if (PAGE === "profile") Page = (await import("@/app/profile/page")).default;
  else throw new Error("unknown page " + PAGE);

  const root = createRoot(document.getElementById("root")!);
  const { act } = React;

  await act(async () => {
    root.render(
      React.createElement(
        AuthProvider,
        null,
        React.createElement(ToastProvider, null, React.createElement(Page))
      )
    );
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 3000));
  });

  console.log("========== PAGE TEXT (first 1500 chars) ==========");
  console.log((document.body.textContent || "").replace(/\n+/g, " | ").slice(0, 1500));
  console.log("========== ERRORS ==========");
  console.log(errors.length ? errors.join("\n---\n") : "NONE");
  process.exit(errors.length ? 2 : 0);
}

main().catch((e) => {
  console.error("MAIN CRASH:", e && (e as Error).stack);
  process.exit(1);
});
