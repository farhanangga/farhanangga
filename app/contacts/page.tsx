import { Suspense } from "react";
import type { Metadata } from "next";
import type { ContactData } from "@/lib/data";
import { GET as getContactRoute } from "@/app/api/contacts/route";
import { ContactClient } from "@/components/contacts/clientContacts";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export const metadata: Metadata = {
  title: "Kontak",
  description: "Hubungi Farhan Angga Riyanto untuk proyek, kolaborasi, atau sekadar menyapa.",
};

type ContactLink = ContactData["links"][number];

/** Bentuk baris yang dikembalikan GET /api/contacts (kolom `description` sudah dipetakan jadi `desc`). */
type ContactRow = {
  id: string;
  platform: string;
  icon: string;
  handle: string;
  href: string;
  desc: string;
  position: number;
};

/**
 * Data statis kartu email (TIDAK diambil dari database).
 * Foto profil tidak ada di sini: dipanggil manual di components/contacts/clientContacts.tsx
 * lewat "/assets/profil-pic.jpg" (file: public/assets/profil-pic.jpg).
 */
const STATIC_PROFILE = {
  email: "farhanangga8900@gmail.com", // TODO: isi email asli
  location: "Kota Cirebon", // TODO: isi lokasi
};

/**
 * Link sosial: dari handler GET di app/api/contacts/route.ts.
 * Route mengembalikan { data: ContactRow[] } (sudah terurut berdasarkan position).
 * null = gagal memuat (beda dengan links kosong = memang belum ada kontak).
 */
async function fetchContact(): Promise<ContactData | null> {
  try {
    const res = await getContactRoute();
    if (!res.ok) {
      console.error(`[Contact] route gagal: ${res.status}`);
      return null;
    }
    const json = (await res.json()) as { data?: ContactRow[] };
    if (!Array.isArray(json.data)) return null;

    const links: ContactLink[] = json.data.map(({ platform, icon, handle, href, desc }) => ({
      platform,
      icon,
      handle,
      href,
      desc,
    })) as ContactLink[];

    // email dan lokasi statis digabung di sini, jadi selalu terisi
    return { ...STATIC_PROFILE, links } as ContactData;
  } catch (err) {
    console.error("[Contact] gagal memuat data", err);
    return null;
  }
}

/** Komponen yang mengakses data (harus berada di dalam <Suspense>) */
async function ContactContent() {
  const data = await fetchContact();

  if (!data) {
    return (
      <section className="mx-auto max-w-[1200px] px-5 pb-24 pt-32 sm:px-10 sm:pt-40">
        <div className="rounded-xl bg-[#14142B] px-6 py-14 text-center text-white/60">
          Data kontak belum bisa dimuat. Muat ulang halaman beberapa saat lagi.
        </div>
      </section>
    );
  }

  return <ContactClient data={data} />;
}

/** Placeholder supaya layout tidak melompat saat data datang */
function ContactSkeleton() {
  return (
    <section className="mx-auto max-w-[1200px] px-5 pb-20 pt-28 sm:px-10 sm:pb-28 sm:pt-40">
      <div className="h-4 w-40 animate-pulse rounded bg-white/10" />
      <div className="mt-4 h-12 w-72 max-w-full animate-pulse rounded-lg bg-white/10 sm:h-16" />
      <div className="mt-4 h-5 w-full max-w-md animate-pulse rounded bg-white/[0.06]" />
      <div className="mt-10 h-36 w-full animate-pulse rounded-xl bg-white/[0.04]" />
      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.1fr]">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-[210px] animate-pulse rounded-xl bg-[#14142B]" />
          ))}
        </div>
        <div className="h-[420px] animate-pulse rounded-xl bg-[#14142B]" />
      </div>
    </section>
  );
}

export default function ContactPage() {
  return (
    <>
      <Navbar />
      <main>
        <Suspense fallback={<ContactSkeleton />}>
          <ContactContent />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}