import { describe, expect, it } from "vitest";
import { encodePassword, normalizeDatabaseUrl } from "../desktop/src/db-setup";

const HOST = "aws-0-eu-west-1.pooler.supabase.com:5432/postgres";

describe("adresa bazei de date (programul de Windows)", () => {
  it("codează parolele cu caractere speciale", () => {
    const url = new URL(normalizeDatabaseUrl(`postgresql://postgres.abc:Par#ola@1/x?@${HOST}`));
    expect(url.hostname).toBe("aws-0-eu-west-1.pooler.supabase.com");
    expect(url.username).toBe("postgres.abc");
    expect(decodeURIComponent(url.password)).toBe("Par#ola@1/x?");
    expect(url.port).toBe("5432");
    expect(url.pathname).toBe("/postgres");
  });

  it("nu codează de două ori o parolă deja codată", () => {
    expect(encodePassword(`postgresql://u:a%40b@${HOST}`)).toBe(`postgresql://u:a%40b@${HOST}`);
  });

  it("adaugă sslmode=require pentru Supabase și pgbouncer pentru portul 6543", () => {
    const session = new URL(normalizeDatabaseUrl(`postgresql://u:parola@${HOST}`));
    expect(session.searchParams.get("sslmode")).toBe("require");
    expect(session.searchParams.get("pgbouncer")).toBeNull();
    const tx = new URL(normalizeDatabaseUrl("postgresql://u:parola@aws-0-eu-west-1.pooler.supabase.com:6543/postgres"));
    expect(tx.searchParams.get("pgbouncer")).toBe("true");
  });

  it("refuză adresa cu [YOUR-PASSWORD] sau fără parolă", () => {
    expect(() => normalizeDatabaseUrl(`postgresql://u:[YOUR-PASSWORD]@${HOST}`)).toThrow(/YOUR-PASSWORD/);
    expect(() => normalizeDatabaseUrl(`postgresql://u@${HOST}`)).toThrow(/parola/);
  });
});
