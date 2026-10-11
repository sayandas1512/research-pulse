import SettingsClient from "./SettingsClient";

export default function SettingsPage() {
  return (
    <main className="mx-auto max-w-4xl flex-1 p-6">
      <h1 className="text-2xl font-semibold">Domain settings</h1>
      <p className="mt-1 text-sm text-gray-500">
        Add, edit, reorder, and preview the domains the weekly brief monitors. Changes here take
        effect on the next run — no code change needed.
      </p>
      <SettingsClient />
    </main>
  );
}
