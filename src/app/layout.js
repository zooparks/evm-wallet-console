import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import DevtoolsIndicatorTheme from "@/components/layout/DevtoolsIndicatorTheme";
import { I18nProvider } from "@/i18n/I18nProvider";

export const metadata = {
  title: "EVM Wallet Console",
  description: "Multi-wallet asset and batch transaction management",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-gray-50 text-gray-900 antialiased">
        <I18nProvider>
          <div className="flex h-full overflow-hidden">
            <Sidebar />
            <div className="flex flex-1 flex-col overflow-hidden">
              <Header />
              <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">{children}</main>
            </div>
            <DevtoolsIndicatorTheme />
          </div>
        </I18nProvider>
      </body>
    </html>
  );
}
