"use client";
import { useState, useRef, useEffect, useMemo } from "react";
import styles from "./CoordinatorsSection.module.css";

// Inline SVG social icons
const GithubIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
  </svg>
);

const InstagramIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
  </svg>
);

const LinkedinIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

const ChevronIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

// Phone / call icon for the contact button
const PhoneIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
  </svg>
);

interface Coordinator {
  name: string;
  role: string;
  seed: string;
  photo: string;
  color: string;
  github?: string;
  instagram?: string;
  linkedin?: string;
  phone?: string;
  imgScale?: number;
  imgPosition?: string;
}

// Returns a smaller font size for longer names so they stay on one line
// instead of wrapping. Short names keep the default large clamp() size
// defined in the CSS (.name), so this only returns a value when the name
// is long enough to need shrinking.
const getNameFontSize = (name: string): string | undefined => {
  const len = name.length;
  if (len > 20) return "clamp(1.8rem, 3.2vw, 3rem)";
  if (len > 16) return "clamp(2.2rem, 3.8vw, 3.6rem)";
  if (len > 12) return "clamp(2.6rem, 4.3vw, 4.2rem)";
  return undefined;
};

// On mobile, names longer than this still wrap even after getNameFontSize
// shrinks them (e.g. "Mr. Sathyendra Bhat J", "Mrs. Sharon C Dsouza").
// These get an extra-compact size via .nameCompact so they stay on one
// line and the card doesn't grow taller and push the socials into the dots.
const isCompactName = (name: string): boolean => name.length > 18;

// Faculty coordinators only carry a LinkedIn link (no GitHub / Instagram
// for this group). Snitha has no LinkedIn account at all, so she is left
// with no social fields — her socials row will simply render empty.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const FACULTY_COORDINATORS: Coordinator[] = [
  { name: "Mrs. Sharon C Dsouza", role: "Faculty Coordinator", seed: "sharon", photo: "/team/sharon.webp", color: "#ff8ed4", linkedin: "https://www.linkedin.com/in/sharon-dsouza-b89ab9233/" },
  { name: "Mrs. Snitha Shetty", role: "Faculty Coordinator", seed: "Snitha", photo: "/team/snithashetty.webp", color: "#4ecdc4" },
  { name: "Mr. Sathyendra Bhat J", imgPosition: "center 0%", role: "Faculty Coordinator", seed: "Sathyendra", photo: "/team/Sathyendra Bhat J.webp", color: "#ffb830", linkedin: "https://www.linkedin.com/in/sathyendra-bhat/" },
  { name: "Mr. Manjukiran B", role: "Faculty Coordinator", seed: "Manjukiran", photo: "/team/manjukiran.webp", color: "#ff6b6b", linkedin: "https://www.linkedin.com/in/manju-kiran-24756470/" },
];

