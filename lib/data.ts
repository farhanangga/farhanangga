/**
 * Semua konten website ada di sini.
 * Nanti, saat dashboard admin + database sudah siap, ganti isi file ini
 * dengan fetch dari database (Prisma / API).
 */

export function placeholder(w: number, h: number, inner: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${inner}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const dummyPhoto = placeholder(
  520, 720,
  `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E8ECFF"/><stop offset="1" stop-color="#9AA3E8"/></linearGradient></defs>
   <circle cx="260" cy="230" r="120" fill="url(#g)"/>
   <path d="M40 720 C40 520 140 430 260 430 C380 430 480 520 480 720 Z" fill="url(#g)"/>`
);

export const dummyProject = placeholder(
  1280, 800,
  `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1E1B6B"/><stop offset="1" stop-color="#6C63FF"/></linearGradient></defs>
   <rect width="1280" height="800" fill="url(#g)"/>
   <rect x="140" y="130" width="1000" height="540" rx="24" fill="#0B0B24" opacity="0.85"/>
   <rect x="190" y="190" width="300" height="28" rx="14" fill="#FFC857"/>
   <rect x="190" y="260" width="620" height="18" rx="9" fill="#fff" opacity="0.5"/>
   <rect x="190" y="300" width="520" height="18" rx="9" fill="#fff" opacity="0.3"/>
   <rect x="190" y="380" width="280" height="220" rx="16" fill="#6C63FF" opacity="0.7"/>
   <rect x="500" y="380" width="280" height="220" rx="16" fill="#F25C5C" opacity="0.6"/>
   <rect x="810" y="380" width="280" height="220" rx="16" fill="#FFC857" opacity="0.6"/>`
);

export const profile = {
  firstName: "FARHAN",
  accent: "ANGGA",
  lastName: "RIYANTO",
  photo: dummyPhoto, // ganti dengan "/profile.png"
  tagline:
    "Membangun antarmuka web yang responsif dan mudah dipakai, dari desain di Figma sampai kode yang berjalan di produksi.",
  about:
    "Software Engineer yang berpengalaman membangun aplikasi web responsif dengan React.js, Next.js, TypeScript, dan Tailwind CSS. Saya terbiasa menerjemahkan desain Figma menjadi antarmuka yang berfungsi, membuat komponen yang bisa dipakai ulang, menghubungkan REST API, dan bekerja bersama desainer UI/UX maupun tim pengembang.",
  graduatedFrom: "Universitas Pendidikan Indonesia",
  degree: "S1 Rekayasa Perangkat Lunak, 2022 – 2026",
  gpa: 3.83,
  projectCount: 6,
  email: "farhanangga8900@gmail.com",
  location: "Cirebon, Indonesia",
};

export const roles = [
  { label: "Software Engineer", href: "/projects?role=software", color: "#6366F1", text: "#fff", icon: "terminal" },
  { label: "UI/UX Designer", href: "/projects?role=uiux", color: "#F25C5C", text: "#000", icon: "palette" },
  { label: "Photography", href: "/projects?role=photography", color: "#FFC857", text: "#000", icon: "camera" },
];

export type NavLink = {
  label: string;
  href: string;
  locked?: boolean; // true = halaman belum tersedia
};

export const navLinks: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "Projects", href: "/projects" },
  { label: "Activity", href: "/activity" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
];

// Ganti href dengan username asli Anda
export const contacts = [
  { platform: "LinkedIn", href: "https://linkedin.com/in/farhan-angga-riyanto-7a29aa246/", icon: "linkedin" },
  { platform: "GitHub", href: "https://github.com/farhanangga", icon: "github" },
  { platform: "Instagram", href: "https://instagram.com/_frhnangga", icon: "instagram" },
];

/* ───────────── Proyek (dipakai komponen BestProject) ───────────── */

/** 5 gambar per proyek: /assets/project/project{n}-1.png sampai project{n}-5.png */
const shots = (n: number) =>
  Array.from({ length: 5 }, (_, i) => `/assets/project/project${n}-${i + 1}.png`);

export type ProjectItem = {
  id: string;
  title: string;
  type: string;
  role: string;
  tools: string[];
  desc: string;
  highlights: string[];
  images: string[];
};

export type ProjectTab = {
  id: string;
  label: string;
  short: string;
  typeLabel: string;
  toolsLabel: string;
  projects: ProjectItem[];
};

