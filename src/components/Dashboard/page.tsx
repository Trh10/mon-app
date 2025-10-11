import DashboardOverview from "./DashboardOverview";

export default function DashboardPage() {
  return (
    <main style={{ maxWidth: 960, margin: "24px auto", padding: 16 }}>
      <h1 style={{ fontSize: 24, marginBottom: 12 }}>Dashboard analytique</h1>
      <DashboardOverview />
    </main>
  );
}