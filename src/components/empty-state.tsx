"use client";

import Image from "next/image";
import { fileUrl } from "@/lib/file-url";
import type { SessionSummary } from "@/lib/types";

const FEATURES = [
  { value: "2880 × 1800", title: "MacBook-mockup", text: "Desktop op 2x, scherp in elke MacBook-template." },
  { value: "1179 × 2556", title: "iPhone-mockup", text: "Ook met UI blijft het eindformaat gelijk." },
  { value: "geen pop-ups", title: "Schoon beeld", text: "Cookiebanners en chatwidgets worden verborgen." },
];

const dateFormat = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function EmptyState({
  sessions,
  onOpen,
}: {
  sessions: SessionSummary[];
  onOpen: (session: SessionSummary) => void;
}) {
  return (
    <div className="max-w-[760px]">
      <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.025em]">
        Schone screenshots voor je mockups
      </h1>
      <p className="mt-3 max-w-[58ch] text-[15px] leading-relaxed text-muted">
        Vul een website in, kies formaten en browser-UI, en Websnap maakt PNG&apos;s die precies in je Photoshop-mockups
        passen. Alles wordt op deze Mac bewaard.
      </p>

      <div className="mt-7 grid gap-3 sm:grid-cols-3">
        {FEATURES.map((feature) => (
          <div key={feature.title} className="rounded-xl border border-line bg-surface p-4">
            <p className="font-mono text-[13px] text-accent">{feature.value}</p>
            <p className="mt-2 font-semibold">{feature.title}</p>
            <p className="mt-1 text-[13px] text-muted">{feature.text}</p>
          </div>
        ))}
      </div>

      {sessions.length > 0 && (
        <section aria-labelledby="sessions-label" className="mt-10">
          <h2 id="sessions-label" className="text-[15px] font-semibold">
            Eerdere sessies
          </h2>
          <ul className="mt-3 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {sessions.map((session) => {
              const thumb = session.files.find((file) => file.width > file.height) ?? session.files[0];
              return (
                <li key={session.path}>
                  <button
                    type="button"
                    onClick={() => onOpen(session)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-soft"
                  >
                    <span className="h-[45px] w-[72px] flex-none overflow-hidden rounded-md border border-line bg-soft">
                      <Image
                        src={fileUrl(thumb.path)}
                        alt=""
                        width={72}
                        height={45}
                        unoptimized
                        className="h-full w-full object-cover object-top"
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{session.site}</span>
                      <span className="block text-[13px] text-muted">
                        {session.files.length} {session.files.length === 1 ? "screenshot" : "screenshots"}
                      </span>
                    </span>
                    <span className="flex-none font-mono text-xs text-muted">
                      {dateFormat.format(new Date(session.createdAt))}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
