import { normalizePhone } from "./normalize";

export function telLink(phone: string | null | undefined): string | null {
  const p = normalizePhone(phone);
  return p ? `tel:${p}` : null;
}

/** wa.me cere numărul internațional fără „+”: 0722… -> 40722… */
export function whatsappLink(phone: string | null | undefined): string | null {
  const p = normalizePhone(phone);
  if (!p) return null;
  const intl = p.startsWith("0") ? `40${p.slice(1)}` : p;
  return `https://wa.me/${intl}`;
}

export function mailLink(email: string | null | undefined): string | null {
  return email ? `mailto:${email}` : null;
}

export function mapsLink(lead: {
  name: string; address?: string | null; zoneLabel?: string;
  latitude?: number | null; longitude?: number | null; googleMapsUrl?: string | null;
}): string {
  if (lead.googleMapsUrl) return lead.googleMapsUrl;
  const q = [lead.name, lead.address, lead.zoneLabel].filter(Boolean).join(" ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}
