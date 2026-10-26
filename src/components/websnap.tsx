"use client";

import { useState } from "react";
import { useCaptureRun } from "@/hooks/use-capture-run";
import { useInspection } from "@/hooks/use-inspection";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { useSessions } from "@/hooks/use-sessions";
import { revealPath } from "@/lib/client-actions";
import { folderOf } from "@/lib/file-url";
import { groupRun, groupSession } from "@/lib/result-groups";
import { DEFAULT_SETTINGS, SETTINGS_KEY, toCaptureRequest, toInspectRequest } from "@/lib/settings";
import { parseUrlList } from "@/lib/url";
import type { SessionSummary } from "@/lib/types";
import { AppHeader } from "./app-header";
import { CaptureForm } from "./capture-form/capture-form";
import { EmptyState } from "./empty-state";
import { ResultsView } from "./results/results-view";
import { SelectionBar } from "./results/selection-bar";
import { SectionPicker } from "./sections/section-picker";
import { SectionStatus } from "./sections/section-status";

export function Websnap() {
  const [settings, setSettings] = usePersistentState(SETTINGS_KEY, DEFAULT_SETTINGS);
  const [urls, setUrls] = useState("");
  const { run, start, reset } = useCaptureRun();
  const { outputDir, sessions, refresh } = useSessions();
  const [openSession, setOpenSession] = useState<SessionSummary | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const inspection = useInspection();
  const sectionsMode = settings.mode === "sections";

  const submit = () => {
    setOpenSession(null);
    setSelected(new Set());
    if (sectionsMode) void inspection.load(toInspectRequest(parseUrlList(urls)[0], settings));
    else void start(toCaptureRequest(urls, settings)).then(refresh);
  };
  const open = (session: SessionSummary) => {
    setOpenSession(session);
    setSelected(new Set());
  };
  const back = () => {
    setOpenSession(null);
    setSelected(new Set());
    if (!sectionsMode) reset();
    refresh();
  };
  const cropped = (session: SessionSummary) => {
    open(session);
    refresh();
  };
  const toggle = (path: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (!next.delete(path)) next.add(path);
      return next;
    });

  const runSites = groupRun(run);
  const firstShot = Object.values(run.results).find((result) => result.status === "done");
  const currentFolder =
    openSession?.path ?? run.sessionPaths[0] ?? (firstShot?.status === "done" ? folderOf(firstShot.file.path) : ".");

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader outputDir={outputDir} onReveal={() => revealPath(currentFolder).catch(() => revealPath("."))} />
      <div className="flex flex-1 flex-wrap">
        <aside className="flex min-w-0 flex-[1_1_340px] flex-col border-line bg-surface md:max-w-[400px] md:border-r">
          <CaptureForm
            urls={urls}
            onUrlsChange={setUrls}
            settings={settings}
            onSettingsChange={setSettings}
            busy={sectionsMode ? inspection.state.status === "loading" : run.status === "running"}
            onSubmit={submit}
          />
        </aside>
        <main className="min-w-0 flex-[999_1_560px] px-6 pt-6 pb-32 md:px-7">
          {openSession ? (
            <ResultsView
              title={openSession.site}
              startedAt={openSession.createdAt}
              sites={groupSession(openSession)}
              running={false}
              error={null}
              selected={selected}
              onToggle={toggle}
              onBack={back}
              backLabel={sectionsMode ? "Terug naar secties" : "Overzicht"}
            />
          ) : sectionsMode ? (
            inspection.state.status === "ready" ? (
              <SectionPicker
                key={inspection.state.inspection.id}
                inspection={inspection.state.inspection}
                picks={inspection.picks}
                onPicksChange={inspection.setPicks}
                onCropped={cropped}
                uiVariants={settings.sectionUiVariants}
                theme={settings.theme}
              />
            ) : (
              <SectionStatus
                status={inspection.state.status}
                message={inspection.state.status === "error" ? inspection.state.message : undefined}
              />
            )
          ) : run.status !== "idle" ? (
            <ResultsView
              title={
                runSites.length === 1 ? runSites[0].host : runSites.length ? `${runSites.length} sites` : "Screenshots"
              }
              startedAt={run.startedAt}
              sites={runSites}
              running={run.status === "running"}
              error={run.error}
              selected={selected}
              onToggle={toggle}
              onBack={run.status === "done" ? back : undefined}
            />
          ) : (
            <EmptyState sessions={sessions} onOpen={open} />
          )}
        </main>
      </div>
      <SelectionBar paths={[...selected]} onClear={() => setSelected(new Set())} />
    </div>
  );
}
