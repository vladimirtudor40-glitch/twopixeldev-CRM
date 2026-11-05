import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-[60dvh] place-items-center px-4 text-center">
      <div>
        <h1 className="font-display text-2xl font-extrabold">Pagina nu există</h1>
        <p className="mt-1 text-sm text-ink-muted">Poate lead-ul a fost arhivat sau linkul e greșit.</p>
        <Link href="/leaduri" className="mt-4 inline-block text-teal-hi underline">Înapoi la lead-uri</Link>
      </div>
    </main>
  );
}
