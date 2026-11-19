// Mock next/link
import type { ReactNode } from "react";

export default function Link({
  href,
  children,
  ...rest
}: {
  href: string;
  children: ReactNode;
  [k: string]: unknown;
}) {
  return <a href={href} {...rest}>{children}</a>;
}
