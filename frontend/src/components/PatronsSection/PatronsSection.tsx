"use client";
import { ImageUp } from "lucide-react";
import styles from "./PatronsSection.module.css";

interface PatronLogo {
  type: "logo";
  name: string;
  desc: string;
  link: string;
  logo: string; // e.g. "/patrons/acme.webp" — leave "" for upload placeholder
}

interface PatronPerson {
  type: "person";
  name: string;
  role: string;
  photo: string; // e.g. "/team/sharon.webp"
  imgPosition?: string;
  link?: string;
}

type Patron = PatronLogo | PatronPerson;

// ── Section 1: Patrons (5 containers, no tier heading) ───────────
const PATRONS: Patron[] = [
  {
    type: "person",
    name: "Dr. A. J. Shetty",
    role: "President",
    photo: "/patrons/president.webp",
  },
  {
    type: "person",
    name: "Mr. Prashanth Shetty",
    role: "Vice President",
    photo: "/patrons/vicepresident.webp",
  },
  {
    type: "person",
    name: "Dr. T. Jayaprakash Rao",
    role: "Campus Director",
    photo: "/patrons/campusdirector.webp",
  },
  {
    type: "person",
    name: "Dr. Ashok Kumar T",
    role: "Principal",
    photo: "/patrons/principal.webp",
  },
  {
    type: "person",
    name: "Dr. P. Mahabaleswarappa",
    role: "Dean Academics",
    photo: "/patrons/dean.webp",
  },
  {
    type: "person",
    name: "Dr. Antony P. J",
    role: "Vice Principal & Convenor",
    photo: "/patrons/viceprincipal.webp",
  },
];

// ── Section 2: Deans (6 containers) ──────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const DEANS: Patron[] = [
  {
    type: "person",
    name: "Dean Name",
    role: "Dean",
    photo: "",
  },
  {
    type: "person",
    name: "Dean Name",
    role: "Dean",
    photo: "",
  },
  {
    type: "person",
    name: "Dean Name",
    role: "Dean",
    photo: "",
  },
  {
    type: "person",
    name: "Dean Name",
    role: "Dean",
    photo: "",
  },
  {
    type: "person",
    name: "Dean Name",
    role: "Dean",
    photo: "",
  },
  {
    type: "person",
    name: "Dean Name",
    role: "Dean",
    photo: "",
  },
];

// ── Section 3: Faculty Coordinators (4 containers) ───────────────
const FACULTY_COORDINATORS: PatronPerson[] = [
  {
    type: "person",
    name: "Mrs. Sharon C Dsouza",
    role: "Faculty Coordinator",
    photo: "/patrons/sharon.webp",
  },
  {
    type: "person",
    name: "Mrs. Snitha Shetty",
    role: "Faculty Coordinator",
    photo: "/patrons/snithashetty.webp",
  },
  {
    type: "person",
    name: "Mr. Sathyendra Bhat J",
    role: "Faculty Coordinator",
    photo: "/patrons/Sathyendra Bhat J.webp",
    imgPosition: "center 0%",
  },
  {
    type: "person",
    name: "Mr. Manjukiran B",
    role: "Faculty Coordinator",
    photo: "/patrons/manjukiran.webp",
  },
];

// ── Logo card ───────────────────────────────────────────────
function LogoCard({ patron }: { patron: PatronLogo }) {
  return (
    <a
      href={patron.link}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.card}
      aria-label={`${patron.name} - Visit Website`}
    >
      <div className={styles.logoWrap}>
        {patron.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={patron.logo}
            alt={`${patron.name} logo`}
            className={styles.logoImg}
            width={250}
            height={100}
            style={{ objectFit: "contain" }}
          />
        ) : (
          <div className={styles.logoPlaceholder}>
            <ImageUp size={22} />
            <span>Upload logo</span>
          </div>
        )}
      </div>
      <span className={styles.pName}>{patron.name}</span>
      <p className={styles.pDesc}>{patron.desc}</p>
    </a>
  );
}

// ── Person card (photo + name + role) ──────────────────────
function PersonCard({ patron }: { patron: PatronPerson }) {
  const cardContent = (
    <>
      <div className={styles.photoWrap}>
        {patron.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={patron.photo}
            alt={patron.name}
            className={styles.photo}
            style={{ objectPosition: patron.imgPosition ?? "center top" }}
          />
        ) : (
          <div className={styles.photoPlaceholder}>
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span>Upload Photo</span>
          </div>
        )}
      </div>
      <span className={styles.pName}>{patron.name}</span>
      <span className={styles.pRole}>{patron.role}</span>
    </>
  );

  if (patron.link) {
    return (
      <a
        href={patron.link}
        target="_blank"
        rel="noopener noreferrer"
        className={`${styles.card} ${styles.personCard}`}
        aria-label={patron.name}
      >
        {cardContent}
      </a>
    );
  }

  return (
    <div
      className={`${styles.card} ${styles.personCard}`}
      aria-label={patron.name}
    >
      {cardContent}
    </div>
  );
}

export default function PatronsSection() {
  return (
    <section id="patrons" className={styles.section}>
      <div className="section">
        <div className={styles.header}>
          <div className="section-label">{"//"} community supporters</div>
          <h2 className="section-title">
            OUR <span className="text-lime">PATRONS</span>
          </h2>
          <p className="section-sub">
            Our patrons are individuals and organizations who believe in the
            mission of Singularity and contribute to making this hackathon a
            reality. Their generosity and commitment to nurturing the next
            generation of innovators inspires us every step of the way.
          </p>
        </div>

        {/* Section 1: 5 containers (No heading) */}
        <div className={styles.tier}>
          <div className={`${styles.tierGrid} ${styles.gridPatrons}`}>
            {PATRONS.map((p, i) =>
              p.type === "person" ? (
                <PersonCard key={`patron-${i}`} patron={p} />
              ) : (
                <LogoCard key={`patron-${i}`} patron={p} />
              )
            )}
          </div>
        </div>

        {/* Section 3: Faculty Coordinators (Heading + 4 containers) */}
        <div className={styles.tier}>
          <div className={styles.tierLabel}>Faculty Coordinators</div>
          <div className={`${styles.tierGrid} ${styles.gridFaculty}`}>
            {FACULTY_COORDINATORS.map((p, i) =>
              <PersonCard key={`faculty-${i}`} patron={p} />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
