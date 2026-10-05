import path from "node:path";
import { Document, Font, Page, Path, Polyline, Rect, StyleSheet, Svg, Text, View, Line } from "@react-pdf/renderer";
import type { CheckedTrade, Stats } from "@/lib/calc";
import { fmtDate, fmtMoney, fmtNum, fmtPct, fmtPrice, fmtR, fmtTime } from "@/lib/format";
import type { Locale } from "@/lib/i18n/config";
import type { TFn } from "@/lib/i18n/translate";
import { findInstrument } from "@/lib/instruments";
import type { Review, RuleKind, Setup } from "@/lib/types";

/* ------------------------------------------------------------------ fonts */

const FONT_DIR = path.join(process.cwd(), "src/assets/fonts");
let fontsReady = false;
function registerFonts() {
  if (fontsReady) return;
  Font.register({
    family: "Inter",
    fonts: [
      { src: path.join(FONT_DIR, "inter-latin-400-normal.woff"), fontWeight: 400 },
      { src: path.join(FONT_DIR, "inter-latin-500-normal.woff"), fontWeight: 500 },
      { src: path.join(FONT_DIR, "inter-latin-600-normal.woff"), fontWeight: 600 },
      { src: path.join(FONT_DIR, "inter-latin-700-normal.woff"), fontWeight: 700 },
    ],
  });
  // Keep words whole: no automatic hyphenation.
  Font.registerHyphenationCallback((word) => [word]);
  fontsReady = true;
}

/* ------------------------------------------------------------------ palette */

const C = {
  ink: "#1c1a1f",
  ink2: "#47424c",
  muted: "#736d78",
  line: "#ebe9ed",
  lineStrong: "#dcd8df",
  soft: "#f7f6f8",
  plum: "#4b3350",
  mauve: "#8c6a87",
  mauveTint: "#eee6ed",
  gain: "#2f6b4f",
  gainTint: "#e3efe7",
  loss: "#8a3f73",
  ochre: "#a26c1f",
  ochreTint: "#f6ebd9",
};
const tone = (v: number) => (v > 0 ? C.gain : v < 0 ? C.loss : C.muted);

const s = StyleSheet.create({
  page: { fontFamily: "Inter", fontSize: 9, color: C.ink, paddingTop: 40, paddingBottom: 52, paddingHorizontal: 40 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 22 },
  brand: { flexDirection: "row", alignItems: "center", gap: 6 },
  brandName: { fontSize: 13, fontWeight: 600, letterSpacing: -0.3 },
  headerMeta: { fontSize: 8, color: C.muted, textAlign: "right" },
  title: { fontSize: 22, fontWeight: 600, letterSpacing: -0.5, lineHeight: 1.2 },
  subtitle: { fontSize: 10, color: C.muted, marginTop: 4, lineHeight: 1.3 },
  section: { marginTop: 22 },
  h2: { fontSize: 11.5, fontWeight: 600, marginBottom: 8 },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", borderWidth: 1, borderColor: C.line, borderRadius: 6, marginTop: 18 },
  kpi: { width: "25%", paddingVertical: 10, paddingHorizontal: 12, borderColor: C.line },
  kpiLabel: { fontSize: 7.5, color: C.muted },
  kpiValue: { fontSize: 15, fontWeight: 600, marginTop: 5, letterSpacing: -0.3, lineHeight: 1.2 },
  kpiSub: { fontSize: 7.5, color: C.muted, marginTop: 3 },
  card: { borderWidth: 1, borderColor: C.line, borderRadius: 6, padding: 12 },
  legend: { flexDirection: "row", gap: 14, marginTop: 6 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4, fontSize: 7.5, color: C.ink2 },
  table: { borderWidth: 1, borderColor: C.line, borderRadius: 6 },
  th: { flexDirection: "row", backgroundColor: C.soft, borderBottomWidth: 1, borderColor: C.line, paddingVertical: 5, paddingHorizontal: 8 },
  thText: { fontSize: 7, color: C.muted, fontWeight: 500 },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderColor: C.line, paddingVertical: 5, paddingHorizontal: 8 },
  td: { fontSize: 8, lineHeight: 1.35 },
  right: { textAlign: "right" },
  twoCols: { flexDirection: "row", gap: 12 },
  insight: { flexDirection: "row", gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderColor: C.line },
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", fontSize: 7, color: C.muted },
  note: { borderWidth: 1, borderColor: C.line, borderRadius: 6, padding: 10, marginBottom: 8 },
  badge: { fontSize: 7, paddingVertical: 1.5, paddingHorizontal: 4, borderRadius: 3 },
  empty: { fontSize: 9, color: C.muted, paddingVertical: 10 },
});

