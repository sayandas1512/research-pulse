import Link from "next/link";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/archive", label: "Archive" },
  { href: "/settings", label: "Settings" },
  { href: "/runs", label: "Runs" },
  { href: "/log", label: "Log" },
  { href: "/backtest", label: "Backtest" },
];

export default function NavBar() {
  return (
    <nav className="flex flex-wrap gap-4 border-b border-gray-100 px-6 py-3 text-sm text-gray-500 dark:border-gray-800">
      {LINKS.map((link) => (
        <Link key={link.href} href={link.href} className="hover:text-gray-900 dark:hover:text-gray-100">
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
