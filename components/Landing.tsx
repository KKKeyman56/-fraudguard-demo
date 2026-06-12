import Link from "next/link";

export default function Landing() {
  return (
    <main className="landing">
      {/* ===== Hero ===== */}
      <section className="hero">
        <p className="hero-eyebrow">Asisten belajar AI untuk pelajar Indonesia</p>
        <h1 className="hero-title">
          Foto soalnya,
          <br />
          <em>pahami</em> caranya.
        </h1>
        <p className="hero-sub">
          Belajarin mengubah foto tugas sekolahmu jadi panduan belajar lengkap — penjelasan
          konsep, langkah pengerjaan, contoh serupa, dan latihan. Kamu yang mengerjakan, kami
          yang menemani paham.
        </p>
        <div className="hero-cta">
          <Link href="/login" className="btn-primary">
            Coba Gratis Sekarang
          </Link>
          <span className="hero-note">3 panduan gratis tiap hari · tanpa kartu kredit</span>
        </div>

        <div className="hero-mock" aria-hidden="true">
          <div className="mock-line mock-title">Persamaan Linear Satu Variabel</div>
          <div className="mock-tag">Matematika · SMP kelas 7</div>
          <div className="mock-section">✏️ Konsep Kunci</div>
          <div className="mock-line w80" />
          <div className="mock-line w95" />
          <div className="mock-section">🧭 Panduan Pengerjaan (tanpa jawaban jadi)</div>
          <div className="mock-line w90" />
          <div className="mock-line w70" />
          <div className="mock-section">✅ Contoh Serupa + Latihan Mandiri</div>
          <div className="mock-line w85" />
        </div>
      </section>

      {/* ===== Cara kerja ===== */}
      <section className="section">
        <h2 className="section-heading">Tiga langkah, langsung paham</h2>
        <div className="steps">
          <div className="step">
            <div className="step-num">1</div>
            <h3>Foto soalmu</h3>
            <p>
              Jepret tugas dari buku, LKS, atau papan tulis. Foto buram pun biasanya masih
              terbaca — dan dikompres otomatis di HP-mu.
            </p>
          </div>
          <div className="step">
            <div className="step-num">2</div>
            <h3>AI menganalisis</h3>
            <p>
              Dalam hitungan detik, AI membaca setiap soal, mengenali materi dan jenjangnya,
              lalu menyusun panduan belajar khusus untuk soal itu.
            </p>
          </div>
          <div className="step">
            <div className="step-num">3</div>
            <h3>Pahami &amp; kerjakan</h3>
            <p>
              Baca di web atau unduh PDF-nya: konsep, langkah pengerjaan, contoh yang dibahas
              tuntas, dan latihan untuk mengetes dirimu.
            </p>
          </div>
        </div>
      </section>

      {/* ===== Kenapa beda ===== */}
      <section className="section">
        <h2 className="section-heading">Bukan joki. Teman belajar.</h2>
        <div className="features">
          <div className="feature">
            <h3>🧠 Paham, bukan nyontek</h3>
            <p>
              Untuk soal aslimu, kami sengaja tidak memberi jawaban akhir — yang kamu dapat
              adalah cara berpikirnya, plus petunjuk untuk mengecek jawabanmu sendiri.
            </p>
          </div>
          <div className="feature">
            <h3>📝 Contoh dibahas tuntas</h3>
            <p>
              AI membuat soal kembar dengan angka berbeda dan membahasnya sampai selesai, jadi
              kamu punya model pengerjaan yang bisa ditiru.
            </p>
          </div>
          <div className="feature">
            <h3>📄 PDF siap dibawa</h3>
            <p>
              Setiap panduan bisa diunduh sebagai PDF rapi — enak dibaca ulang menjelang
              ulangan, bahkan tanpa internet.
            </p>
          </div>
          <div className="feature">
            <h3>📚 Riwayat tersimpan</h3>
            <p>
              Semua panduan otomatis tersimpan di akunmu. Materi minggu lalu? Tinggal buka
              lagi.
            </p>
          </div>
        </div>
      </section>

      {/* ===== Harga ===== */}
      <section className="section">
        <h2 className="section-heading">Harga ramah kantong pelajar</h2>
        <div className="plans">
          <div className="plan">
            <h3>Gratis</h3>
            <p className="plan-price">
              Rp 0 <span>/ selamanya</span>
            </p>
            <ul>
              <li>3 panduan per hari</li>
              <li>PDF &amp; riwayat lengkap</li>
              <li>Semua mata pelajaran</li>
            </ul>
            <Link href="/login" className="btn-secondary">
              Mulai Gratis
            </Link>
          </div>
          <div className="plan plan-featured">
            <div className="plan-badge">Paling laris</div>
            <h3>Premium</h3>
            <p className="plan-price">
              Rp 25.000 <span>/ 30 hari</span>
            </p>
            <ul>
              <li>
                <strong>30 panduan per hari</strong>
              </li>
              <li>PDF &amp; riwayat lengkap</li>
              <li>Masa aktif menumpuk, tidak hangus</li>
            </ul>
            <Link href="/upgrade" className="btn-primary">
              Lihat Cara Upgrade
            </Link>
          </div>
        </div>
      </section>

      {/* ===== CTA penutup ===== */}
      <section className="section closing">
        <h2 className="section-heading">PR menumpuk? Yuk, pahami bareng.</h2>
        <Link href="/login" className="btn-primary">
          Daftar Gratis — 1 Menit
        </Link>
      </section>

      <footer className="footer">
        Belajarin © {new Date().getFullYear()} — dibuat untuk pelajar Indonesia. Belajar
        jujur, paham beneran.
      </footer>
    </main>
  );
}
