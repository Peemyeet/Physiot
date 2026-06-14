import type { Metadata } from "next";
import { IBM_Plex_Sans_Thai } from "next/font/google";
import "./globals.css";

const plexThai = IBM_Plex_Sans_Thai({
  variable: "--font-plex-thai",
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "ตารางเรียน 1/2569 — ฟิสิกส์อุตสาหกรรมและวิศวกรรมไอโอที KMITL",
  description:
    "ตารางเรียนภาควิชาฟิสิกส์อุตสาหกรรมและวิศวกรรมไอโอที KMITL ภาคเรียน 1/2569 เพิ่ม/ลดวิชาและงานได้เอง พร้อมตารางสอบและแจ้งเตือน",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={`${plexThai.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