export const projectTabs: ProjectTab[] = [
  {
    id: "software",
    label: "Software Engineer",
    short: "Software",
    typeLabel: "Jenis aplikasi",
    toolsLabel: "Tools",
    projects: [
      {
        id: "casepose",
        title: "Casepose",
        type: "Student Portfolio & Social Media",
        role: "Full-Stack Developer · Individu",
        tools: ["PHP Native", "MySQL", "Google Login", "Tailwind CSS"],
        desc: "Platform web tempat mahasiswa memamerkan portofolio, mempromosikan proyek, dan mengelola konten.",
        highlights: [
          "CRUD konten portofolio dan postingan",
          "Login dengan akun Google",
          "Fitur promosi postingan",
          "Riwayat transaksi dan laporan",
        ],
        images: shots(1),
      },
      {
        id: "sloglab",
        title: "SlogLab",
        type: "Document Tracking System",
        role: "Front-End Developer · Tim", // (sesuaikan)
        tools: ["React.js", "Tailwind CSS"],
        desc: "Antarmuka pelacakan dokumen untuk alur kerja operasional, dibangun dari desain UI/UX.",
        highlights: ["Pelacakan status dokumen", "Tampilan sesuai peran pengguna", "Log aktivitas"],
        images: shots(2),
      },
      {
        id: "rampcheck",
        title: "Rampcheck Nasional",
        type: "Transportation Inspection System",
        role: "Front-End Developer · Tim", // (sesuaikan)
        tools: ["Next.js", "React.js", "Tailwind CSS"],
        desc: "Antarmuka web inspeksi bus untuk penilaian kelayakan kendaraan, mendigitalkan formulir inspeksi.",
        highlights: ["Formulir inspeksi digital", "Penilaian kelayakan kendaraan", "Responsif untuk dipakai di lapangan"],
        images: shots(3),
      },
      {
        id: "bimbim",
        title: "Bimbim",
        type: "Digital Cashier & Financial Reporting",
        role: "Full-Stack Developer · Individu", // (sesuaikan)
        tools: ["Web App"], // (ganti dengan tools asli)
        desc: "Aplikasi kasir digital dengan manajemen transaksi dan laporan keuangan.",
        highlights: ["Pencatatan transaksi", "Laporan keuangan"],
        images: shots(4),
      },
      {
        id: "kerthi-bali-santhi",
        title: "Kerthi Bali Santhi",
        type: "Digital Dashboard",
        role: "Full-Stack Developer · Tim", // (sesuaikan)
        tools: ["Laravel", "Tailwind CSS", "Chart.js"],
        desc: "Dashboard perusahaan daerah Bali dengan visualisasi data operasional interaktif.",
        highlights: ["Grafik data operasional", "Ringkasan data dalam satu layar"],
        images: shots(5),
      },
      {
        id: "jaring-company-profile",
        title: "Jaring Company Profile",
        type: "Corporate Website",
        role: "Front-End Developer · Tim", // (sesuaikan)
        tools: ["Next.js", "Tailwind CSS"], // (sesuaikan)
        desc: "Website perusahaan responsif berisi profil, produk, dan layanan.",
        highlights: ["Layout responsif", "Halaman profil, produk, dan layanan"],
        images: shots(6),
      },
    ],
  },
  {
    id: "uiux",
    label: "UI/UX Design",
    short: "UI/UX",
    typeLabel: "Jenis desain",
    toolsLabel: "Tools",
    projects: [
      // GANTI semua placeholder di bawah dengan proyek UI/UX Anda
      { id: "uiux-1", title: "Proyek UI/UX 1", type: "Mobile App Design", role: "UI/UX Designer", tools: ["Figma"], desc: "Deskripsi singkat proyek.", highlights: ["Riset pengguna", "Wireframe dan prototype"], images: shots(7) },
      { id: "uiux-2", title: "Proyek UI/UX 2", type: "Web App Design", role: "UI/UX Designer", tools: ["Figma"], desc: "Deskripsi singkat proyek.", highlights: ["Design system", "Prototype interaktif"], images: shots(8) },
      { id: "uiux-3", title: "Proyek UI/UX 3", type: "Dashboard Design", role: "UI/UX Designer", tools: ["Figma"], desc: "Deskripsi singkat proyek.", highlights: ["Visualisasi data"], images: shots(9) },
      { id: "uiux-4", title: "Proyek UI/UX 4", type: "Landing Page", role: "UI/UX Designer", tools: ["Figma"], desc: "Deskripsi singkat proyek.", highlights: ["Layout responsif"], images: shots(10) },
      { id: "uiux-5", title: "Proyek UI/UX 5", type: "E-Commerce App", role: "UI/UX Designer", tools: ["Figma"], desc: "Deskripsi singkat proyek.", highlights: ["Alur checkout"], images: shots(11) },
      { id: "uiux-6", title: "Proyek UI/UX 6", type: "Branding & Logo", role: "Designer", tools: ["Figma"], desc: "Deskripsi singkat proyek.", highlights: ["Identitas visual"], images: shots(12) },
    ],
  },
  {
    id: "photo",
    label: "Photographer",
    short: "Foto",
    typeLabel: "Kategori foto",
    toolsLabel: "Peralatan",
    projects: [
      // GANTI semua placeholder di bawah dengan proyek fotografi Anda
      { id: "foto-1", title: "Proyek Foto 1", type: "Portrait", role: "Photographer", tools: ["Kamera", "Lightroom"], desc: "Deskripsi singkat sesi foto.", highlights: ["Lokasi dan tahun"], images: shots(13) },
      { id: "foto-2", title: "Proyek Foto 2", type: "Event", role: "Photographer", tools: ["Kamera", "Lightroom"], desc: "Deskripsi singkat sesi foto.", highlights: ["Lokasi dan tahun"], images: shots(14) },
      { id: "foto-3", title: "Proyek Foto 3", type: "Product", role: "Photographer", tools: ["Kamera", "Lightroom"], desc: "Deskripsi singkat sesi foto.", highlights: ["Lokasi dan tahun"], images: shots(15) },
      { id: "foto-4", title: "Proyek Foto 4", type: "Landscape", role: "Photographer", tools: ["Kamera", "Lightroom"], desc: "Deskripsi singkat sesi foto.", highlights: ["Lokasi dan tahun"], images: shots(16) },
      { id: "foto-5", title: "Proyek Foto 5", type: "Street", role: "Photographer", tools: ["Kamera", "Lightroom"], desc: "Deskripsi singkat sesi foto.", highlights: ["Lokasi dan tahun"], images: shots(17) },
      { id: "foto-6", title: "Proyek Foto 6", type: "Wisuda", role: "Photographer", tools: ["Kamera", "Lightroom"], desc: "Deskripsi singkat sesi foto.", highlights: ["Lokasi dan tahun"], images: shots(18) },
    ],
  },
];

