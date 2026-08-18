import { Plane, Briefcase, Gem, PartyPopper, Bus, MoonStar, Heart, School, Car } from 'lucide-react';

export const SERVICES = [
  {
    slug: 'airport',
    name: 'Airport Transfers',
    short: 'Airport',
    icon: Plane,
    tagline: 'BWI · Dulles · Reagan · Amtrak',
    summary:
      'Skip the parking lots, long TSA lines and the final dash to your gate. Our professional drivers deliver prompt, meet-and-greet airport transfers to and from BWI, Dulles, Reagan National, Amtrak and MARC terminals — monitored around the clock for schedule changes.',
    features: [
      'Flight tracking so we adapt to delays',
      'Meet-and-greet service at arrivals',
      'Round-trip and multi-stop itineraries',
      'Flat, upfront pricing with no meter surprises',
    ],
  },
  {
    slug: 'corporate',
    name: 'Corporate Travel',
    short: 'Corporate',
    icon: Briefcase,
    tagline: 'Punctual, private, professional',
    summary:
      'Tailored for corporate events, client meetings and frequent airport runs. Our fleet ensures punctuality, privacy and peace of mind — from live journey tracking to special requests, your business travel is fully covered.',
    features: [
      'Corporate accounts with consolidated billing',
      'Guaranteed on-time scheduling',
      'Executive sedans and SUVs',
      'Dedicated booking support',
    ],
  },
  {
    slug: 'wedding',
    name: 'Wedding Transportation',
    short: 'Weddings',
    icon: Gem,
    tagline: 'From ceremony to happily ever after',
    summary:
      'From bachelor(ette) parties to rehearsal dinners to newlywed getaways, we handle it all. We will help you create a customized transportation plan from the very beginning all the way to happily ever after.',
    features: [
      'Custom itineraries for the whole wedding party',
      'Champagne-ready luxury sedans and SUVs',
      'Coordination across venues and timings',
      'Elegant, uniformed chauffeurs',
    ],
  },
  {
    slug: 'prom',
    name: 'Prom & Celebrations',
    short: 'Proms',
    icon: PartyPopper,
    tagline: 'Style, safety and peace of mind',
    summary:
      'Celebrate in style with our premium sedans and SUVs, perfect for an unforgettable prom night. Our state-certified, background-checked drivers ensure a safe, smooth ride for your teen — so you can relax.',
    features: [
      'Safe, vetted drivers in uniform',
      'On-time pickup and dropoff',
      'Clean, modern vehicles',
      'Flexible group arrangements',
    ],
  },
  {
    slug: 'shuttle',
    name: 'Employee & Corporate Shuttles',
    short: 'Shuttles',
    icon: Bus,
    tagline: 'Stress-free K-12 to college & work',
    summary:
      'Enjoy stress-free transportation for schools, sports teams and corporate commuters. We create tailored itineraries with vetted and certified drivers — ask about ongoing corporate shuttle contracts.',
    features: [
      'Custom routes and recurring schedules',
      'Vetted, certified drivers',
      'Live dispatch and tracking',
      'Dependable morning and evening runs',
    ],
  },
  {
    slug: 'charter',
    name: 'Charter Bus Trips',
    short: 'Charter Bus',
    icon: Bus,
    tagline: 'Groups of every size',
    summary:
      'Whether you are heading to the city for the day or on a longer group trip, our coordinators ensure everything runs seamlessly. Our network of trusted motorcoach partners handles groups of any size.',
    features: [
      'Motorcoaches for up to 56 passengers',
      'Group itineraries built by coordinators',
      'Multi-day and multi-stop trips',
      'Trusted, licensed operators',
    ],
  },
  {
    slug: 'night-out',
    name: 'Night Out',
    short: 'Night Out',
    icon: MoonStar,
    tagline: 'Birthdays, concerts & dinners',
    summary:
      'From birthday dinners to concerts, we have you covered. Let us turn your night on the town into a one-of-a-kind experience — connect with our coordinators for a night to remember.',
    features: [
      'Designated-driver convenience',
      'Multi-stop evening itineraries',
      'Punctual pickup and return',
      'Courteous, professional drivers',
    ],
  },
  {
    slug: 'funeral',
    name: 'Funeral & Memorial',
    short: 'Funerals',
    icon: Heart,
    tagline: 'Dignified, respectful service',
    summary:
      'Whether you are planning a private service or a large memorial, our team ensures every ride is handled with care. Trusted, professional drivers provide dignified, reliable transportation during life’s most difficult moments.',
    features: [
      'Sensitive, discreet chauffeurs',
      'Processions coordinated with your funeral home',
      'Family and guest transport options',
      'Quiet, dignified service',
    ],
  },
  {
    slug: 'school',
    name: 'School Transportation',
    short: 'Schools',
    icon: School,
    tagline: 'Safe daily routes & field trips',
    summary:
      'Ellicott City Airport Taxi provides safe, dependable transportation tailored for private schools. From daily AM and PM routes to field trips and special events, our professional drivers ensure students travel comfortably, securely and on schedule.',
    features: [
      'Daily routes and activity buses',
      'Background-checked, trained drivers',
      'GPS-monitored journeys',
      'Field trips and special events',
    ],
  },
  {
    slug: 'valet',
    name: 'Valet Parking',
    short: 'Valet',
    icon: Car,
    tagline: 'Seamless events, effortless arrival',
    summary:
      'Our valet service ensures seamless events. Professional attendants prioritize efficiency and courtesy, adding a touch of sophistication to your gatherings — elevate your occasions with top-notch valet service.',
    features: [
      'Professional, uniformed attendants',
      'Efficient and courteous service',
      'Scalable for events of any size',
      'Coordinated with your venue',
    ],
  },
];

export const FEATURED_SERVICES = ['wedding', 'airport', 'shuttle', 'corporate', 'night-out'];

export const getService = (slug) => SERVICES.find((s) => s.slug === slug);
