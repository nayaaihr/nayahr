import Link from "next/link";
import { getSession } from "@/lib/session";
import { inboxItems, type InboxItem } from "@/repos/inbox";
import { InboxActions } from "./inbox-actions";

export const dynamic = "force-dynamic";

const ICON: Record<InboxItem["kind"], string> = { leave: "🌴", requisition: "📋", comp: "💰", review: "⭐" };
const LABEL: Record<InboxItem["kind"], string> = { leave: "Time off", requisition: "Recruitment", comp: "Compensation", review: "Performance" };

export default async function InboxPage() {
  const session = await getSession();
  const items = await inboxItems(session);

  return (
    <main>
      <div className="top">
        <div>
          <h1>Inbox</h1>
          <div className="sub">Actions awaiting you · viewing as <strong>{session.role}</strong></div>
        </div>
        {items.length > 0 && <span className="badge">{items.length} pending</span>}
      </div>

      {items.length === 0 ? (
        <div className="empty-cta">
          <h2>You're all caught up 🎉</h2>
          <p>No approvals or actions need your attention right now.</p>
        </div>
      ) : (
        <div className="panel">
          <div className="panel-hd">Pending actions</div>
          <div>
            {items.map((it, i) => (
              <div key={i} className="inbox-row">
                <span className="inbox-ico">{ICON[it.kind]}</span>
                <Link href={it.href} className="inbox-body" style={{ textDecoration: "none", color: "inherit" }}>
                  <span className="inbox-title">{it.title}</span>
                  <span className="inbox-sub">{it.subtitle}</span>
                </Link>
                <span className="pill">{LABEL[it.kind]}</span>
                {it.action === "link"
                  ? <Link href={it.href} className="btn ghost sm">Open</Link>
                  : <InboxActions kind={it.kind} id={it.id} action={it.action} />}
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
