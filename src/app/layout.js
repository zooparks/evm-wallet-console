import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

export const metadata = {
  title: "EVM Wallet Console",
  description: "EVM 多钱包资产与批量交易管理平台",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh" className="h-full">
      <body className="h-full bg-gray-50 text-gray-900 antialiased">
        <div className="flex h-full overflow-hidden">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
