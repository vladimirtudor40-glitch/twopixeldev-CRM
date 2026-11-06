import type {
  ContactChannel, ContactRole, ImportRowAction, ImportStatus, LeadCategory, LeadSource, PipelineStage,
  Priority, PropertyType, Role, WebsiteStatus, Zone, AuditAction,
} from "@prisma/client";

export const ZONE_LABEL: Record<Zone, string> = {
  CONSTANTA: "Constanța",
  MAMAIA: "Mamaia",
  MAMAIA_NORD_NAVODARI: "Mamaia Nord / Năvodari",
  EFORIE_NORD: "Eforie Nord",
  EFORIE_SUD: "Eforie Sud",
  AGIGEA: "Agigea",
  ALTA: "Altă zonă",
};

export const CATEGORY_LABEL: Record<LeadCategory, string> = {
  HOTELURI: "Hoteluri",
  BARBERSHOPURI: "Barbershopuri",
  RESTAURANTE: "Restaurante",
  ACTIVITATI: "Activități",
  SALOANE_BEAUTY: "Saloane beauty",
};

/** Numele la singular, pentru coloana „Categorie” din tabel și fișa lead-ului. */
export const CATEGORY_SINGULAR: Record<LeadCategory, string> = {
  HOTELURI: "Hotel / cazare",
  BARBERSHOPURI: "Barbershop",
  RESTAURANTE: "Restaurant",
  ACTIVITATI: "Activitate",
  SALOANE_BEAUTY: "Salon beauty",
};

export const TYPE_LABEL: Record<PropertyType, string> = {
  HOTEL: "Hotel",
  PENSIUNE_VILA: "Pensiune / vilă",
  APARTAMENT_REGIM_HOTELIER: "Apartament regim hotelier",
  HOSTEL: "Hostel",
  MOTEL: "Motel",
  CASA_DE_VACANTA: "Casă de vacanță",
  CAMPING: "Camping",
  ALTUL: "Altul",
};

export const WEBSITE_LABEL: Record<WebsiteStatus, string> = {
  ARE_SITE_PROPRIU: "Are site propriu",
  DOAR_PLATFORME: "Doar Booking / Facebook",
  FARA_SITE: "Fără site",
  NECUNOSCUT: "Necunoscut",
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  A: "A · de sunat primii",
  B: "B · de verificat",
  C: "C · are site",
};

export const STAGE_LABEL: Record<PipelineStage, string> = {
  NOU: "Nou",
  DE_VERIFICAT: "De verificat",
  CONTACTAT: "Contactat",
  INTERESAT: "Interesat",
  DEMO_PROGRAMAT: "Demo programat",
  OFERTA_TRIMISA: "Ofertă trimisă",
  NEGOCIERE: "Negociere",
  CASTIGAT: "Câștigat (client)",
  PIERDUT: "Pierdut",
  REVINO_MAI_TARZIU: "Revino mai târziu",
};

export const STAGE_COLOR: Record<PipelineStage, string> = {
  NOU: "#7F8FA6",
  DE_VERIFICAT: "#9C8FD0",
  CONTACTAT: "#2F8FB8",
  INTERESAT: "#178582",
  DEMO_PROGRAMAT: "#2DB3A9",
  OFERTA_TRIMISA: "#C7AE86",
  NEGOCIERE: "#D9A441",
  CASTIGAT: "#E0C38F",
  PIERDUT: "#D5675E",
  REVINO_MAI_TARZIU: "#6E7F99",
};

export const SOURCE_LABEL: Record<LeadSource, string> = {
  OSM: "OpenStreetMap",
  MINISTER: "Lista Ministerului Turismului",
  OSM_SI_MINISTER: "OpenStreetMap + minister",
  GOOGLE_MAPS: "Google Maps",
  GOOGLE_PLACES: "Google Places",
  BOOKING: "Booking.com",
  FACEBOOK_INSTAGRAM: "Facebook / Instagram",
  PLATFORMA_LOCALA: "Platformă locală",
  RECOMANDARE: "Recomandare",
  TEREN: "Găsit pe teren",
  MANUAL: "Adăugat manual",
};

