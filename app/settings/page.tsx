import { PageHeader, PageShell } from "../components/ui";
import SettingsClient from "./SettingsClient";

export default function SettingsPage() {
  return (
    <PageShell maxWidth="4xl">
      <PageHeader
        kicker="Manage · What gets monitored"
        title="Domain settings"
        description="Add, edit, reorder, and preview the domains the weekly brief monitors. Changes here take effect on the next run — no code change needed."
      />
      <SettingsClient />
    </PageShell>
  );
}
