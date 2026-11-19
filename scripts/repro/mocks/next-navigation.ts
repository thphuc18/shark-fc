// Mock next/navigation
export function useRouter() {
  return {
    replace: (u: string) => console.log("[mock router.replace] ->", u),
    push: (u: string) => console.log("[mock router.push] ->", u),
    back: () => {},
    refresh: () => {},
  };
}
export function usePathname() {
  return (globalThis as any).__mockPathname || "/admin";
}
