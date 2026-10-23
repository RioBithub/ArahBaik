import React, { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation, Navigate } from "react-router-dom";
import { useAuth, supabase, useToast, mediaUrl, api } from "./lib";
import type { Organization } from "../shared/schema";
export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const shapes: Record<string, ReactNode> = {
    arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
    northeast: <path d="M6 18 18 6M6 6h12v12" />,
    check: <path d="m5 12 4 4L19 6" />,
    heart: (
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0l-1 1-1-1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />
    ),
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 5 5" />
      </>
    ),
    location: (
      <>
        <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3 3 6v6c0 5 9 10 9 10s9-5 9-10V6Z" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    plus: <path d="M12 4v16M4 12h16" />,
    download: (
      <>
        <path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="4" />
        <path d="M1 22v-3a8 8 0 0 1 16 0v3M17 4a4 4 0 0 1 0 8m2 3a7 7 0 0 1 4 7" />
      </>
    ),
    spark: (
      <path d="m12 2 2.8 7.2L22 12l-7.2 2.8L12 22l-2.8-7.2L2 12l7.2-2.8Z" />
    ),
    chart: <path d="M4 3v18h17M9 16v-4m5 4V7m5 9V4" />,
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {shapes[name] ?? shapes.spark}
    </svg>
  );
}
export function Logo() {
  return (
    <Link to="/" className="logo" aria-label="ArahBaik — Beranda">
      <img src="/assets/brand.svg" alt="" />
      Arah<span>Baik</span>
    </Link>
  );
}
export function Layout({ children }: { children: ReactNode }) {
  const { user, admin, unavailable } = useAuth();
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  useEffect(() => {
    setOpen(false);
    window.scrollTo({ top: 0 });
    document.title = "ArahBaik — by Tim Axura";
  }, [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        menuButton.current?.focus();
      }
    };
    const outside = (e: Event) => {
      if (e.target instanceof Element && !e.target.closest(".site-header"))
        setOpen(false);
    };
    window.addEventListener("keydown", key);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", outside);
    return () => {
      window.removeEventListener("keydown", key);
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", outside);
    };
  }, [open]);
  return (
    <>
      <a className="skip" href="#main">
        Lewati ke konten
      </a>
      <div className="topline">
        <span>
          <i /> Kecil langkahnya. Besar maknanya.
        </span>
        <span>
          Inisiatif oleh <b>AXURA TEAM</b> <Icon name="northeast" size={12} />
        </span>
      </div>
      <header className="site-header">
        <div className="container nav">
          <Logo />
          <button
            ref={menuButton}
            className="mobile-toggle icon-btn"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Tutup navigasi" : "Buka navigasi"}
            aria-expanded={open}
            aria-controls="navigation"
          >
            <Icon name={open ? "close" : "menu"} />
          </button>
          <nav id="navigation" className={open ? "open" : ""}>
            <NavLink to="/jelajahi">Jelajahi</NavLink>
            <NavLink to="/panduan">Cara kerja</NavLink>
            <NavLink to="/transparansi">Transparansi</NavLink>
            <NavLink to="/tentang">Tentang</NavLink>
            <div className="mobile-actions">
              <Link to={user ? "/dashboard" : "/akun"}>
                {user ? "Dashboard" : "Masuk"}
              </Link>
              <Link className="btn small" to="/dashboard">
                Daftarkan tempat <Icon name="northeast" size={16} />
              </Link>
            </div>
          </nav>
          <div className="nav-actions">
            <Link className="text-link" to={user ? "/dashboard" : "/akun"}>
              {user ? "Dashboard" : "Masuk"}
            </Link>
            <Link className="btn small" to="/dashboard">
              Daftarkan tempat <Icon name="northeast" size={16} />
            </Link>
          </div>
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      {unavailable && (
        <div className="container">
          <div className="service-note">
            <Icon name="spark" />
            <span>
              Layanan data sedang disiapkan atau belum tersedia. Halaman
              informasi tetap bisa dibaca; direktori dan akun akan tersedia
              setelah koneksi aktif.
            </span>
          </div>
        </div>
      )}
      <section className="join-strip">
        <div className="container">
          <div>
            <span className="eyebrow light">SATU LANGKAH LAGI</span>
            <h2>
              Kebaikan selalu punya <em>jalan.</em>
            </h2>
            <p>Bantu tempat yang dekat dengan hatimu, mulai hari ini.</p>
          </div>
          <Link className="btn lime" to="/jelajahi">
            Temukan tujuan baikmu <Icon name="northeast" />
          </Link>
        </div>
      </section>
      <footer className="container">
        <div className="footer-grid">
          <div>
            <Logo />
            <p>
              Mempertemukan niat baik dengan tempat yang membutuhkan. Donasi
              langsung ke penerima.
            </p>
            <div className="team-credit">
              <img src="/assets/axura-team.webp" alt="Logo Axura Team" />
              <span>
                Dibangun bersama
                <br />
                <b>Tim Axura & Seismiks</b>
              </span>
            </div>
          </div>
          <div>
            <b>Jelajahi kebaikan</b>
            <Link to="/jelajahi?category=Masjid">Masjid & musala</Link>
            <Link to="/jelajahi?category=Panti">Panti & rumah asuh</Link>
            <Link to="/jelajahi?category=Komunitas">Komunitas sosial</Link>
          </div>
          <div>
            <b>Kenali ArahBaik</b>
            <Link to="/panduan">Panduan & pertanyaan</Link>
            <Link to="/transparansi">Laporan operasional</Link>
            <Link to="/tentang">Cerita & tim kami</Link>
            <Link to="/privasi">Privasi & ketentuan</Link>
          </div>
          <div>
            <b>Ikut berkontribusi</b>
            <Link to="/dashboard">Daftarkan tempat</Link>
            <Link to="/tersimpan">Tempat tersimpan</Link>
            <Link to={user ? "/dashboard" : "/akun"}>
              {user ? "Kelola akun" : "Masuk / daftar"}
            </Link>
            {admin && <Link to="/admin">Ruang admin</Link>}
          </div>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} ArahBaik. Setiap kebaikan berarti.
          </span>
          <span>
            Made with care, by <b>AXURA TEAM</b>{" "}
            <span className="lime-text">↗</span>
          </span>
        </div>
      </footer>
    </>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <span className="spinner" />
      Menyiapkan arah kebaikan…
    </div>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon name="spark" size={32} />
      </div>
      <h3>{title}</h3>
      <div className="muted">{children}</div>
    </div>
  );
}
export function ErrorBox({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <div className="error-box" role="alert">
      <b>Belum berhasil memuat data.</b>
      <p>{message}</p>
      {retry && (
        <button className="btn outline small" onClick={retry}>
          Coba lagi
        </button>
      )}
    </div>
  );
}
export function PageHead({
  label,
  title,
  accent,
  children,
}: {
  label: string;
  title: string;
  accent?: string;
  children?: ReactNode;
}) {
  return (
    <section className="page-head container">
      <span className="eyebrow">{label}</span>
      <h1>
        {title} {accent && <em>{accent}</em>}
      </h1>
      {children && <p>{children}</p>}
    </section>
  );
}
export function Protect({
  children,
  adminOnly = false,
}: {
  children: ReactNode;
  adminOnly?: boolean;
}) {
  const auth = useAuth();
  const location = useLocation();
  if (auth.loading) return <Loading />;
  if (!auth.user)
    return (
      <Navigate
        to={`/akun?next=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  if (adminOnly && !auth.admin)
    return (
      <div className="container section">
        <Empty title="Ruang khusus admin">
          <p>Akunmu belum memiliki akses admin.</p>
          <Link className="btn" to="/dashboard">
            Ke dashboard
          </Link>
        </Empty>
      </div>
    );
  return <>{children}</>;
}
export function Card({ item }: { item: Organization }) {
  return (
    <article className="place-card">
      <Link to={`/tempat/${item.id}`} className="card-image">
        <img
          src={
            item.photo_path
              ? mediaUrl(item.photo_path)
              : "/assets/community.webp"
          }
          alt={item.name}
          loading="lazy"
        />
        <span className="pill white">{item.category}</span>
        <span className="image-arrow">
          <Icon name="northeast" />
        </span>
      </Link>
      <div className="card-body">
        <span className="verified">
          <Icon name="shield" size={15} /> Identitas & QRIS diperiksa
        </span>
        <h3>
          <Link to={`/tempat/${item.id}`}>{item.name}</Link>
        </h3>
        <p className="location">
          <Icon name="location" size={15} />
          {item.city}
        </p>
        <p>{item.summary}</p>
        <div className="tags">
          {item.needs.slice(0, 2).map((n) => (
            <span key={n}>{n}</span>
          ))}
        </div>
        <Link className="card-cta" to={`/tempat/${item.id}`}>
          Lihat & bantu langsung <Icon name="arrow" size={18} />
        </Link>
      </div>
    </article>
  );
}
export function SignOut() {
  const toast = useToast();
  return (
    <button
      className="btn outline small"
      onClick={async () => {
        try {
          const { error } = await (await supabase()).auth.signOut();
          if (error) throw error;
        } catch (e) {
          toast((e as Error).message);
        }
      }}
    >
      Keluar
    </button>
  );
}