/* ───────────── Data lain ───────────── */

export const experiences = [
  {
    role: "Front-End Developer", company: "SuCC Team (Freelance)", place: "Remote", period: "Mei 2026 – Sekarang",
    points: [
      "Membuat antarmuka web responsif dengan React.js, Next.js, dan Tailwind CSS sesuai kebutuhan proyek.",
      "Menerjemahkan desain UI/UX menjadi antarmuka yang konsisten dan berfungsi.",
      "Ikut mendukung pengembangan produk dari desain antarmuka sampai implementasi front-end.",
    ],
  },
  {
    role: "Front-End Developer (Magang)", company: "PT Jaring Solusi Aplikasi", place: "Jakarta Pusat", period: "Sep – Des 2025",
    points: [
      "Mengembangkan antarmuka untuk beberapa proyek aplikasi web dengan React.js, Next.js, dan Tailwind CSS.",
      "Membuat komponen yang bisa dipakai ulang agar tampilan konsisten dan implementasi lebih cepat.",
      "Berkolaborasi dengan desainer UI/UX dan tim pengembang.",
    ],
  },
  {
    role: "Front-End Developer (Magang)", company: "PT Masagi Energi Hijau", place: "Sukabumi", period: "Mar – Jun 2025",
    points: [
      "Merancang antarmuka website di Figma berdasarkan kebutuhan bisnis.",
      "Mengimplementasikan desain Figma dengan Next.js dan Tailwind CSS.",
      "Membuat layout responsif untuk desktop dan mobile.",
    ],
  },
];

export const orgs = [
  "Staf Divisi Koordinasi dan Aspirasi, DPM UPI Cibiru (2024 – 2025)",
  "Staf Divisi BURTA, HIMA RPL (2024)",
  "Staf Komisi, HIMA RPL (2023)",
];
export const certs = [
  "Dicoding: Belajar Dasar AI",
  "BNSP: KKNI Level II Rekayasa Perangkat Lunak",
  "Juara 1 Sayembara Logo Kabinet Daya Cita, DPM UPI Cibiru",
];

export const toolGroups = [
  { title: "Frontend", items: ["React.js", "Next.js", "TypeScript", "JavaScript", "HTML5", "CSS3", "Tailwind CSS"] },
  { title: "UI/UX Design", items: ["Figma", "Wireframing", "Prototyping", "UI Design", "UX Principles"] },
  { title: "Backend & Database", items: ["Node.js", "NestJS", "Laravel", "PHP", "PostgreSQL", "MySQL", "Supabase"] },
  { title: "Tools & Deployment", items: ["Git", "GitHub", "Vercel", "VS Code"] },
];
export const marqueeTools = toolGroups.flatMap((g) => g.items);