// Updated to match the official roster sheet. Finance and Master of
// Ceremonies intentionally excluded per earlier request. Phone numbers
// are kept ONLY on Lead Organizers, since the phone button is restricted
// to that role — everyone else has no phone field at all.
const TEAM_COORDINATORS: Coordinator[] = [
  // Lead Organizers — the only role with a phone number / phone button
  { name: "Durgesh A P", imgPosition: "center 15%", role: "Lead Organizer", seed: "Durgesh", photo: "/team/DurgeshAP.webp", color: "#c8f135", github: "https://github.com/Durgesh3805", instagram: "https://www.instagram.com/_duxgexh_", linkedin: "https://www.linkedin.com/in/durgeshap/", phone: "+919353250245" },
  { name: "Suyash Devadiga", imgPosition: "center 15%", role: "Lead Organizer", seed: "Suyash", photo: "/team/Suyash.webp", color: "#e63946", github: "https://github.com/SuyashD22", instagram: "https://www.instagram.com/suyashdevadiga_", linkedin: "https://www.linkedin.com/in/suyashdevadiga/", phone: "+917899288198" },
  { name: "Neekshith", role: "Lead Organizer", seed: "Neekshith", photo: "/team/Neekshith .webp", color: "#4ecdc4", github: "https://github.com/Neekshith8296", linkedin: "https://www.linkedin.com/in/neekshith-s/", phone: "+918296303393" },
  { name: "Arjun R", role: "Lead Organizer", seed: "Arjun", photo: "/team/Arjun_R.webp", color: "#ffe66d", github: "https://github.com/Arjun-333", instagram: "https://www.instagram.com/arjun._.raj._?igsh=YzB0aTc5amxsZWc3", linkedin: "https://www.linkedin.com/in/arjun-r-44a336294", phone: "+919019934133" },

  // Tech Lead
  { name: "Keerthana", imgPosition: "center 45%", role: "Tech Lead", seed: "Keerthana", photo: "/team/Keerthana_K.webp", color: "#ff8ed4", github: "https://github.com/Keerthana430", instagram: "https://www.instagram.com/keerthana___kulal", linkedin: "https://www.linkedin.com/in/keerthana-kulal-32045a295/" },
  { name: "Sunpreeth Vishva", role: "Tech Lead", seed: "Sunpreeth", photo: "/team/sunp.webp", color: "#ffb830", github: "https://github.com/anysdefdefe", instagram: "https://instagram.com/_.sunp._/", linkedin: "https://linkedin.com/in/sunpreeth-vishva/" },
  { name: "Kishan C Bhandary", role: "Tech Lead", seed: "Kishan", photo: "/team/kishan.webp", color: "#00b4d8", github: "https://github.com/kishanBhandary", instagram: "https://www.instagram.com/__kixhan__/", linkedin: "https://www.linkedin.com/in/kishanbhandary/" },
  { name: "Praneeth C K", role: "Tech Lead", seed: "Praneek", photo: "/team/Praneek.webp", color: "#845ec2", github: "https://github.com/praneeth-ck", instagram: "https://www.instagram.com/praneethck_official?igsh=MWdtaWk0aGRva3owMw==", linkedin: "https://www.linkedin.com/in/praneeth-c-k" },

  // Media & Publicity Lead
  { name: "R Krithi Mallika", imgPosition: "center 15%", role: "Press & Media Lead", seed: "KrithiRaj", photo: "/team/R_krithimallika.webp", color: "#c8f135", github: "https://github.com/Kri252005", instagram: "https://www.instagram.com/kri3_raj?igsh=MTEzZGt1MnM5Z3Q0ZQ==&igsi=MTEzZGt1MnM5Z3Q0ZQ==", linkedin: "https://www.linkedin.com/in/r-krithi-mallika-90294a299?utm_source=share_via&utm_content=profile&utm_medium=member_android" },
  { name: "Chirag", role: "Press & Media Lead", seed: "Chirag", photo: "/team/chirag.webp", color: "#ff6b6b", github: "https://github.com/chiragushetty", instagram: "https://www.instagram.com/chirag_shetty19", linkedin: "https://www.linkedin.com/in/chirag-shetty-6110b5309" },
  { name: "Rohit G Shet", role: "Press & Media Lead", seed: "Rohit", photo: "/team/Rohit G Shet 4JK24CI090.webp", color: "#4ecdc4", github: "https://github.com/rohitgshet", instagram: "https://instagram.com/rohitgshet", linkedin: "https://linkedin.com/in/rohitgshet" },
  { name: "Arjith Kumar", role: "Press & Media Lead", seed: "Arjith", photo: "/team/Arjith Kumar.webp", color: "#ff8ed4", github: "https://github.com/arjithkumar021", instagram: "https://www.instagram.com/arjith01.__", linkedin: "https://www.linkedin.com/in/arjith-kumar01" },

  // Logistics & Accommodation Lead
  { name: "Ashray K", role: "Logistics & Accommodation Lead", seed: "Ashray", photo: "/team/Ashray_K.webp", color: "#845ec2", github: "https://github.com/Ashray156", instagram: "https://www.instagram.com/ashra__y", linkedin: "https://www.linkedin.com/in/ashray-k-950a332a1?utm_source=share_via&utm_content=profile&utm_medium=member_android" },
  { name: "Krithi", role: "Logistics & Accommodation Lead", seed: "Krithi", photo: "/team/Krithi.webp", color: "#ffb830", github: "https://github.com/Krithi-162", instagram: "https://www.instagram.com/kithu_kulal17", linkedin: "https://github.com/Krithi-162" },

  // Food & Refreshments Lead
  { name: "Vaishnav", role: "Food & Refreshments Lead", seed: "Vaishnav", photo: "/team/Vaishnav.webp", color: "#ff2d6f", github: "https://github.com/vaish73", instagram: "https://www.instagram.com/vaiszzzzz/", linkedin: "https://www.linkedin.com/in/vaishnav-c00/" },
  { name: "Prathvish S Shetty", role: "Food & Refreshments Lead", seed: "Prathvish", photo: "/team/Prathvish_S_Shetty.webp", color: "#c8f135", github: "https://github.com/prathuu-23-08", instagram: "https://www.instagram.com/prathvish.shetty", linkedin: "https://www.linkedin.com/in/prathvish-shetty" },

  // Stage & Venue Lead
  { name: "Srijan R", imgPosition: "center 15%", role: "Stage & Venue Lead", seed: "SrijanR", photo: "/team/srijan.webp", color: "#ff6b6b", github: "https://github.com/srijanpoojary991-bit", instagram: "https://www.instagram.com/srijan.chilimbi?igsh=MWxzeHpuZHExaDY5eg%3D%3D&utm_source=qr", linkedin: "https://www.linkedin.com/in/srijan-rajendra-5a36a632b" },
  { name: "Nidhi D", role: "Stage & Venue Lead", seed: "NidhiD", photo: "/team/Nidhi.webp", color: "#4ecdc4", github: "https://github.com/NidhiD26", instagram: "https://www.instagram.com/d_nidhi26?igsh=MWllNHBxcmRyeWVwYQ==", linkedin: "https://www.linkedin.com/in/nidhidinesh" },
  { name: "Prakyath", role: "Stage & Venue Lead", seed: "Prakyath", photo: "/team/Prakyath.webp", color: "#ffe66d", github: "https://github.com/prakyathbhat28-dotcom", instagram: "https://www.instagram.com/prakyath_2611", linkedin: "https://www.linkedin.com/in/prakyath-a-443490333/" },

  // Registration Lead
  { name: "Chinmaygouda Patil", role: "Registration Lead", seed: "Chinmay", photo: "/team/Chinmay.webp", color: "#ff8ed4", github: "https://github.com/Chinmaygouda", instagram: "https://www.instagram.com/chinmaygouda__12", linkedin: "https://www.linkedin.com/in/chinmaygouda-patil-1b7b4332b/" },
  { name: "Shrinithi Hegde", role: "Registration Lead", seed: "Shrinithi", photo: "/team/shrinithi_Hegde.webp", color: "#845ec2", github: "https://github.com/shrinithihegde29", instagram: "https://www.instagram.com/shrinithi_hegde", linkedin: "https://www.linkedin.com/in/shrinithi-hegde-39a0762a2" },
  { name: "Krithi A S", role: "Registration Lead", seed: "KrithiAS", photo: "/team/krithi_a_s.webp", color: "#ffb830", github: "https://github.com/KrithiAS10", instagram: "https://www.instagram.com/krithi____kulal", linkedin: "https://www.linkedin.com/in/krithias10" },

  // Cultural Lead
  { name: "Davana Hiremath H S", role: "Cultural Lead", seed: "Davana", photo: "/team/Davana.webp", color: "#ff2d6f", github: "https://github.com/Davanahs", instagram: "https://www.instagram.com/davana_h_s?igsh=Mmp4aHoxdzlmeHQ1", linkedin: "https://www.linkedin.com/in/davana-hiremath-h-s-440677321" },
  { name: "Varsha Hegde", role: "Cultural Lead", seed: "Varsha", photo: "/team/Varsha_Hegde.webp", color: "#4ecdc4", github: "https://github.com/Varsush", instagram: "https://www.instagram.com/varsush_?igsh=MWVxaHB0MzlmY2V4Nw%3D%3D&utm_source=qr", linkedin: "https://www.linkedin.com/in/varsha-hegde-072005s" },
  { name: "Shreyas Shettigar", imgPosition: "center 15%", role: "Cultural Lead", seed: "Shreyas", photo: "/team/Shreyas_shettigar.webp", color: "#c8f135", github: "https://github.com/Shreyas-hs-22", instagram: "https://www.instagram.com/shreyas_shettigar?igsh=MTZsMGVicDRobXI0YQ==", linkedin: "https://www.linkedin.com/in/shreyas-shettigar-2ba345356?utm_source=share_via&utm_content=profile&utm_medium=member_android" },
  { name: "Aishwarya  H C", role: "Cultural Lead", seed: "Aishwarya", photo: "/team/Aishwarya_HC.webp", color: "#c8f135", github: "https://github.com/Madeby-Aish", instagram: "https://www.instagram.com/tfaish_?igsh=ajVubGF3ZzhxMm94", linkedin: "https://www.linkedin.com/in/aishwaryahc5506/" },

  // Documentation & Design Lead
  { name: "Deeksha", role: "Design Lead", seed: "Deeksha", photo: "/team/deeksha.webp", color: "#ff2d6f", github: "https://github.com/Deeksha3227", linkedin: "https://www.linkedin.com/in/deeksha-g-458a672a1?utm_source=share_via&utm_content=profile&utm_medium=member_android" },
  { name: "Adithya Unni", role: "Design Lead", seed: "Adithya", photo: "/team/Adithya _unni.webp", color: "#845ec2", github: "https://github.com/adithyaunni", instagram:"https://www.instagram.com/u_____n_____n_____i?igsh=Y3JzMDVleXNqbWhm",linkedin: "https://www.linkedin.com/in/adithya-unni-364b8232b" },
  { name: "Shramish", role: "Design Lead", seed: "Shramish", photo: "/team/shramish poojary.webp", color: "#ffe66d", github: "https://github.com/ShramishR", instagram: "https://www.instagram.com/shramish_poojary?igsh=djlzZm9pa2g0bGNv&igsi=djlzZm9pa2g0bGNv", linkedin: "https://www.linkedin.com/in/shramish-poojary-98b9502a1?utm_source=share_via&utm_content=profile&utm_medium=member_android" },
  { name: "Shivani S Poojary", role: "Design Lead", seed: "Shivani", photo: "/team/Shivani S Poojary .webp", color: "#ff8ed4", github: "https://github.com/Shivani512005", instagram: "https://www.instagram.com/_iiamshivani_?igsh=MXNsMzkzNnN6cXRiYg==", linkedin: "https://www.linkedin.com/in/shivani-s-poojary-047a2a1?utm_source=share_via&utm_content=profile&utm_medium=member_android" },
];

