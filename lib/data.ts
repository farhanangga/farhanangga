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
    "Front-end developer yang berpengalaman membangun aplikasi web responsif dengan React.js, Next.js, TypeScript, dan Tailwind CSS. Saya terbiasa menerjemahkan desain Figma menjadi antarmuka yang berfungsi, membuat komponen yang bisa dipakai ulang, menghubungkan REST API, dan bekerja bersama desainer UI/UX maupun tim pengembang.",
  graduatedFrom: "Universitas Pendidikan Indonesia",
  degree: "S1 Rekayasa Perangkat Lunak, 2022 – 2026",
  gpa: 3.83,
  projectCount: 6,
  email: "farhanangga8900@gmail.com",
  location: "Cirebon, Indonesia",
};

export const roles = [
  { label: "Software Engineer", href: "/apps", color: "#6366F1", text: "#fff", icon: "terminal" },
  { label: "UI/UX Designer", href: "/uiux", color: "#F25C5C", text: "#000", icon: "palette" },
  { label: "Photography", href: "/photography", color: "#FFC857", text: "#000", icon: "camera" },
];

export const navLinks = [
  { label: "Blog", href: "/blog", locked: true },
  { label: "Apps", href: "/apps" },
  { label: "Home", href: "/" },
  { label: "Photography", href: "/photography" },
  { label: "UI/UX", href: "/uiux" },
];

// Ganti href dengan username asli Anda
export const contacts = [
  { platform: "LinkedIn", href: "https://linkedin.com", icon: "linkedin" },
  { platform: "GitHub", href: "https://github.com", icon: "github" },
  { platform: "Instagram", href: "https://instagram.com", icon: "instagram" },
];

export const bestProject = {
  title: "Casepose",
  subtitle: "Student Portfolio & Social Media Platform",
  description:
    "Platform web tempat mahasiswa memamerkan portofolio, mempromosikan proyek, dan mengelola konten. Dilengkapi CRUD, login Google, fitur promosi postingan, serta riwayat transaksi dan laporan.",
  image: dummyProject,
  role: "Full-Stack Developer",
  engagement: "Individu",
  category: "Website",
  tools: ["PHP Native", "MySQL", "Google Login", "CRUD", "Tailwind CSS"],
};

export const otherProjects = [
  { title: "SlogLab", type: "Document Tracking System", desc: "Antarmuka pelacakan dokumen untuk alur kerja operasional, dibangun dari desain UI/UX.", tools: "React.js, Tailwind CSS" },
  { title: "Rampcheck Nasional", type: "Transportation Inspection System", desc: "Antarmuka web inspeksi bus untuk penilaian kelayakan kendaraan, mendigitalkan formulir inspeksi.", tools: "Next.js, React.js, Tailwind CSS" },
  { title: "Bimbim", type: "Digital Cashier & Financial Reporting", desc: "Aplikasi kasir digital dengan manajemen transaksi dan laporan keuangan.", tools: "Web App" },
  { title: "Kerthi Bali Santhi", type: "Digital Dashboard", desc: "Dashboard perusahaan daerah Bali dengan visualisasi data operasional interaktif.", tools: "Laravel, Tailwind CSS, Chart.js" },
  { title: "Jaring Company Profile", type: "Corporate Website", desc: "Website perusahaan responsif berisi profil, produk, dan layanan.", tools: "Web" },
];

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
