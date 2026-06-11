import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { StudyGuide } from "./schema";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: "Helvetica", lineHeight: 1.5 },
  title: { fontSize: 18, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  meta: { fontSize: 10, color: "#555", marginBottom: 14 },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    marginTop: 14,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: "#999",
  },
  itemTitle: { fontFamily: "Helvetica-Bold", marginTop: 6, marginBottom: 2 },
  paragraph: { marginBottom: 4 },
  listItem: { marginBottom: 2, marginLeft: 10 },
  hint: { marginTop: 2, marginLeft: 10, color: "#333", fontFamily: "Helvetica-Oblique" },
  answer: { marginTop: 2, marginLeft: 10, fontFamily: "Helvetica-Bold" },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#888",
    textAlign: "center",
  },
});

export function StudyGuidePdf({ guide }: { guide: StudyGuide }) {
  return (
    <Document title={guide.judul}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{guide.judul}</Text>
        <Text style={styles.meta}>
          {guide.mata_pelajaran} - {guide.perkiraan_tingkat}
        </Text>

        <Text style={styles.sectionTitle}>Soal yang Terdeteksi</Text>
        {guide.soal_terdeteksi.map((s, i) => (
          <Text key={i} style={styles.listItem}>
            {i + 1}. {s}
          </Text>
        ))}

        <Text style={styles.sectionTitle}>Konsep Kunci</Text>
        {guide.konsep_kunci.map((k, i) => (
          <View key={i} wrap={false}>
            <Text style={styles.itemTitle}>{k.nama}</Text>
            <Text style={styles.paragraph}>{k.penjelasan}</Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Panduan Pengerjaan (kerjakan sendiri, ya!)</Text>
        {guide.panduan_pengerjaan.map((p, i) => (
          <View key={i}>
            <Text style={styles.itemTitle}>Soal: {p.soal}</Text>
            {p.langkah.map((l, j) => (
              <Text key={j} style={styles.listItem}>
                Langkah {j + 1}: {l}
              </Text>
            ))}
            <Text style={styles.hint}>Cek jawabanmu: {p.petunjuk}</Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Contoh Soal Serupa (dibahas tuntas)</Text>
        {guide.contoh_serupa.map((c, i) => (
          <View key={i}>
            <Text style={styles.itemTitle}>Contoh {i + 1}: {c.soal}</Text>
            {c.pembahasan.map((l, j) => (
              <Text key={j} style={styles.listItem}>
                {l}
              </Text>
            ))}
            <Text style={styles.answer}>Jawaban: {c.jawaban}</Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Latihan Mandiri</Text>
        {guide.latihan_mandiri.map((l, i) => (
          <Text key={i} style={styles.listItem}>
            {i + 1}. {l.soal}
          </Text>
        ))}
        <Text style={styles.itemTitle}>Kunci Jawaban Latihan</Text>
        {guide.latihan_mandiri.map((l, i) => (
          <Text key={i} style={styles.listItem}>
            {i + 1}. {l.kunci}
          </Text>
        ))}

        <Text style={styles.sectionTitle}>Tips</Text>
        {guide.tips.map((t, i) => (
          <Text key={i} style={styles.listItem}>
            - {t}
          </Text>
        ))}

        <Text style={styles.footer} fixed>
          Dibuat dengan Belajarin - panduan belajar AI. Pahami caranya, kerjakan sendiri.
        </Text>
      </Page>
    </Document>
  );
}
