// Bundle repro.tsx bằng esbuild với các alias mock
import * as esbuild from "esbuild";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const mocks = path.join(root, "scripts", "repro", "mocks");

function resolveAlias(p) {
  if (p === "@/lib/supabase") return path.join(mocks, "supabase-mock.ts");
  if (p === "next/navigation") return path.join(mocks, "next-navigation.ts");
  if (p === "next/link") return path.join(mocks, "next-link.tsx");
  if (p.startsWith("@/")) {
    const base = path.join(root, "src", p.slice(2));
    for (const cand of [base, base + ".ts", base + ".tsx", path.join(base, "index.ts"), path.join(base, "index.tsx")]) {
      if (fs.existsSync(cand) && fs.statSync(cand).isFile()) return cand;
    }
    return null;
  }
  return null;
}

const aliasPlugin = {
  name: "alias",
  setup(build) {
    build.onResolve({ filter: /^@\// }, (args) => {
      const r = resolveAlias(args.path);
      return r ? { path: r } : undefined;
    });
    build.onResolve({ filter: /^next\/(navigation|link)$/ }, (args) => {
      const r = resolveAlias(args.path);
      return r ? { path: r } : undefined;
    });
  },
};

await esbuild.build({
  entryPoints: [path.join(root, "scripts", "repro", "repro.tsx")],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node18",
  outfile: path.join(root, "scripts", "repro", "repro.bundle.mjs"),
  jsx: "automatic",
  plugins: [aliasPlugin],
  external: ["jsdom"],
  logLevel: "warning",
});
console.log("BUNDLE OK");
