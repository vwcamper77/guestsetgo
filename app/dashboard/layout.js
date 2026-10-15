import AppShell from "@/components/AppShell";

export const metadata = { title: "Dashboard" };

export default function Layout({ children }) {
  return <AppShell>{children}</AppShell>;
}
