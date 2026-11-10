import AppShell from "@/components/AppShell";

export const metadata = { title: "Dashboard", robots: { index: false, follow: false } };

export default function Layout({ children }) {
  return <AppShell>{children}</AppShell>;
}
