import HeroSection from "@/components/HeroSection/HeroSection";
import AboutSection from "@/components/AboutSection/AboutSection";
import TracksSection from "@/components/TracksSection/TracksSection";
import PrizesSection from "@/components/PrizesSection/PrizesSection";
import ScheduleSection from "@/components/ScheduleSection/ScheduleSection";
import CoordinatorsSection from "@/components/CoordinatorsSection/CoordinatorsSection";
// import TeamsSection from "@/components/TeamsSection/TeamsSection";
import RegistrationInfoSection from "@/components/RegistrationInfoSection/RegistrationInfoSection";
import FAQSection from "@/components/FAQSection/FAQSection";
import SponsorsSection from "@/components/SponsorsSection/SponsorsSection";
import PatronsSection from "@/components/PatronsSection/PatronsSection";
import Footer from "@/components/Footer/Footer";
import TickerTape from "@/components/TickerTape/TickerTape";
import SplashWrapper from "@/components/SplashWrapper";
import { getSiteUrl } from "@/lib/site";
// import CountDown from "@/components/CountDown/CountDown";
const siteUrl = getSiteUrl();

const eventJsonLd = {
  "@context": "https://schema.org",
  "@type": "Event",
  name: "Singularity 2026 Hackathon",
  alternateName: "AJIET Hackathon",
  startDate: "2026-10-08",
  endDate: "2026-10-09",
  eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
  eventStatus: "https://schema.org/EventScheduled",
  url: siteUrl,
  image: [`${siteUrl}/og.png`],
  location: {
    "@type": "Place",
    name: "A J Institute of Engineering and Technology (AJIET)",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Kodikal",
      addressLocality: "Mangalore",
      addressRegion: "Karnataka",
      postalCode: "575006",
      addressCountry: "IN",
    },
  },
  description: "24-hour National-Level Inter-college Hackathon at AJIET.",
  organizer: {
    "@type": "Organization",
    name: "Singularity 2026 by AJIET",
    url: siteUrl,
  },
  offers: {
    "@type": "Offer",
    url: "https://unstop.com/o/6Y45JWH?lb=useYshOh",
    price: "0",
    priceCurrency: "INR",
    availability: "https://schema.org/InStock",
    validFrom: "2026-08-20",
    description:
      "Registration is free. Teams selected to participate pay a ₹650 fee.",
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Who can participate?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The hackathon is open to all UG and PG students pursuing B.E./B.Tech, M.Tech, BCA, MCA, B.Sc. in Computer Science, and M.Sc. in Computer Science. Participants from colleges across India are welcome to take part.",
      },
    },
    {
      "@type": "Question",
      name: "Is it free to participate?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "There is no fee required to submit your registration or participate in the selection process. A registration fee will be applicable only to the teams that are selected for the hackathon.",
      },
    },
    {
      "@type": "Question",
      name: "How big can a team be?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Teams can consist of 2 to 4 members. You can form a team with friends or other eligible participants who share your interest in building innovative solutions.",
      },
    },
    {
      "@type": "Question",
      name: "Can I team up with students from other colleges?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes! You can team up with eligible students from other colleges across India. Collaborate with different skill sets and build a stronger team for the hackathon.",
      },
    },
    {
      "@type": "Question",
      name: "What should I build?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Build an innovative solution that addresses a real-world problem using technology. You are encouraged to think creatively and develop something impactful, practical, and scalable.",
      },
    },
    {
      "@type": "Question",
      name: "Do I need to know how to code?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Coding skills are needed to build the prototype, but designers, product thinkers, and business strategists are equally valuable in a team. Participants with diverse skills and backgrounds are welcome to contribute to their team's ideas and solutions.",
      },
    },
    {
      "@type": "Question",
      name: "Will food and accommodation be provided?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Food will be provided to all participants throughout the hackathon. Accommodation details will be conveyed to the participants before the event.",
      },
    },
    {
      "@type": "Question",
      name: "Will there be internet access?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, internet access will be available throughout the hackathon venue. Participants can use the available connectivity as needed, and are encouraged to keep a personal hotspot as a backup.",
      },
    },
  ],
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: "A J Institute of Engineering and Technology",
  alternateName: "AJIET",
  url: "https://ajiet.edu.in",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Kodikal",
    addressLocality: "Mangalore",
    addressRegion: "Karnataka",
    postalCode: "575006",
    addressCountry: "IN",
  },
  logo: `${siteUrl}/icon-512x512.png`,
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <SplashWrapper>
        <main>
          <HeroSection />
          <TickerTape />
          <AboutSection />
          <TracksSection />
          <PrizesSection />
          <RegistrationInfoSection />
          <SponsorsSection />
          <PatronsSection />
          <CoordinatorsSection />      
          <ScheduleSection />
          <FAQSection />
        </main>
        <Footer />
      </SplashWrapper>
    </>
  );
}