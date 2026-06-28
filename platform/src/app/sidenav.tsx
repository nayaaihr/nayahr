"use client";

import { usePathname } from "next/navigation";

const PEOPLE = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="9" cy="8" r="3.4" /><path d="M3.4 19a5.6 5.6 0 0 1 11.2 0" />
    <path d="M16.2 5.3a3.4 3.4 0 0 1 0 6.4" /><path d="M17.6 13.4A5.6 5.6 0 0 1 21 18.6" />
  </svg>
);
const TIME = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3.5" y="5" width="17" height="15.5" rx="2" /><path d="M3.5 9.5h17" /><path d="M8 3.5v3M16 3.5v3" />
  </svg>
);
const COMP = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <ellipse cx="12" cy="6.3" rx="7" ry="3" /><path d="M5 6.3v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" /><path d="M5 11.3v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" />
  </svg>
);
const RECRUIT = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="7.5" width="18" height="12.5" rx="2" /><path d="M8.5 7.5V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5" /><path d="M3 12.5h18" />
  </svg>
);

const PERF = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="9" r="5.2" /><path d="M8.6 13.4 7.2 20.5l4.8-2.7 4.8 2.7-1.4-7.1" />
  </svg>
);
const REPORTS = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M4 20V4" /><path d="M4 20h16" /><rect x="7.5" y="12" width="3" height="5" /><rect x="12.5" y="8" width="3" height="9" /><rect x="17.5" y="5" width="3" height="12" />
  </svg>
);
const INBOX = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M3.5 13h4l1.5 2.5h6L16.5 13h4" /><path d="M5 5h14l1.5 8v4.5a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5V13z" />
  </svg>
);

// `roles` (when present) limits visibility; omitted = everyone.
const ITEMS: Array<{ href: string; label: string; icon: React.ReactNode; roles?: string[] }> = [
  { href: "/inbox", label: "Inbox", icon: INBOX },
  { href: "/people", label: "People", icon: PEOPLE },
  { href: "/recruit", label: "Recruitment", icon: RECRUIT, roles: ["owner", "hr_admin", "manager"] },
  { href: "/perform", label: "Performance", icon: PERF },
  { href: "/comp", label: "Compensation", icon: COMP },
  { href: "/leave", label: "Time off", icon: TIME },
  { href: "/reports", label: "Reports", icon: REPORTS, roles: ["owner", "hr_admin", "manager"] },
];

export function SideNav({ role, inboxCount = 0 }: { role: string | null; inboxCount?: number }) {
  const path = usePathname() ?? "";
  const items = ITEMS.filter((i) => !i.roles || (role != null && i.roles.includes(role)));
  return (
    <nav className="nav">
      {items.map((i) => (
        <a key={i.href} href={i.href} className={path.startsWith(i.href) ? "active" : ""}>
          <span className="ico">{i.icon}</span>
          {i.label}
          {i.href === "/inbox" && inboxCount > 0 && <span className="nav-count">{inboxCount}</span>}
        </a>
      ))}
    </nav>
  );
}
