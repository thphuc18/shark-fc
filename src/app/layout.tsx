import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/components/Toast";
import { Frame } from "@/components/Frame";
import { TEAM_NAME, TAGLINE } from "@/lib/config";

const beVn = Be_Vietnam_Pro({
  variable: "--font-be-vn",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: `${TEAM_NAME} - ${TAGLINE}`,
  description: `Ứng dụng điểm danh, quản lý quỹ và công nợ nội bộ của câu lạc bộ bóng đá ${TEAM_NAME}. Thiết kế tối ưu cho di động.`,
};

export const viewport: Viewport = {
  themeColor: "#090d16",
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="h-full scroll-smooth">
      <body className={`${beVn.variable} font-sans min-h-full antialiased`}>
        <AuthProvider>
          <ToastProvider>
            <Frame>{children}</Frame>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