export const CONTACT_ROLE_LABEL: Record<ContactRole, string> = {
  PROPRIETAR: "Proprietar",
  ADMINISTRATOR: "Administrator",
  MANAGER: "Manager",
  RECEPTIE: "Recepție",
  CONTABIL: "Contabil",
  ALTUL: "Altul",
};

export const CHANNEL_LABEL: Record<ContactChannel, string> = {
  TELEFON: "Telefon",
  WHATSAPP: "WhatsApp",
  EMAIL: "Email",
  VIZITA: "Vizită",
};

export const ROLE_LABEL: Record<Role, string> = { ADMIN: "Admin", AGENT_VANZARI: "Agent vânzări" };

export const IMPORT_STATUS_LABEL: Record<ImportStatus, string> = {
  PREVIZUALIZARE: "Previzualizare",
  IN_CURS: "În curs",
  FINALIZAT: "Finalizat",
  ESUAT: "Eșuat",
  ANULAT: "Anulat",
};

export const IMPORT_ACTION_LABEL: Record<ImportRowAction, string> = {
  CREAT: "Nou",
  ACTUALIZAT: "Completat",
  NESCHIMBAT: "Neschimbat",
  IGNORAT: "Ignorat",
  EROARE: "Eroare",
};

export const AUDIT_LABEL: Record<AuditAction, string> = {
  CREARE: "a creat",
  ACTUALIZARE: "a modificat",
  STERGERE: "a arhivat",
  RESTAURARE: "a restaurat",
  SCHIMBARE_ETAPA: "a mutat în altă etapă",
  IMPORT: "a importat",
  EXPORT: "a exportat",
  OPT_OUT: "a schimbat „Nu mai contacta”",
  LOGIN: "s-a autentificat",
};

/** Etichete în română pentru câmpurile lead-ului (formular, audit, import). */
export const LEAD_FIELD_LABEL: Record<string, string> = {
  name: "Nume",
  category: "Categorie",
  type: "Tip",
  zone: "Zonă",
  address: "Adresă",
  latitude: "Latitudine",
  longitude: "Longitudine",
  phone: "Telefon",
  phoneNormalized: "Telefon",
  email: "Email",
  starsOsm: "Stele (OSM)",
  categoryMinistry: "Categorie (minister)",
  roomsCount: "Camere",
  placesCount: "Locuri",
  websiteStatus: "Status site",
  websiteUrl: "Site propriu",
  bookingUrl: "Booking",
  facebookUrl: "Facebook",
  instagramUrl: "Instagram",
  otherLinks: "Alte linkuri",
  googleMapsUrl: "Google Maps",
  osmUrl: "Link OSM",
  osmId: "ID OSM",
  ratingGoogle: "Rating Google",
  ratingBooking: "Rating Booking",
  operatorName: "Operator",
  operatorCui: "CUI operator",
  inMinistryList: "În lista ministerului",
  source: "Sursă",
  priority: "Prioritate",
  manualCheckNote: "Verificare manuală",
  notes: "Notițe",
  ownerId: "Responsabil",
  doNotContact: "Nu mai contacta",
  doNotContactReason: "Motiv opt-out",
  tags: "Etichete",
};

export const ZONES = Object.keys(ZONE_LABEL) as Zone[];
export const CATEGORIES = Object.keys(CATEGORY_LABEL) as LeadCategory[];
export const TYPES = Object.keys(TYPE_LABEL) as PropertyType[];
export const WEBSITE_STATUSES = Object.keys(WEBSITE_LABEL) as WebsiteStatus[];
export const PRIORITIES = Object.keys(PRIORITY_LABEL) as Priority[];
export const STAGES = Object.keys(STAGE_LABEL) as PipelineStage[];
export const SOURCES = Object.keys(SOURCE_LABEL) as LeadSource[];
export const CONTACT_ROLES = Object.keys(CONTACT_ROLE_LABEL) as ContactRole[];
export const CHANNELS = Object.keys(CHANNEL_LABEL) as ContactChannel[];
