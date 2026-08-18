import { Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Receipt, Search, Star, Phone, MapPin, Flag, Check, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Reveal } from '../../components/ui/Reveal.jsx';
import { useMediaQuery } from '../../hooks/useMediaQuery.js';
import { useWebGLSupport } from '../../components/three/useWebGLSupport.js';
import { SERVICES, FEATURED_SERVICES } from '../../data/services.js';

// Lazy-loaded so the WebGL/three bundle only downloads when the taxi actually renders.
const HeroTaxiScene = lazy(() => import('../../components/three/HeroTaxiScene.jsx'));

const STATS = [
  { value: '24/7', label: 'Service, every day' },
  { value: '18+', label: 'Communities served' },
  { value: '10,000+', label: 'Rides completed' },
  { value: '5.0', label: 'Passenger rating' },
];

const TRUST = [
  { icon: ShieldCheck, label: 'Licensed & insured' },
  { icon: Receipt, label: 'Upfront, transparent pricing' },
  { icon: Search, label: 'Background-checked drivers' },
  { icon: Star, label: 'Rated after every ride' },
];

const STEPS = [
  { n: '01', t: 'Book your ride', d: 'Set your pickup and dropoff on the web or app. See the price upfront before you confirm — no meter surprises.' },
  { n: '02', t: 'We match your driver', d: 'The nearest available professional is matched to you and notified instantly. You know exactly who is coming.' },
  { n: '03', t: 'Track & ride', d: 'Follow your driver live on the map, share the trip with loved ones, and rate your ride when it ends.' },
];

const TESTIMONIALS = [
  {
    quote:
      'Picked me up at BWI at 4:30am, drove the whole way professionally, and the fare was exactly what I saw on the app. Flawless.',
    name: 'Danielle R.',
    detail: 'Ellicott City, MD · Airport transfer',
  },
  {
    quote:
      'We booked a sedan for our wedding party of six. The drivers were early, immaculate, and so kind. Could not have asked for a smoother day.',
    name: 'Marcus & Priya',
    detail: 'Ellicott City, MD · Wedding',
  },
  {
    quote:
      'I use Ellicott City Airport Taxi every week for the commute to the office. Reliable, clean cars and the same great driver most mornings.',
    name: 'Jennifer W.',
    detail: 'Ellicott City, MD · Corporate account',
  },
];

const AREAS = [
  'Columbia', 'Ellicott City', 'Elkridge', 'Fulton', 'Laurel', 'Savage',
  'Highland', 'Jessup', 'Clarksville', 'Dayton', 'West Friendship', 'Woodstock',
  'Glenelg', 'Glenwood', 'Mount Airy', 'Sykesville', 'Woodbine', 'Cooksville',
  'Marriottsville', 'Hanover', 'Simpsonville', 'Lisbon', 'Annapolis Junction',
];

