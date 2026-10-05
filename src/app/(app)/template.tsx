/** Re-mounted on every navigation inside the app: gives each page a short, soft entrance. */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
