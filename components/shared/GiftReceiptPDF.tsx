import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from "@react-pdf/renderer";
import type { ReceiptData } from "@/components/shared/ReceiptPDF";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(timestamp: number): string {
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const PHT_OFFSET_MS = 8 * 60 * 60 * 1000;
  const pht = new Date(timestamp + PHT_OFFSET_MS);
  return `${MONTHS[pht.getUTCMonth()]} ${pht.getUTCDate()}, ${pht.getUTCFullYear()}`;
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    width: 226,
    padding: 10,
    fontFamily: "Helvetica",
    fontSize: 8,
  },
  header: {
    textAlign: "center" as const,
    marginBottom: 4,
  },
  businessName: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    textAlign: "center" as const,
  },
  addressText: {
    fontSize: 7,
    textAlign: "center" as const,
    marginTop: 1,
  },
  giftLabel: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    textAlign: "center" as const,
    marginTop: 6,
    marginBottom: 2,
    letterSpacing: 1,
  },
  hr: {
    borderBottomWidth: 0.5,
    borderBottomColor: "#000",
    borderBottomStyle: "dashed" as const,
    marginVertical: 4,
  },
  metaRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    marginBottom: 1,
  },
  metaLabel: {
    fontSize: 7,
  },
  metaValue: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
  },
  itemRow: {
    marginBottom: 4,
  },
  itemName: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
  },
  itemDetail: {
    fontSize: 7,
    color: "#555",
    marginTop: 1,
  },
  itemQty: {
    fontSize: 7,
    marginTop: 1,
  },
  footer: {
    marginTop: 8,
    textAlign: "center" as const,
  },
  footerText: {
    fontSize: 7,
    textAlign: "center" as const,
    marginBottom: 2,
  },
  footerNote: {
    fontSize: 6,
    textAlign: "center" as const,
    color: "#555",
    marginBottom: 1,
  },
  footerBold: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    textAlign: "center" as const,
    marginTop: 4,
  },
});

// ─── Component ───────────────────────────────────────────────────────────────

export function GiftReceiptPDF({ data }: { data: ReceiptData }) {
  const { transaction: txn, items, branch, business, businessAddress } = data;

  return (
    <Document>
      <Page size={[226, 841]} style={styles.page}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.businessName}>
            {business.name || "RedBox Apparel"}
          </Text>
          <Text style={styles.addressText}>
            {businessAddress || branch.address}
          </Text>
          {businessAddress && businessAddress !== branch.address && (
            <Text style={styles.addressText}>
              Branch: {branch.name} - {branch.address}
            </Text>
          )}
        </View>

        <View style={styles.hr} />

        {/* ── Gift Receipt label ── */}
        <Text style={styles.giftLabel}>— GIFT RECEIPT —</Text>

        <View style={styles.hr} />

        {/* ── Metadata (ref # + date only — no cashier, no prices) ── */}
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Ref #:</Text>
          <Text style={styles.metaValue}>{txn.receiptNumber}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Date:</Text>
          <Text style={styles.metaValue}>{formatDate(txn.createdAt)}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Branch:</Text>
          <Text style={styles.metaValue}>{branch.name}</Text>
        </View>

        <View style={styles.hr} />

        {/* ── Items (no prices) ── */}
        {items.map((item, idx) => (
          <View key={idx} style={styles.itemRow}>
            <Text style={styles.itemName}>{item.styleName}</Text>
            <Text style={styles.itemDetail}>
              {item.size} / {item.color}
              {item.sku ? `  ·  SKU: ${item.sku}` : ""}
            </Text>
            <Text style={styles.itemQty}>Qty: {item.quantity}</Text>
          </View>
        ))}

        <View style={styles.hr} />

        {/* ── Exchange policy footer ── */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>This item was a gift!</Text>
          <Text style={styles.footerNote}>
            Items may be exchanged within 30 days
          </Text>
          <Text style={styles.footerNote}>
            with this receipt at any RedBox Apparel branch.
          </Text>
          <Text style={styles.footerNote}>
            Subject to availability. No cash value.
          </Text>
          <Text style={styles.footerBold}>GIFT RECEIPT</Text>
        </View>
      </Page>
    </Document>
  );
}
