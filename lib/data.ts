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

// href memakai id tab di projectTabs: software | uiux | photo
export const roles = [
  { label: "Software Engineer", href: "/projects?role=software", color: "#6366F1", text: "#fff", icon: "terminal" },
  { label: "UI/UX Designer", href: "/projects?role=uiux", color: "#F25C5C", text: "#000", icon: "palette" },
  { label: "Photography", href: "/projects?role=photo", color: "#FFC857", text: "#000", icon: "camera" },
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

/* ═════════════════════════════════════════════════════════════
   PROYEK
   Tiga "tabel" (nanti tinggal dipindah ke database):
     1. projects       -> detail proyek
     2. gambarProject  -> gambar tiap proyek (maks 10 per proyek)
     3. bestProject    -> daftar proyek terbaik (urutan + idProject)

   Letak file gambar: public/assets/projects/project{n}/<nama-file>
   Nama file ditulis MANUAL di kolom `src` pada gambarProject.
   ═════════════════════════════════════════════════════════════ */

export const MAX_PICTURES_PER_PROJECT = 10;
/** Maksimal proyek terbaik yang ditampilkan per tab/bidang */
export const BEST_PROJECT_LIMIT = 6;

export type ProjectCategory = "software" | "uiux" | "photo";

/** Tabel 1: project */
export type Project = {
  id: string;
  category: ProjectCategory;
  title: string;
  type: string;
  role: string;
  tools: string[];
  desc: string;
  highlights: string[];
  /**
   * Link halaman web proyek (demo / live / prototype / album).
   * Opsional: kalau kosong, tombol di modal otomatis disembunyikan.
   * Harus diawali https:// atau http://
   */
  url?: string;
  /**
   * Link repository GitHub proyek.
   * Opsional: kalau kosong, tombol repository di modal otomatis disembunyikan.
   */
  repo?: string;
};

/** Tabel 2: gambarProject */
export type GambarProject = {
  idPicture: string;
  idProject: string;
  /** Urutan tampil, mulai dari 1. Order 1 dipakai sebagai cover. */
  order: number;
  /** Path file di folder public, ditulis manual. */
  src: string;
};

/** Tabel 3: bestProject */
export type BestProjectRow = {
  order: number;
  idProject: string;
};

/** TODO: DUMMY. Ganti dengan link asli tiap proyek, lalu hapus helper ini. */
const dummyUrl = (slug: string) => `https://example.com/${slug}`;
/** TODO: DUMMY. Ganti dengan link repository asli (atau hapus baris repo kalau repo private). */
const dummyRepo = (slug: string) => `https://github.com/farhanangga/${slug}`;

/* ───────────── Tabel 1: project ───────────── */

export const projects: Project[] = [
  {
    id: "casepose",
    category: "software",
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
    url: dummyUrl("casepose"), // TODO: link asli
    repo: dummyRepo("casepose"), // TODO: link repo asli
  },
  {
    id: "sloglab",
    category: "software",
    title: "SlogLab",
    type: "Document Tracking System",
    role: "Front-End Developer · Tim", // TODO: sesuaikan
    tools: ["React.js", "Tailwind CSS"],
    desc: "Antarmuka pelacakan dokumen untuk alur kerja operasional, dibangun dari desain UI/UX.",
    highlights: ["Pelacakan status dokumen", "Tampilan sesuai peran pengguna", "Log aktivitas"],
    url: dummyUrl("sloglab"), // TODO: link asli
    repo: dummyRepo("sloglab"), // TODO: link repo asli
  },
  {
    id: "rampcheck",
    category: "software",
    title: "Rampcheck Nasional",
    type: "Transportation Inspection System",
    role: "Front-End Developer · Tim", // TODO: sesuaikan
    tools: ["Next.js", "React.js", "Tailwind CSS"],
    desc: "Antarmuka web inspeksi bus untuk penilaian kelayakan kendaraan, mendigitalkan formulir inspeksi.",
    highlights: ["Formulir inspeksi digital", "Penilaian kelayakan kendaraan", "Responsif untuk dipakai di lapangan"],
    url: dummyUrl("rampcheck"), // TODO: link asli
    repo: dummyRepo("rampcheck"), // TODO: link repo asli
  },
  {
    id: "bimbim",
    category: "software",
    title: "Bimbim",
    type: "Digital Cashier & Financial Reporting",
    role: "Full-Stack Developer · Individu", // TODO: sesuaikan
    tools: ["Web App"], // TODO: ganti dengan tools asli
    desc: "Aplikasi kasir digital dengan manajemen transaksi dan laporan keuangan.",
    highlights: ["Pencatatan transaksi", "Laporan keuangan"],
    url: dummyUrl("bimbim"), // TODO: link asli
    repo: dummyRepo("bimbim"), // TODO: link repo asli
  },
  {
    id: "kerthi-bali-santhi",
    category: "software",
    title: "Kerthi Bali Santhi",
    type: "Digital Dashboard",
    role: "Full-Stack Developer · Tim", // TODO: sesuaikan
    tools: ["Laravel", "Tailwind CSS", "Chart.js"],
    desc: "Dashboard perusahaan daerah Bali dengan visualisasi data operasional interaktif.",
    highlights: ["Grafik data operasional", "Ringkasan data dalam satu layar"],
    url: dummyUrl("kerthi-bali-santhi"), // TODO: link asli
    repo: dummyRepo("kerthi-bali-santhi"), // TODO: link repo asli
  },
  {
    id: "jaring-company-profile",
    category: "software",
    title: "Jaring Company Profile",
    type: "Corporate Website",
    role: "Front-End Developer · Tim", // TODO: sesuaikan
    tools: ["Next.js", "Tailwind CSS"], // TODO: sesuaikan
    desc: "Website perusahaan responsif berisi profil, produk, dan layanan.",
    highlights: ["Layout responsif", "Halaman profil, produk, dan layanan"],
    url: dummyUrl("jaring-company-profile"), // TODO: link asli
    repo: dummyRepo("jaring-company-profile"), // TODO: link repo asli
  },

  // TODO: ganti semua placeholder UI/UX di bawah dengan proyek Anda
  // url dummy: ganti dengan link prototype Figma, Behance, atau Dribbble
  { id: "uiux-1", category: "uiux", title: "Proyek UI/UX 1", type: "Mobile App Design", role: "UI/UX Designer", tools: ["Figma"], desc: "Deskripsi singkat proyek.", highlights: ["Riset pengguna", "Wireframe dan prototype"], url: dummyUrl("uiux-1") },
  { id: "uiux-2", category: "uiux", title: "Proyek UI/UX 2", type: "Web App Design", role: "UI/UX Designer", tools: ["Figma"], desc: "Deskripsi singkat proyek.", highlights: ["Design system", "Prototype interaktif"], url: dummyUrl("uiux-2") },
  { id: "uiux-3", category: "uiux", title: "Proyek UI/UX 3", type: "Dashboard Design", role: "UI/UX Designer", tools: ["Figma"], desc: "Deskripsi singkat proyek.", highlights: ["Visualisasi data"], url: dummyUrl("uiux-3") },
  { id: "uiux-4", category: "uiux", title: "Proyek UI/UX 4", type: "Landing Page", role: "UI/UX Designer", tools: ["Figma"], desc: "Deskripsi singkat proyek.", highlights: ["Layout responsif"], url: dummyUrl("uiux-4") },
  { id: "uiux-5", category: "uiux", title: "Proyek UI/UX 5", type: "E-Commerce App", role: "UI/UX Designer", tools: ["Figma"], desc: "Deskripsi singkat proyek.", highlights: ["Alur checkout"], url: dummyUrl("uiux-5") },
  { id: "uiux-6", category: "uiux", title: "Proyek UI/UX 6", type: "Branding & Logo", role: "UI/UX Designer", tools: ["Figma"], desc: "Deskripsi singkat proyek.", highlights: ["Identitas visual"], url: dummyUrl("uiux-6") },

  // TODO: ganti semua placeholder foto di bawah dengan proyek fotografi Anda
  // url dummy: ganti dengan link Google Drive, Instagram, atau album online
  { id: "foto-1", category: "photo", title: "Proyek Foto 1", type: "Portrait", role: "Photographer", tools: ["Kamera", "Lightroom"], desc: "Deskripsi singkat sesi foto.", highlights: ["Lokasi dan tahun"], url: dummyUrl("foto-1") },
  { id: "foto-2", category: "photo", title: "Proyek Foto 2", type: "Event", role: "Photographer", tools: ["Kamera", "Lightroom"], desc: "Deskripsi singkat sesi foto.", highlights: ["Lokasi dan tahun"], url: dummyUrl("foto-2") },
  { id: "foto-3", category: "photo", title: "Proyek Foto 3", type: "Product", role: "Photographer", tools: ["Kamera", "Lightroom"], desc: "Deskripsi singkat sesi foto.", highlights: ["Lokasi dan tahun"], url: dummyUrl("foto-3") },
  { id: "foto-4", category: "photo", title: "Proyek Foto 4", type: "Landscape", role: "Photographer", tools: ["Kamera", "Lightroom"], desc: "Deskripsi singkat sesi foto.", highlights: ["Lokasi dan tahun"], url: dummyUrl("foto-4") },
  { id: "foto-5", category: "photo", title: "Proyek Foto 5", type: "Street", role: "Photographer", tools: ["Kamera", "Lightroom"], desc: "Deskripsi singkat sesi foto.", highlights: ["Lokasi dan tahun"], url: dummyUrl("foto-5") },
  { id: "foto-6", category: "photo", title: "Proyek Foto 6", type: "Wisuda", role: "Photographer", tools: ["Kamera", "Lightroom"], desc: "Deskripsi singkat sesi foto.", highlights: ["Lokasi dan tahun"], url: dummyUrl("foto-6") },
];

/* ───────────── Tabel 2: gambarProject ─────────────
 * Maksimal 10 gambar per proyek (kelebihan otomatis diabaikan).
 * Nama file bebas, tulis manual sesuai file di public/assets/projects/project{n}/
 * Folder: project1 = casepose, project2 = sloglab, project3 = rampcheck,
 *         project4 = bimbim, project5 = kerthi-bali-santhi, project6 = jaring-company-profile,
 *         project7-12 = uiux-1..6, project13-18 = foto-1..6
 */

export const gambarProject: GambarProject[] = [
  // casepose -> project1
  { idPicture: "pic-001", idProject: "casepose", order: 1, src: "/assets/projects/project1/project1-1.png" }, // TODO: sesuaikan nama file
  { idPicture: "pic-002", idProject: "casepose", order: 2, src: "/assets/projects/project1/project1-2.png" },
  { idPicture: "pic-003", idProject: "casepose", order: 3, src: "/assets/projects/project1/project1-3.png" },
  { idPicture: "pic-004", idProject: "casepose", order: 4, src: "/assets/projects/project1/project1-4.png" },
  { idPicture: "pic-005", idProject: "casepose", order: 5, src: "/assets/projects/project1/project1-5.png" },

  // sloglab -> project2
  { idPicture: "pic-006", idProject: "sloglab", order: 1, src: "/assets/projects/project2/project2-1.png" },
  { idPicture: "pic-007", idProject: "sloglab", order: 2, src: "/assets/projects/project2/project2-2.png" },
  { idPicture: "pic-008", idProject: "sloglab", order: 3, src: "/assets/projects/project2/project2-3.png" },
  { idPicture: "pic-009", idProject: "sloglab", order: 4, src: "/assets/projects/project2/project2-4.png" },
  { idPicture: "pic-010", idProject: "sloglab", order: 5, src: "/assets/projects/project2/project2-5.png" },

  // rampcheck -> project3
  { idPicture: "pic-011", idProject: "rampcheck", order: 1, src: "/assets/projects/project3/project3-1.png" },
  { idPicture: "pic-012", idProject: "rampcheck", order: 2, src: "/assets/projects/project3/project3-2.png" },
  { idPicture: "pic-013", idProject: "rampcheck", order: 3, src: "/assets/projects/project3/project3-3.png" },
  { idPicture: "pic-014", idProject: "rampcheck", order: 4, src: "/assets/projects/project3/project3-4.png" },
  { idPicture: "pic-015", idProject: "rampcheck", order: 5, src: "/assets/projects/project3/project3-5.png" },

  // bimbim -> project4
  { idPicture: "pic-016", idProject: "bimbim", order: 1, src: "/assets/projects/project4/project4-1.png" },
  { idPicture: "pic-017", idProject: "bimbim", order: 2, src: "/assets/projects/project4/project4-2.png" },
  { idPicture: "pic-018", idProject: "bimbim", order: 3, src: "/assets/projects/project4/project4-3.png" },
  { idPicture: "pic-019", idProject: "bimbim", order: 4, src: "/assets/projects/project4/project4-4.png" },
  { idPicture: "pic-020", idProject: "bimbim", order: 5, src: "/assets/projects/project4/project4-5.png" },
  
  // kerthi-bali-santhi -> project5
  { idPicture: "pic-021", idProject: "kerthi-bali-santhi", order: 1, src: "/assets/projects/project5/project5-1.png" },
  { idPicture: "pic-022", idProject: "kerthi-bali-santhi", order: 2, src: "/assets/projects/project5/project5-2.png" },
  { idPicture: "pic-023", idProject: "kerthi-bali-santhi", order: 3, src: "/assets/projects/project5/project5-3.png" },

  // jaring-company-profile -> project6
  { idPicture: "pic-024", idProject: "jaring-company-profile", order: 1, src: "/assets/projects/project6/project6-1.png" },
  { idPicture: "pic-025", idProject: "jaring-company-profile", order: 2, src: "/assets/projects/project6/project6-2.png" },
  { idPicture: "pic-026", idProject: "jaring-company-profile", order: 3, src: "/assets/projects/project6/project6-3.png" },
  { idPicture: "pic-027", idProject: "jaring-company-profile", order: 4, src: "/assets/projects/project6/project6-4.png" },
  { idPicture: "pic-028", idProject: "jaring-company-profile", order: 5, src: "/assets/projects/project6/project6-5.png" },
];

/* ───────────── Tabel 3: bestProject ───────────── */

// Maks 6 per bidang (BEST_PROJECT_LIMIT). Urutan tampil di tiap tab mengikuti `order`.
export const bestProject: BestProjectRow[] = [
  { order: 1, idProject: "casepose" },
  { order: 2, idProject: "sloglab" },
  { order: 3, idProject: "rampcheck" },
  { order: 4, idProject: "bimbim" },
  { order: 5, idProject: "kerthi-bali-santhi" },
  { order: 6, idProject: "jaring-company-profile" },

  { order: 7, idProject: "uiux-1" },
  { order: 8, idProject: "uiux-2" },
  { order: 9, idProject: "uiux-3" },
  { order: 10, idProject: "uiux-4" },
  { order: 11, idProject: "uiux-5" },
  { order: 12, idProject: "uiux-6" },

  { order: 13, idProject: "foto-1" },
  { order: 14, idProject: "foto-2" },
  { order: 15, idProject: "foto-3" },
  { order: 16, idProject: "foto-4" },
  { order: 17, idProject: "foto-5" },
  { order: 18, idProject: "foto-6" },
];

/* ───────────── Query helper (dipakai route.ts & halaman proyek) ───────────── */

/** Gambar satu proyek, terurut, maksimal 10. */
export function getProjectPictures(idProject: string): GambarProject[] {
  return gambarProject
    .filter((g) => g.idProject === idProject)
    .sort((a, b) => a.order - b.order)
    .slice(0, MAX_PICTURES_PER_PROJECT);
}

/* ───────────── Tab proyek (halaman /projects), diturunkan dari tabel di atas ───────────── */

export type ProjectItem = Project & { images: string[] };

export type ProjectTab = {
  id: ProjectCategory;
  label: string;
  short: string;
  typeLabel: string;
  toolsLabel: string;
  /** Teks tombol di modal. Default: "Kunjungi website" */
  linkLabel?: string;
  projects: ProjectItem[];
};

const tabMeta: Omit<ProjectTab, "projects">[] = [
  { id: "software", label: "Software Engineer", short: "Software", typeLabel: "Jenis aplikasi", toolsLabel: "Tools", linkLabel: "Kunjungi website" },
  { id: "uiux", label: "UI/UX Design", short: "UI/UX", typeLabel: "Jenis desain", toolsLabel: "Tools", linkLabel: "Lihat prototype" },
  { id: "photo", label: "Photographer", short: "Foto", typeLabel: "Kategori foto", toolsLabel: "Peralatan", linkLabel: "Lihat album lengkap" },
];

export const projectTabs: ProjectTab[] = tabMeta.map((t) => ({
  ...t,
  projects: projects
    .filter((p) => p.category === t.id)
    .map((p) => ({ ...p, images: getProjectPictures(p.id).map((g) => g.src) })),
}));

/**
 * Dipakai route /api/bestProjects.
 * Alur: bestProject (order + idProject) -> projects (detail) -> gambarProject (maks 10 gambar),
 * lalu dikelompokkan per bidang menjadi tab. Tab yang kosong dibuang.
 */
export function getBestProjectTabs(perTab = BEST_PROJECT_LIMIT): ProjectTab[] {
  const byId = new Map(projects.map((p) => [p.id, p]));
  const picked = [...bestProject]
    .sort((a, b) => a.order - b.order)
    .flatMap((b) => {
      const p = byId.get(b.idProject);
      return p ? [p] : []; // idProject yang tidak ada dilewati
    });

  return tabMeta
    .map((t) => ({
      ...t,
      projects: picked
        .filter((p) => p.category === t.id)
        .slice(0, perTab)
        .map((p) => ({ ...p, images: getProjectPictures(p.id).map((g) => g.src) })),
    }))
    .filter((t) => t.projects.length > 0);
}

/* ───────────── Data lain ───────────── */

/* ───────────── Pengalaman ───────────── */

export type EmploymentType = "fulltime" | "internship" | "freelance";

export const employmentLabel: Record<EmploymentType, string> = {
  fulltime: "Full-time",
  internship: "Magang",
  freelance: "Freelance",
};

export type Experience = {
  id: string;
  /** Hanya nama jabatan. Status (magang/freelance/full-time) ditulis di field `type`. */
  role: string;
  /** Hanya nama perusahaan / tim. */
  company: string;
  place: string;
  /** Opsional: kalau kosong, badge status tidak ditampilkan. */
  type?: EmploymentType;
  /** Format "YYYY-MM", contoh "2025-09". */
  start: string;
  /** Format "YYYY-MM". Kosongkan kalau masih berjalan (otomatis tampil "Sekarang"). */
  end?: string;
  /** Tools yang dipakai, ditulis eksplisit (tidak lagi ditebak dari teks poin). */
  tools?: string[];
  points: string[];
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

const parseYM = (s: string) => {
  const [y, m] = s.split("-").map(Number);
  return { y, m: m - 1 };
};

/** "2025-09","2025-12" -> "Sep – Des 2025" | "2021-12","2022-07" -> "Des 2021 – Jul 2022" | tanpa end -> "... – Sekarang" */
export function formatPeriod(start: string, end?: string) {
  const a = parseYM(start);
  if (!end) return `${MONTHS[a.m]} ${a.y} – Sekarang`;
  const b = parseYM(end);
  return a.y === b.y
    ? `${MONTHS[a.m]} – ${MONTHS[b.m]} ${b.y}`
    : `${MONTHS[a.m]} ${a.y} – ${MONTHS[b.m]} ${b.y}`;
}

const experienceList: Experience[] = [
  {
    id: "succ-team",
    role: "Front-End Developer & UI/UX Designer",
    company: "SuCC Team",
    place: "Remote",
    type: "freelance",
    start: "2026-05",
    tools: ["React.js", "Next.js", "Tailwind CSS", "Figma"],
    points: [
      "Membuat antarmuka web responsif dengan React.js, Next.js, dan Tailwind CSS sesuai kebutuhan proyek.",
      "Menerjemahkan desain UI/UX menjadi antarmuka yang konsisten dan berfungsi.",
      "Ikut mendukung pengembangan produk dari desain antarmuka sampai implementasi front-end.",
    ],
  },
  {
    id: "lensoul-pictures",
    role: "Photographer",
    company: "Lensoul Pictures",
    place: "Cirebon & Bandung",
    type: "freelance",
    start: "2025-11",
    tools: ["Lightroom", "Figma", "Canva"],
    points: [
      "Memotret klien yang memesan jasa fotografi secara profesional.",
      "Menyunting hasil foto dengan Lightroom agar tampilannya lebih baik.",
      "Mengedit materi konten Instagram di Figma dan Canva.",
      "Mengelola akun Instagram Lensoul Pictures agar lebih menarik dan profesional.",
    ],
  },
  {
    id: "jaring-solusi-aplikasi",
    role: "Front-End Developer",
    company: "PT Jaring Solusi Aplikasi",
    place: "Jakarta Pusat",
    type: "internship",
    start: "2025-09",
    end: "2025-12",
    tools: ["React.js", "Next.js", "Tailwind CSS"],
    points: [
      "Mengembangkan antarmuka untuk beberapa proyek aplikasi web dengan React.js, Next.js, dan Tailwind CSS.",
      "Membuat komponen yang bisa dipakai ulang agar tampilan konsisten dan implementasi lebih cepat.",
      "Berkolaborasi dengan desainer UI/UX dan tim pengembang.",
    ],
  },
  {
    id: "masagi-energi-hijau",
    role: "Front-End Developer & UI/UX Designer",
    company: "PT Masagi Energi Hijau",
    place: "Sukabumi",
    type: "internship",
    start: "2025-03",
    end: "2025-06",
    tools: ["Figma", "Next.js", "Tailwind CSS"],
    points: [
      "Merancang antarmuka website di Figma berdasarkan kebutuhan bisnis.",
      "Mengimplementasikan desain Figma dengan Next.js dan Tailwind CSS.",
      "Membuat layout responsif untuk desktop dan mobile.",
    ],
  },
  {
    id: "triofa-mps",
    role: "ATM Cleaning Operator",
    company: "PT Triofa MPS",
    place: "Kota Cirebon",
    type: "fulltime",
    start: "2021-12",
    end: "2022-07",
    points: [
      "Melaksanakan kegiatan pembersihan dan pemeliharaan rutin ATM sesuai dengan prosedur operasional.",
      "Menjaga kualitas pekerjaan dan mendukung kegiatan operasional sehari-hari.",
    ],
  },
  {
    id: "kejari-cirebon",
    role: "Public Service",
    company: "Kejaksaan Negeri Kota Cirebon",
    place: "Kota Cirebon",
    // type: ... // TODO: isi kalau mau menampilkan badge status (internship / fulltime / freelance)
    start: "2021-03",
    end: "2022-06",
    points: [
      "Mendukung kegiatan pelayanan publik di lingkup bagian Tindak Pidana Umum (PIDUM) dan Pelanggaran Lalu Lintas (Tilang).",
      "Membantu kegiatan operasional sehari-hari serta berkomunikasi dengan masyarakat umum.",
    ],
  },
];

/** Selalu terurut dari yang terbaru (berdasarkan tanggal mulai), jadi urutan di atas tidak wajib rapi. */
export const experiences: Experience[] = [...experienceList].sort((a, b) =>
  b.start.localeCompare(a.start)
);

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