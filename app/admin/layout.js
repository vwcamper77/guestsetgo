import AppShell from "@/components/AppShell";

export const metadata = { title: "Admin", robots: { index: false } };

export default function Layout({ children }) {
  return <AppShell>{children}</AppShell>;
}