/* ------------------------------------------------------------------ data */

export interface JournalReportData {
  t: TFn;
  locale: Locale;
  tz: string;
  currency: string;
  accountLabel: string;
  periodLabel: string;
  generatedAt: string;
  stats: Stats;
  equity: { equity: number; clean: number }[];
  startBalance: number;
  costs: { kind: RuleKind; count: number; cost: number }[];
  bySetup: { label: string; count: number; winRate: number | null; net: number; expectancyR: number | null }[];
  byEmotion: { label: string; count: number; winRate: number | null; net: number; expectancyR: number | null }[];
  insights: { text: string; question: string }[];
  trades: CheckedTrade[];
  setups: Setup[];
  reviews: Review[];
  include: { trades: boolean; notes: boolean; reviews: boolean };
}

/* ------------------------------------------------------------------ pieces */

function Mark({ size = 16 }: { size?: number }) {
  return (
    <Svg width={(size * 40) / 96} height={size} viewBox="0 0 40 96">
      <Line x1="20" y1="1.2" x2="20" y2="34.6" stroke={C.plum} strokeWidth={2.4} />
      <Rect x="13" y="36" width="14" height="6.2" rx="1.4" fill={C.plum} />
      <Path d="M11.2 43.4 H28.8 L37.4 49.4 L23.8 84 H16.2 L2.6 49.4 Z" fill={C.plum} />
      <Path d="M16.4 85.6 H23.6 L20 94.8 Z" fill={C.gain} />
    </Svg>
  );
}

function Kpi({ label, value, sub, color, i }: { label: string; value: string; sub?: string; color?: string; i: number }) {
  return (
    <View style={[s.kpi, { borderRightWidth: i % 4 === 3 ? 0 : 1, borderBottomWidth: i < 4 ? 1 : 0 }]}>
      <Text style={s.kpiLabel}>{label}</Text>
      <Text style={[s.kpiValue, color ? { color } : {}]}>{value}</Text>
      {sub ? <Text style={s.kpiSub}>{sub}</Text> : null}
    </View>
  );
}

function EquityCurve({ data, start, currency, locale }: { data: { equity: number; clean: number }[]; start: number; currency: string; locale: Locale }) {
  const W = 495,
    H = 150,
    padR = 52,
    padT = 6,
    padB = 6;
  const pts = [{ equity: start, clean: start }, ...data];
  const vals = pts.flatMap((p) => [p.equity, p.clean]);
  const lo = Math.min(...vals),
    hi = Math.max(...vals);
  const span = hi - lo || 1;
  const x = (i: number) => (pts.length > 1 ? (i / (pts.length - 1)) * (W - padR) : 0);
  const y = (v: number) => padT + (1 - (v - lo) / span) * (H - padT - padB);
  const line = (k: "equity" | "clean") => pts.map((p, i) => `${x(i).toFixed(1)},${y(p[k]).toFixed(1)}`).join(" ");
  const ticks = [hi, (hi + lo) / 2, lo];
  return (
    <View style={{ position: "relative", width: W, height: H }}>
      <Svg width={W} height={H}>
        {ticks.map((v, i) => (
          <Line key={i} x1={0} x2={W - padR} y1={y(v)} y2={y(v)} stroke={C.line} strokeWidth={0.6} strokeDasharray="2 3" />
        ))}
        <Polyline points={line("clean")} stroke={C.gain} strokeWidth={1.1} strokeDasharray="4 3" fill="none" />
        <Polyline points={line("equity")} stroke={C.plum} strokeWidth={1.6} fill="none" />
      </Svg>
      {ticks.map((v, i) => (
        <Text key={i} style={{ position: "absolute", left: W - padR + 6, top: y(v) - 5, fontSize: 7, color: C.muted }}>
          {fmtMoney(v, currency, locale, { decimals: 0 })}
        </Text>
      ))}
    </View>
  );
}