export default function Home() {
  const { user } = useAuth();
  const bookUrl = user ? '/reservations' : '/login';

  // 3D taxi: hidden on mobile and when WebGL is unavailable; tablets get a compact variant.
  const isMobile = useMediaQuery('(max-width: 767px)');
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const webgl = useWebGLSupport();
  const showTaxi = !isMobile && webgl;

  const featured = FEATURED_SERVICES.map((slug) => SERVICES.find((s) => s.slug === slug));

  return (
    <div>
      {/* ============ HERO ============ */}
      <section className="bg-brand-gradient relative overflow-hidden text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-40 left-1/3 h-96 w-96 rounded-full bg-gold-500/15 blur-3xl" />
        </div>

        <div className="relative">
          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-24">
            <div className="relative z-10">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-white/85 backdrop-blur">
                <span className="h-2 w-2 animate-pulse rounded-full bg-gold-400" />
                Ellicott City, MD · Available 24/7
              </span>

              <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                Ellicott City’s premier{' '}
                <span className="text-gold-300">full-service</span> transportation provider
              </h1>

              <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/80">
                Professional taxi, sedan and SUV service across Maryland, DC, and Virginia —
                airport transfers, corporate travel, weddings,
                events and more. Book online, pay upfront, track your driver live.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link to={bookUrl}>
                  <Button size="lg" className="bg-white !text-brand-900 shadow-xl hover:bg-brand-50">
                    Book your ride online
                  </Button>
                </Link>
                <a
                  href="tel:4103655556"
                  className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-white/10"
                >
                  <Phone className="h-4 w-4" />
                  (410) 365-5556
                </a>
              </div>

              <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
                {TRUST.map((t) => (
                  <div key={t.label} className="flex items-center gap-2 text-sm text-white/75">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10">
                      <t.icon className="h-4 w-4" />
                    </span>
                    {t.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Quick quote card */}
            <div className="relative z-10">
              <div className="rounded-3xl bg-white p-6 text-ink shadow-2xl sm:p-8">
                <h3 className="text-xl font-bold">Plan your trip</h3>
                <p className="mt-1 text-sm text-muted">
                  Live fare estimate · real-time availability
                </p>

                <div className="mt-6 space-y-4">
                  <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 py-3">
                    <MapPin className="h-4 w-4 text-brand-600" />
                    <span className="text-sm text-slate-500">Pickup — where are you?</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 py-3">
                    <Flag className="h-4 w-4 text-brand-600" />
                    <span className="text-sm text-slate-500">Dropoff — where to?</span>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl bg-brand-gradient-soft px-5 py-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-brand-800">Live availability</span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-700 shadow-sm">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-500" />
                      Drivers online
                    </span>
                  </div>
                </div>

                <Link to={bookUrl} className="mt-6 block">
                  <Button size="lg" className="w-full py-3.5">
                    Get a fare estimate
                  </Button>
                </Link>
                <p className="mt-3 text-center text-xs text-muted">
                  No sign-up needed to preview the price.
                </p>
              </div>
            </div>
          </div>

          {/* 3D taxi — behind the booking card for depth, never blocking interaction */}
          {showTaxi && (
            <div
              className="taxi-fade-in pointer-events-none absolute inset-0 z-[6]"
              aria-hidden="true"
            >
              <Suspense fallback={null}>
                <HeroTaxiScene variant={isDesktop ? 'desktop' : 'tablet'} />
              </Suspense>
            </div>
          )}
        </div>

        {/* Stats bar */}
        <div className="relative border-t border-white/10 bg-black/10">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-8 sm:px-6 md:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-extrabold text-gold-300 sm:text-3xl">{s.value}</div>
                <div className="mt-1 text-sm text-white/70">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ WELCOME / ABOUT BLURB ============ */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-brand-600">
              Welcome to Ellicott City Airport Taxi
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Peace of mind, <span className="text-brand-gradient">every mile</span>
            </h2>
            <p className="mt-5 text-base leading-relaxed text-muted">
              Ellicott City Airport Taxi delivers professional, reliable and comfortable
              transportation across
              Maryland, DC, and Virginia for private schools, corporate clients, events, airport
              transfers and
              group travel. Our experienced drivers provide safe, seamless journeys — every time.
            </p>
            <p className="mt-4 text-base leading-relaxed text-muted">
              Every driver is professionally trained, licensed and background-checked. Our service
              manager monitors quality continuously and passengers rate every trip, so we can hold
              the Ellicott City Airport Taxi standard of excellence.
            </p>
            <ul className="mt-6 space-y-3">
              {['Prompt, efficient, comfortable and safe', 'Clean, modern, well-maintained vehicles', 'Transparent upfront pricing', 'Professional, courteous drivers'].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm font-medium text-ink">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent-100 text-accent-700">
                    <Check className="h-3 w-3" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Get a quote card */}
          <div className="overflow-hidden rounded-3xl bg-brand-gradient text-white shadow-xl">
            <div className="p-8 sm:p-10">
              <h3 className="text-2xl font-bold">Book online or call</h3>
              <a
                href="tel:4103655556"
                className="mt-2 block text-3xl font-extrabold tracking-tight text-gold-300"
              >
                (410) 365-5556
              </a>
              <p className="mt-4 text-[15px] leading-relaxed text-white/80">
                Get a free, no-obligation quote for airport transfers, events, corporate accounts
                and group travel. Our dispatch team is here 24/7.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to={bookUrl}>
                  <Button size="lg" className="bg-white !text-brand-900 shadow-lg hover:bg-brand-50">
                    Get a free quote
                  </Button>
                </Link>
                <Link
                  to="/about"
                  className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-white/10"
                >
                  About us
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FEATURED SERVICES ============ */}
      <section className="bg-brand-gradient-soft py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-brand-600">
                What we offer
              </span>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                Reliable transportation for every occasion
              </h2>
            </div>
            <Link
              to="/services"
              className="inline-flex items-center gap-2 rounded-full border border-brand-600 px-5 py-2.5 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50"
            >
              View all services <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featured.map((s, i) => (
              <Reveal key={s.slug} delay={(i % 3) * 100} className="h-full">
                <Link
                  to={`/services/${s.slug}`}
                  className="card-lift group relative flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-7 shadow-sm"
                >
                  <div className="absolute inset-x-0 top-0 h-1.5 rounded-t-3xl bg-brand-gradient opacity-0 transition-opacity group-hover:opacity-100" />
                  <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-gradient-soft">
                    <s.icon className="h-7 w-7 text-brand-700" />
                  </span>
                  <h3 className="mt-5 text-lg font-bold text-ink">{s.name}</h3>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
                    {s.tagline}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{s.summary}</p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700">
                    Learn more
                    <span className="transition-transform group-hover:translate-x-1">
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ IMAGE BAND ============ */}
      <section className="relative overflow-hidden">
        <img
          src="/images/ececutive-sedan.png"
          alt="Ellicott City Airport Taxi executive sedan"
          className="h-72 w-full object-cover sm:h-96"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-950/80 via-brand-900/40 to-transparent" />
        <div className="absolute inset-0 flex items-center">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
            <div className="max-w-lg">
              <h2 className="text-2xl font-bold text-white sm:text-3xl">
                Professional chauffeurs. Immaculate vehicles. Every single time.
              </h2>
              <p className="mt-3 text-sm text-white/80 sm:text-base">
                Every vehicle is cleaned, inspected and ready for you — and every driver is
                licensed, insured and background-checked.
              </p>
              <Link
                to="/fleet"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-brand-900 shadow-lg transition-colors hover:bg-brand-50"
              >
                Explore the fleet <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-brand-600">
            Simple &amp; swift booking
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Booking is effortless
          </h2>
          <p className="mt-4 text-muted">
            From request to drop-off in three simple steps — on the web or on our mobile app.
          </p>
        </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 120} className="h-full">
                <div className="card-lift h-full rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                  <div className="text-brand-gradient text-4xl font-extrabold">{s.n}</div>
                  <h3 className="mt-4 text-lg font-bold text-ink">{s.t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{s.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
      </section>

      {/* ============ TESTIMONIALS ============ */}
      <section className="bg-brand-gradient py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-gold-300">
              Testimonials
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Our clients share the love
            </h2>
                        <div className="mt-4 flex justify-center gap-0.5 text-gold-400" aria-label="Five star reviews">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-current" />
              ))}
            </div>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={t.name} delay={(i % 3) * 110} className="h-full">
                <figure className="card-lift h-full rounded-3xl border border-white/15 bg-white/10 p-7 backdrop-blur">
                  <div className="flex gap-0.5 text-gold-400" aria-hidden>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                  <blockquote className="mt-4 text-[15px] leading-relaxed text-white/90">
                    “{t.quote}”
                  </blockquote>
                  <figcaption className="mt-6 border-t border-white/15 pt-4">
                    <div className="font-semibold text-white">{t.name}</div>
                    <div className="mt-0.5 text-sm text-white/70">{t.detail}</div>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ SERVICE AREAS ============ */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-brand-600">
            Locally based
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            We are available across Maryland, DC, and Virginia
          </h2>
          <p className="mt-4 text-muted">
            Based in Ellicott City, Ellicott City Airport Taxi operates actively in every
            community across the region — plus BWI, Dulles, Reagan National, Amtrak and MARC
            terminals.
          </p>
        </div>

        <Reveal delay={80}>
          <div className="mt-10 flex flex-wrap justify-center gap-2.5">
            {AREAS.map((a) => (
              <span
                key={a}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-ink shadow-sm transition-colors hover:border-brand-300"
              >
                {a}
              </span>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ============ CTA ============ */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <div className="overflow-hidden rounded-3xl bg-brand-gradient-soft px-6 py-14 text-center sm:px-12">
          <h2 className="text-3xl font-bold tracking-tight text-brand-900 sm:text-4xl">
            Ready for a ride?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-brand-950/70">
            Book online in seconds, or call our 24/7 dispatch team and we will take care of the
            rest.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link to={bookUrl}>
              <Button size="lg" className="py-3.5">
                Book a ride now
              </Button>
            </Link>
            <a
              href="tel:4103655556"
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-base font-semibold text-brand-800 shadow-sm transition-colors hover:bg-brand-50"
            >
              <Phone className="h-4 w-4" />
              (410) 365-5556
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