const COORDINATORS = [...TEAM_COORDINATORS];

// Ordered list of roles for the filter dropdown
const ROLES = [
  "Lead Organizer",
  "Tech Lead",
  "Press & Media Lead",
  "Logistics & Accommodation Lead",
  "Food & Refreshments Lead",
  "Stage & Venue Lead",
  "Registration Lead",
  "Cultural Lead",
  "Design Lead",
];

// Minimum horizontal drag distance (px) before a touch gesture counts as a swipe
const SWIPE_THRESHOLD = 40;

export default function CoordinatorsSection() {
  const [selectedRole, setSelectedRole] = useState("ALL");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const lastScrollTime = useRef(0);
  const [isHovered, setIsHovered] = useState(false);
  const [clickedSideCard, setClickedSideCard] = useState<string | null>(null);
  const [isInView, setIsInView] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  // Close the custom filter dropdown when clicking anywhere outside it
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Start auto-play only when the section scrolls into view
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Drag state for the active polaroid (mouse/pen wobble — desktop-oriented,
  // uses Pointer Events, kept fully separate from the touch-swipe navigation below)
  const [isDragging, setIsDragging] = useState(false);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number } | null>(null);

  // Swipe-to-navigate state for touch devices. Separate from the polaroid
  // pointer-drag above: that one just wobbles the photo and snaps back,
  // this one is what actually changes the active card on mobile.
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const isSwipingRef = useRef(false);

  // The list currently being shown in the carousel, filtered by role
  const visibleList = useMemo(() => {
    return selectedRole === "ALL"
      ? COORDINATORS
      : COORDINATORS.filter((c) => c.role === selectedRole);
  }, [selectedRole]);

  // Reset to the first slide whenever the filter changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [selectedRole]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: dragPos.x,
      startY: dragPos.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.mouseX;
    const dy = e.clientY - dragStartRef.current.mouseY;
    setDragPos({ x: dragStartRef.current.startX + dx, y: dragStartRef.current.startY + dy });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    // Snap back to stand position
    setDragPos({ x: 0, y: 0 });
    dragStartRef.current = null;
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? visibleList.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % visibleList.length);
  };

  const handleWheel = (e: React.WheelEvent) => {
    const now = Date.now();
    // 500ms debounce to prevent rapid scrolling through everyone at once
    if (now - lastScrollTime.current < 500) return;

    if (e.deltaY > 30 || e.deltaX > 30) {
      handleNext();
      lastScrollTime.current = now;
    } else if (e.deltaY < -30 || e.deltaX < -30) {
      handlePrev();
      lastScrollTime.current = now;
    }
  };

  // Touch handlers — mobile swipe-to-navigate on the screen area.
  // Kept independent of the polaroid's onPointerDown/Move/Up wobble handlers,
  // which only attach to the active card itself.
  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
    isSwipingRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const dx = e.touches[0].clientX - touchStartRef.current.x;
    const dy = e.touches[0].clientY - touchStartRef.current.y;

    // Once the gesture is clearly horizontal, claim it so the page doesn't
    // scroll vertically while the user is trying to swipe cards
    if (!isSwipingRef.current && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
      isSwipingRef.current = true;
    }
    if (isSwipingRef.current && e.cancelable) e.preventDefault();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;

    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) {
        handleNext(); // swiped left → next card
      } else {
        handlePrev(); // swiped right → previous card
      }
    }
    touchStartRef.current = null;
    isSwipingRef.current = false;
  };

  // Calculates the relative offset from the current index with infinite wrap-around
  const getOffset = (index: number) => {
    const diff = index - currentIndex;
    const half = visibleList.length / 2;
    if (diff > half) return diff - visibleList.length;
    if (diff < -half) return diff + visibleList.length;
    return diff;
  };

  useEffect(() => {
    if (isDragging || isHovered || !isInView) return;
    if (visibleList.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % visibleList.length);
    }, 2500);
    return () => clearInterval(timer);
  }, [isDragging, isHovered, isInView, visibleList.length]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") { e.preventDefault(); handlePrev(); }
      if (e.key === "ArrowRight") { e.preventDefault(); handleNext(); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleList.length]);

  return (
    <section className={styles.section} id="coordinators" ref={sectionRef}>
      <div className="section">
        <div className={styles.header}>
          <div className="section-label">{"//"} the team</div>
          <h2 className="section-title">MEET THE <span className="text-lime">CREW</span></h2>
          <p className="section-sub" style={{ opacity: 0.7 }}>Interact to explore the roster.</p>
        </div>

        <div className={styles.carouselContainer}>
          {/* Screen Area */}
          <div
            className={styles.screen}
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={visibleList[currentIndex] ? { "--screen-accent": visibleList[currentIndex].color } as React.CSSProperties : undefined}
          >
            {/* Background elements */}
            <div className={styles.uiOverlay}>
               <div className={styles.uiTopRight}>V 1.0.4</div>
               <div className={styles.uiBottomLeft}>LNK_ESTABLISHED</div>
               <div className={styles.uiBottomRight}>[ REC ] <span className={styles.blinker}></span></div>
               <div className={styles.crosshair}>+</div>
            </div>

            {/* Role filter — kept OUTSIDE .uiOverlay and given its own z-index.
                Raising the whole overlay would put the passive HUD labels
                (V 1.0.4, LNK_ESTABLISHED, REC) above the sliding cards too,
                which is what caused them to paint over the polaroid mid-animation.
                Only this interactive piece needs to sit above the slides. */}
            <div className={styles.filterHud} ref={filterRef}>
              <span className={styles.uiTopLeftLabel}>SYS.ADMIN //</span>
              <div className={styles.filterDropdown}>
                <button
                  type="button"
                  className={styles.filterTrigger}
                  onClick={() => setIsFilterOpen((open) => !open)}
                  aria-haspopup="listbox"
                  aria-expanded={isFilterOpen}
                >
                  <span>{selectedRole === "ALL" ? "ALL ROLES" : selectedRole.toUpperCase()}</span>
                  <span className={`${styles.filterChevron} ${isFilterOpen ? styles.filterChevronOpen : ""}`}>
                    <ChevronIcon />
                  </span>
                </button>
                {isFilterOpen && (
                  <ul className={styles.filterMenu} role="listbox">
                    <li
                      role="option"
                      aria-selected={selectedRole === "ALL"}
                      className={`${styles.filterOption} ${selectedRole === "ALL" ? styles.filterOptionActive : ""}`}
                      onClick={() => { setSelectedRole("ALL"); setIsFilterOpen(false); }}
                    >
                      ALL ROLES
                    </li>
                    {ROLES.map((role) => (
                      <li
                        key={role}
                        role="option"
                        aria-selected={selectedRole === role}
                        className={`${styles.filterOption} ${selectedRole === role ? styles.filterOptionActive : ""}`}
                        onClick={() => { setSelectedRole(role); setIsFilterOpen(false); }}
                      >
                        {role.toUpperCase()}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {visibleList.map((coord, index) => {
              const offset = getOffset(index);
              const absOffset = Math.abs(offset);

              // Render only the immediate surrounding items to save DOM performance
              // Since it's infinite, anything further away than 2 units is hidden anyway
              if (absOffset > 2) return null;

              // How many social buttons this card will actually show. When
              // there's only one (e.g. faculty with just a LinkedIn link),
              // that single button renders wider instead of looking like a
              // tiny orphaned square.
              const socialCount = [coord.linkedin, coord.github, coord.instagram, coord.phone].filter(Boolean).length;
              const soloBtnClass = socialCount === 1 ? styles.socialBtnWide : "";

              const isSideCard = offset !== 0;
              const isAdjacentCard = Math.abs(offset) === 1;
              const isClicked = clickedSideCard === coord.name;

              return (
                <div
                  key={coord.name}
                  className={styles.slideInner}
                  style={{
                    "--offset": offset,
                    "--scale": offset === 0 ? 1 : Math.max(0.7, 0.85 - (absOffset * 0.1)),
                    "--opacity": offset === 0 ? 1 : absOffset === 1 ? 0.5 : 0.2,
                    "--zIndex": 100 - absOffset,
                    "--pointerEvents": isAdjacentCard ? "all" : offset === 0 ? "all" : "none",
                    "--accent": coord.color
                  } as React.CSSProperties}
                >
                  <div className={styles.avatarWrapper}>
                  {/* Floating polaroid card — draggable */}
                    <div
                      className={`${styles.polaroid} ${isDragging && offset === 0 ? styles.polaroidDragging : ""}`}
                      data-label={coord.name.toUpperCase()}
                      style={offset === 0 ? {
                        transform: `translate(${dragPos.x}px, ${dragPos.y}px)`,
                        cursor: isDragging ? "grabbing" : "grab",
                        transition: isDragging ? "none" : "transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)",
                        userSelect: "none",
                      } : {}}
                      onPointerDown={offset === 0 ? handlePointerDown : undefined}
                      onPointerMove={offset === 0 ? handlePointerMove : undefined}
                      onPointerUp={offset === 0 ? handlePointerUp : undefined}
                      onPointerCancel={offset === 0 ? handlePointerUp : undefined}
                    >
                      {/* Real photo from /public/team/, with a graceful fallback
                          to the generated DiceBear avatar for anyone whose photo
                          hasn't been added yet (so a missing file doesn't break
                          the card — it just shows a placeholder face). */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={coord.photo}
                        alt={`${coord.name} — ${coord.role}, Singularity 2026 Hackathon`}
                        className={styles.avatar}
                        draggable={false}
                        style={coord.imgPosition ? { objectPosition: coord.imgPosition } : undefined}
                        onError={(e) => {
                          const img = e.currentTarget;
                          const fallback = `https://api.dicebear.com/8.x/micah/svg?seed=${coord.seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc`;
                          if (img.src !== fallback) img.src = fallback;
                        }}
                      />
                    </div>
                    {/* 3D Platform */}
                    <div className={`${styles.platform} ${isDragging && offset === 0 ? styles.platformOff : ""}`}></div>
                    {/* Ground glow */}
                    <div className={`${styles.groundGlow} ${isDragging && offset === 0 ? styles.groundGlowOff : ""}`}></div>
                  </div>
                  <div className={styles.info}>
                    <h3
                      className={`${styles.name} ${isCompactName(coord.name) ? styles.nameCompact : ""} ${isSideCard ? styles.nameNeon : ""} ${isSideCard && isClicked ? styles.nameClicked : ""}`}
                      style={{ fontSize: getNameFontSize(coord.name), whiteSpace: "nowrap", cursor: isSideCard ? "pointer" : undefined }}
                      onClick={isSideCard ? (e) => { e.stopPropagation(); setClickedSideCard(isClicked ? null : coord.name); } : undefined}
                    >
                      {coord.name}
                    </h3>
                    <p className={styles.role}>{coord.role}</p>
                    <div className={styles.socials}>
                      {/* LinkedIn button — only rendered when the coordinator has a linkedin field */}
                      {coord.linkedin ? (
                        <a href={coord.linkedin} target="_blank" rel="noopener noreferrer" className={`${styles.socialBtn} ${soloBtnClass}`} aria-label="LinkedIn" onClick={e => e.stopPropagation()}>
                          <LinkedinIcon />
                        </a>
                      ) : null}
                      {/* GitHub button — only rendered when the coordinator has a github field */}
                      {coord.github ? (
                        <a href={coord.github} target="_blank" rel="noopener noreferrer" className={`${styles.socialBtn} ${soloBtnClass}`} aria-label="GitHub" onClick={e => e.stopPropagation()}>
                          <GithubIcon />
                        </a>
                      ) : null}
                      {/* Instagram button — only rendered when the coordinator has an instagram field */}
                      {coord.instagram ? (
                        <a href={coord.instagram} target="_blank" rel="noopener noreferrer" className={`${styles.socialBtn} ${soloBtnClass}`} aria-label="Instagram" onClick={e => e.stopPropagation()}>
                          <InstagramIcon />
                        </a>
                      ) : null}
                      {/* Phone button — Lead Organizers only (only they carry a phone field) */}
                      {coord.phone ? (
                        <a href={`tel:${coord.phone}`} className={`${styles.socialBtn} ${soloBtnClass}`} aria-label="Phone" onClick={e => e.stopPropagation()}>
                          <PhoneIcon />
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Pagination Dots inside Screen */}
            <div className={styles.pagination}>
              {visibleList.map((coord, index) => (
                <button
                  key={`dot-${coord.name}-${index}`}
                  className={`${styles.dot} ${index === currentIndex ? styles.dotActive : ""}`}
                  style={index === currentIndex ? { background: coord.color, boxShadow: `0 0 8px 2px ${coord.color}` } : undefined}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(index);
                    setClickedSideCard(null);
                  }}
                  aria-label={`Go to ${coord.name}`}
                  title={coord.name}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
