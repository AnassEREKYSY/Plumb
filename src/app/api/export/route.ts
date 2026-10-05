import { netPnl, rMultiple } from "@/lib/calc";
import { getWorkspace } from "@/lib/data";

const esc = (v: unknown) => {
  if (v == null) return "";
  const s = Array.isArray(v) ? v.join("|") : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET() {
  const ws = await getWorkspace();
  const acc = new Map(ws.accounts.map((a) => [a.id, a.name]));
  const setup = new Map(ws.setups.map((s) => [s.id, s.name]));
  const cols = [
    "opened_at", "closed_at", "account", "status", "symbol", "market", "direction", "setup",
    "planned_entry", "initial_stop", "target", "planned_size", "entry_price", "exit_price", "final_stop", "size",
    "fees", "net_pnl", "r_multiple", "emotion_before", "emotion_after", "tags", "reason", "notes", "lesson",
  ];
  const rows = ws.trades.map((t) =>
    [
      t.opened_at, t.closed_at, acc.get(t.account_id), t.status, t.symbol, t.market, t.direction, t.setup_id ? setup.get(t.setup_id) : "",
      t.planned_entry, t.initial_stop, t.target, t.planned_size, t.entry_price, t.exit_price, t.final_stop, t.size,
      t.fees, t.status === "closed" ? netPnl(t).toFixed(2) : "", rMultiple(t)?.toFixed(2) ?? "", t.emotion_before, t.emotion_after, t.tags, t.reason, t.notes, t.lesson,
    ].map(esc).join(","),
  );
  const csv = [cols.join(","), ...rows].join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="plumb-trades-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
