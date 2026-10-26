import { AlertIcon } from "../icons";

/** Right column in sections mode before a page is ready: explanation, loading or error. */
export function SectionStatus({ status, message }: { status: "idle" | "loading" | "error"; message?: string }) {
  if (status === "loading") {
    return (
      <div role="status" className="mx-auto mt-16 flex max-w-sm flex-col items-center gap-3 text-center text-muted">
        <span className="size-7 animate-spin rounded-full border-2 border-line border-t-accent motion-reduce:animate-none" />
        <p className="font-medium text-ink">Pagina laden…</p>
        <p className="text-[13px]">Websnap scrolt de hele pagina door zodat alle afbeeldingen geladen zijn.</p>
      </div>
    );
  }
  if (status === "error") {
    return (
      <div
        role="alert"
        className="mx-auto mt-16 flex max-w-md items-start gap-3 rounded-lg border border-danger/25 bg-[#fdecea] px-4 py-3 text-danger"
      >
        <AlertIcon className="mt-px size-5 flex-none" />
        <p>{message}</p>
      </div>
    );
  }
  return (
    <div className="max-w-[760px]">
      <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.025em]">Secties uitknippen</h1>
      <p className="mt-3 max-w-[58ch] text-[15px] leading-relaxed text-muted">
        Vul een website in, kies een formaat en klik op <span className="font-medium text-ink">Pagina laden</span>. Je
        ziet dan de hele pagina: klik secties aan of sleep zelf een kader. Elk stuk wordt een losse PNG op de dichtheid
        van het formaat, precies zoals in de preview.
      </p>
    </div>
  );
}
