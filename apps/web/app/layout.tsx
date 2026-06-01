import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Tina Chatbot",
  description: "Multi-tenant RAG chatbot platform"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
