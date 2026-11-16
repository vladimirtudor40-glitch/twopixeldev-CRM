/** Șabloanele de ofertă create la prima instalare (seed și programul de Windows). */
export const DEFAULT_OFFER_TEMPLATES = [
  {
    name: "Esențial",
    setupPrice: 1500,
    monthlyFee: 150,
    isDefault: false,
    description: "Site de prezentare simplu + buton „Rezervă acum”.",
    includedFeatures: [
      "Site de prezentare (până la 5 pagini)",
      "Motor de rezervări directe",
      "Sincronizare iCal cu Booking",
      "Domeniu .ro inclus în primul an",
    ],
  },
  {
    name: "Standard",
    setupPrice: 2500,
    monthlyFee: 250,
    isDefault: true,
    description: "Pachetul recomandat pentru pensiuni și vile.",
    includedFeatures: [
      "Site de prezentare complet, cu galerie și pagină pentru fiecare cameră",
      "Motor de rezervări directe",
      "Sincronizare iCal cu Booking și Airbnb",
      "Plată online cu cardul și card de vacanță",
      "Emailuri automate de confirmare",
      "Panou de administrare (PMS)",
    ],
  },
  {
    name: "Premium",
    setupPrice: 4000,
    monthlyFee: 400,
    isDefault: false,
    description: "Pentru hoteluri și unități mari.",
    includedFeatures: [
      "Tot din Standard",
      "Site multilingv (RO / EN)",
      "Tarife sezoniere și coduri de reducere",
      "SMS automate",
      "Rapoarte lunare și asistență prioritară",
    ],
  },
];