function Breakdown({ title, rows, t, locale, currency }: { title: string; rows: JournalReportData["bySetup"]; t: TFn; locale: Locale; currency: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={s.h2}>{title}</Text>
      <View style={s.table}>
        <View style={s.th}>
          <Text style={[s.thText, { flex: 2.4 }]}>{t("analytics.bucket")}</Text>
          <Text style={[s.thText, s.right, { flex: 0.8 }]}>{t("analytics.trades")}</Text>
          <Text style={[s.thText, s.right, { flex: 0.9 }]}>{t("analytics.winRateShort")}</Text>
          <Text style={[s.thText, s.right, { flex: 1.3 }]}>{t("analytics.net")}</Text>
          <Text style={[s.thText, s.right, { flex: 1 }]}>{t("analytics.expR")}</Text>
        </View>
        {rows.map((r, i) => (
          <View key={i} style={[s.tr, i === rows.length - 1 ? { borderBottomWidth: 0 } : {}]} wrap={false}>
            <Text style={[s.td, { flex: 2.4 }]}>{r.label}</Text>
            <Text style={[s.td, s.right, { flex: 0.8, color: C.ink2 }]}>{r.count}</Text>
            <Text style={[s.td, s.right, { flex: 0.9, color: C.ink2 }]}>{fmtPct(r.winRate, locale)}</Text>
            <Text style={[s.td, s.right, { flex: 1.3, color: tone(r.net) }]}>{fmtMoney(r.net, currency, locale, { sign: true, decimals: 0 })}</Text>
            <Text style={[s.td, s.right, { flex: 1, color: tone(r.expectancyR ?? 0) }]}>{fmtR(r.expectancyR, locale)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ document */

export function JournalPdf(d: JournalReportData) {
  registerFonts();
  const { t, locale, tz, currency, stats: st } = d;
  const setupName = new Map(d.setups.map((x) => [x.id, x.name]));
  const closed = d.trades.filter((c) => c.trade.status === "closed");
  const withNotes = closed.filter((c) => c.trade.notes || c.trade.lesson);
  const money = (v: number, opts: Parameters<typeof fmtMoney>[3] = {}) => fmtMoney(v, currency, locale, opts);
  const pf = st.profitFactor == null ? "—" : isFinite(st.profitFactor) ? fmtNum(st.profitFactor, locale, 2) : "∞";

  const footer = (
    <View style={s.footer} fixed>
      <Text>
        Plumb · {d.accountLabel} · {t("common.disclaimer")}
      </Text>
      <Text render={({ pageNumber, totalPages }) => t("pdf.page", { n: pageNumber, total: totalPages })} />
    </View>
  );

  return (
    <Document title={`Plumb · ${t("pdf.title")}`} author="Plumb" creator="Plumb" language={locale}>
      {/* ---------------------------------------------------------- summary page */}
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View style={s.brand}>
            <Mark size={18} />
            <Text style={s.brandName}>Plumb</Text>
          </View>
          <Text style={s.headerMeta}>{t("pdf.generatedOn", { date: d.generatedAt })}</Text>
        </View>

        <Text style={s.title}>{t("pdf.title")}</Text>
        <Text style={s.subtitle}>
          {d.accountLabel} · {d.periodLabel} · {t("dashboard.tradesCount", { n: st.count })}
        </Text>

        <View style={s.kpiGrid}>
          <Kpi i={0} label={t("dashboard.netResult")} value={money(st.netPnl, { sign: true })} color={tone(st.netPnl)} sub={t("dashboard.tradesCount", { n: st.count })} />
          <Kpi i={1} label={t("dashboard.winRate")} value={fmtPct(st.winRate, locale)} sub={`${st.wins} ${t("common.won")} · ${st.losses} ${t("common.lost")}`} />
          <Kpi
            i={2}
            label={t("dashboard.expectancy")}
            value={fmtR(st.expectancyR, locale)}
            color={tone(st.expectancyR ?? 0)}
            sub={st.expectancy != null ? `${money(st.expectancy, { sign: true })} ${t("common.perTrade")}` : undefined}
          />
          <Kpi i={3} label={t("dashboard.profitFactor")} value={pf} />
          <Kpi i={4} label={t("dashboard.discipline")} value={st.disciplineScore != null ? `${st.disciplineScore}/100` : "—"} sub={`${st.respected} / ${st.count}`} />
          <Kpi i={5} label={t("analytics.maxDrawdown")} value={money(-st.maxDrawdown, { decimals: 0 })} color={C.loss} sub={fmtPct(st.maxDrawdownPct / 100, locale, 1)} />
          <Kpi i={6} label={t("pdf.costs")} value={money(-st.costOfMistakes, { decimals: 0 })} color={C.loss} />
          <Kpi i={7} label={t("pdf.cleanGap")} value={money(st.cleanPnl - st.netPnl, { sign: true, decimals: 0 })} />
        </View>

        <View style={s.section} wrap={false}>
          <Text style={s.h2}>{t("dashboard.equityTitle")}</Text>
          <View style={s.card}>
            {d.equity.length > 0 ? (
              <EquityCurve data={d.equity} start={d.startBalance} currency={currency} locale={locale} />
            ) : (
              <Text style={s.empty}>{t("pdf.noTrades")}</Text>
            )}
            <View style={s.legend}>
              <View style={s.legendItem}>
                <Svg width={14} height={4}>
                  <Line x1={0} x2={14} y1={2} y2={2} stroke={C.plum} strokeWidth={1.6} />
                </Svg>
                <Text>{t("dashboard.equity")}</Text>
              </View>
              <View style={s.legendItem}>
                <Svg width={14} height={4}>
                  <Line x1={0} x2={14} y1={2} y2={2} stroke={C.gain} strokeWidth={1.1} strokeDasharray="3 2" />
                </Svg>
                <Text>{t("dashboard.clean")}</Text>
              </View>
            </View>
            <Text style={{ fontSize: 7.5, color: C.muted, marginTop: 4 }}>{t("dashboard.equityHint")}</Text>
          </View>
        </View>

        <View style={s.section} wrap={false}>
          <Text style={s.h2}>{t("pdf.costs")}</Text>
          {d.costs.length === 0 ? (
            <Text style={s.empty}>{t("dashboard.costNone")}</Text>
          ) : (
            <View style={s.table}>
              <View style={s.th}>
                <Text style={[s.thText, { flex: 3 }]}>{t("pdf.ruleCol")}</Text>
                <Text style={[s.thText, s.right, { flex: 1 }]}>{t("pdf.times")}</Text>
                <Text style={[s.thText, s.right, { flex: 1.2 }]}>{t("rules.costLabel")}</Text>
              </View>
              {d.costs.map((c, i) => (
                <View key={c.kind} style={[s.tr, i === d.costs.length - 1 ? { borderBottomWidth: 0 } : {}]}>
                  <Text style={[s.td, { flex: 3 }]}>{t(`rules.kinds.${c.kind}.title`)}</Text>
                  <Text style={[s.td, s.right, { flex: 1, color: C.ink2 }]}>{c.count}</Text>
                  <Text style={[s.td, s.right, { flex: 1.2, color: C.loss, fontWeight: 500 }]}>{money(-c.cost, { decimals: 0 })}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {footer}
      </Page>

      {/* ---------------------------------------------------------- patterns page */}
      <Page size="A4" style={s.page}>
        {d.insights.length > 0 && (
          <View wrap={false}>
            <Text style={s.h2}>{t("dashboard.insightsTitle")}</Text>
            <Text style={{ fontSize: 7.5, color: C.muted, marginBottom: 4 }}>{t("dashboard.insightsHint")}</Text>
            {d.insights.map((ins, i) => (
              <View key={i} style={s.insight}>
                <Text style={{ fontSize: 8, color: C.muted, width: 14 }}>{String(i + 1).padStart(2, "0")}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 9.5 }}>{ins.text}</Text>
                  <Text style={{ fontSize: 8, color: C.muted, marginTop: 2 }}>{ins.question}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={[s.twoCols, { marginTop: d.insights.length > 0 ? 22 : 0 }]} wrap={false}>
          <Breakdown title={t("analytics.bySetup")} rows={d.bySetup} t={t} locale={locale} currency={currency} />
          <Breakdown title={t("analytics.byEmotion")} rows={d.byEmotion} t={t} locale={locale} currency={currency} />
        </View>
        {footer}
      </Page>

      {/* ---------------------------------------------------------- trades */}
      {d.include.trades && (
        <Page size="A4" orientation="landscape" style={s.page}>
          <Text style={s.h2}>
            {t("pdf.trades")} · {closed.length}
          </Text>
          {closed.length === 0 ? (
            <Text style={s.empty}>{t("pdf.noTrades")}</Text>
          ) : (
            <View style={s.table}>
              <View style={s.th} fixed>
                <Text style={[s.thText, { flex: 1.5 }]}>{t("journal.date")}</Text>
                <Text style={[s.thText, { flex: 1.1 }]}>{t("journal.symbol")}</Text>
                <Text style={[s.thText, { flex: 0.8 }]}>{t("journal.side")}</Text>
                <Text style={[s.thText, { flex: 2 }]}>{t("journal.setup")}</Text>
                <Text style={[s.thText, s.right, { flex: 1.1 }]}>{t("pdf.entry")}</Text>
                <Text style={[s.thText, s.right, { flex: 1.1 }]}>{t("pdf.exit")}</Text>
                <Text style={[s.thText, s.right, { flex: 0.8 }]}>{t("pdf.size")}</Text>
                <Text style={[s.thText, s.right, { flex: 1.2 }]}>{t("journal.result")}</Text>
                <Text style={[s.thText, s.right, { flex: 0.8 }]}>{t("journal.r")}</Text>
                <Text style={[s.thText, { flex: 1.1, paddingLeft: 10 }]}>{t("journal.emotion")}</Text>
                <Text style={[s.thText, { flex: 2.6 }]}>{t("journal.rules")}</Text>
              </View>
              {closed.map((c) => {
                const tr = c.trade;
                const dec = findInstrument(tr.symbol)?.decimals;
                const broken = [...new Set(c.violations.map((v) => v.kind))];
                return (
                  <View key={tr.id} style={s.tr} wrap={false}>
                    <Text style={[s.td, { flex: 1.5, color: C.ink2 }]}>
                      {fmtDate(tr.opened_at, locale, { day: "2-digit", month: "short", year: "2-digit" }, tz)} {fmtTime(tr.opened_at, locale, tz)}
                    </Text>
                    <Text style={[s.td, { flex: 1.1, fontWeight: 600 }]}>{tr.symbol}</Text>
                    <Text style={[s.td, { flex: 0.8, color: tr.direction === "long" ? C.gain : C.loss }]}>{t(`common.${tr.direction}`)}</Text>
                    <Text style={[s.td, { flex: 2, color: C.ink2 }]}>{tr.setup_id ? (setupName.get(tr.setup_id) ?? "—") : "—"}</Text>
                    <Text style={[s.td, s.right, { flex: 1.1 }]}>{fmtPrice(tr.entry_price, locale, dec)}</Text>
                    <Text style={[s.td, s.right, { flex: 1.1 }]}>{fmtPrice(tr.exit_price, locale, dec)}</Text>
                    <Text style={[s.td, s.right, { flex: 0.8, color: C.ink2 }]}>{tr.size != null ? fmtNum(tr.size, locale, 2) : "—"}</Text>
                    <Text style={[s.td, s.right, { flex: 1.2, color: tone(c.pnl), fontWeight: 500 }]}>{money(c.pnl, { sign: true })}</Text>
                    <Text style={[s.td, s.right, { flex: 0.8, color: tone(c.r ?? 0) }]}>{fmtR(c.r, locale)}</Text>
                    <Text style={[s.td, { flex: 1.1, paddingLeft: 10, color: C.ink2 }]}>{tr.emotion_before ? t(`emotions.${tr.emotion_before}`) : "—"}</Text>
                    <Text style={[s.td, { flex: 2.6, color: broken.length ? C.ochre : C.gain }]}>
                      {broken.length ? broken.map((k) => t(`rules.kinds.${k}.title`)).join(", ") : t("pdf.ok")}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
          {footer}
        </Page>
      )}

      {/* ---------------------------------------------------------- notes & reviews */}
      {((d.include.notes && withNotes.length > 0) || (d.include.reviews && d.reviews.length > 0)) && (
        <Page size="A4" style={s.page}>
          {d.include.notes && withNotes.length > 0 && (
            <View>
              <Text style={s.h2}>{t("pdf.notes")}</Text>
              {withNotes.map((c) => (
                <View key={c.trade.id} style={s.note} wrap={false}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                    <Text style={{ fontSize: 8.5, fontWeight: 600 }}>
                      {c.trade.symbol} <Text style={{ fontWeight: 400, color: C.muted }}>· {fmtDate(c.trade.opened_at, locale, { day: "numeric", month: "long", year: "numeric" }, tz)}</Text>
                    </Text>
                    <Text style={{ fontSize: 8.5, color: tone(c.pnl), fontWeight: 500 }}>
                      {money(c.pnl, { sign: true })} · {fmtR(c.r, locale)}
                    </Text>
                  </View>
                  {c.trade.notes ? <Text style={{ fontSize: 9, color: C.ink }}>{c.trade.notes}</Text> : null}
                  {c.trade.lesson ? (
                    <Text style={{ fontSize: 8.5, color: C.ink2, marginTop: 4 }}>
                      <Text style={{ fontWeight: 600 }}>{t("trade.lesson")}{locale === "fr" ? " : " : ": "}</Text>
                      {c.trade.lesson}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          )}

          {d.include.reviews && d.reviews.length > 0 && (
            <View style={{ marginTop: d.include.notes && withNotes.length > 0 ? 18 : 0 }}>
              <Text style={s.h2}>{t("pdf.reviews")}</Text>
              {d.reviews.map((r) => (
                <View key={r.id} style={s.note} wrap={false}>
                  <Text style={{ fontSize: 9, fontWeight: 600, marginBottom: 5 }}>
                    {t("review.week", { date: fmtDate(`${r.week_start}T12:00:00Z`, locale, { day: "numeric", month: "long", year: "numeric" }, "UTC") })}
                  </Text>
                  {(
                    [
                      ["review.q1", r.went_well],
                      ["review.q2", r.to_improve],
                      ["review.q3", r.focus_next],
                    ] as const
                  )
                    .filter(([, v]) => v)
                    .map(([k, v]) => (
                      <View key={k} style={{ marginBottom: 3 }}>
                        <Text style={{ fontSize: 7.5, color: C.muted }}>{t(k)}</Text>
                        <Text style={{ fontSize: 9 }}>{v}</Text>
                      </View>
                    ))}
                </View>
              ))}
            </View>
          )}
          {footer}
        </Page>
      )}
    </Document>
  );
}
