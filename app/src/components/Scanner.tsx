"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, CameraOff, ScanLine, Upload, CheckCircle2, AlertTriangle, RotateCcw, Save, Loader2, ZoomIn, X } from "lucide-react";
import type { PointResult } from "@/lib/scan/pipeline";
import { analyzeCanvas, drawWarped, frameToCanvas, pointRect, type Scanned, type PointInfo } from "@/lib/scan/client";
import { Card, CardHeader, Button, Badge, Select, EmptyState, buttonClass } from "./ui";

type Edit = { status: "earned" | "missed" | "review"; reasonId: number | null; other: boolean };
type Tone = "idle" | "ok" | "warn";
type HistoryItem = { key: string; student: string; test: string; page: number; pageCount: number; unresolved: number };

const keyOf = (s: Scanned) => `${s.studentId}|${s.testId}|${s.pageNumber}`;

export function Scanner() {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const work = useRef<HTMLCanvasElement | null>(null);
  const busy = useRef(false);
  const lastFp = useRef("");
  const stable = useRef(0);
  const lastSaved = useRef<string | null>(null);
  const needsClear = useRef(false);

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [camOn, setCamOn] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [auto, setAuto] = useState(true);
  const [status, setStatus] = useState<{ tone: Tone; text: string }>({ tone: "idle", text: "Start the camera, or upload a photo of a sheet." });
  const [current, setCurrent] = useState<Scanned | null>(null);
  const currentRef = useRef<Scanned | null>(null);
  const [edits, setEdits] = useState<Record<number, Edit>>({});
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [zoom, setZoom] = useState(false);

  useEffect(() => { currentRef.current = current; }, [current]);

  // ---- camera ----
  const stopCamera = useCallback(() => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
    setCamOn(false);
  }, []);

  const startCamera = useCallback(async (id?: string) => {
    setCamError(null);
    try {
      stream.current?.getTracks().forEach((t) => t.stop());
      const s = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: id ? { exact: id } : undefined, width: { ideal: 3840 }, height: { ideal: 2160 } },
      });
      stream.current = s;
      if (video.current) { video.current.srcObject = s; await video.current.play().catch(() => {}); }
      setCamOn(true);
      const all = await navigator.mediaDevices.enumerateDevices();
      setDevices(all.filter((d) => d.kind === "videoinput"));
      setDeviceId(s.getVideoTracks()[0]?.getSettings().deviceId ?? id ?? "");
      setStatus({ tone: "idle", text: "Waiting for a sheet…" });
    } catch (e) {
      setCamOn(false);
      setCamError(e instanceof Error ? e.message : "Couldn't open the camera.");
    }
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  // ---- result handling ----
  const commit = useCallback((s: Scanned) => {
    setCurrent(s);
    setEdits({});
    const review = s.results.filter((r) => r.status === "review").length;
    setStatus({ tone: review ? "warn" : "ok", text: review ? `Read ${s.studentName}'s sheet. ${review} point${review === 1 ? "" : "s"} need a quick look.` : `Read ${s.studentName}'s sheet. Everything looks clear.` });
  }, []);

  const runAnalysis = useCallback(async (canvas: HTMLCanvasElement, manual: boolean) => {
    const r = await analyzeCanvas(canvas);
    if (!r.ok) {
      if (r.error === "no-sheet") { needsClear.current = false; lastFp.current = ""; stable.current = 0; }
      if (manual || r.error !== "no-sheet") setStatus({ tone: manual ? "warn" : "idle", text: r.message });
      else setStatus({ tone: "idle", text: "Waiting for a sheet…" });
      return;
    }
    const s = r.scanned;
    if (manual) { commit(s); return; }
    if (needsClear.current && keyOf(s) === lastSaved.current) {
      setStatus({ tone: "ok", text: "That sheet is saved. Flip to the next page or swap in the next sheet." });
      return;
    }
    stable.current = s.fingerprint === lastFp.current ? stable.current + 1 : 1;
    lastFp.current = s.fingerprint;
    if (stable.current >= 2) { stable.current = 0; lastFp.current = ""; commit(s); }
    else setStatus({ tone: "idle", text: `Found ${s.studentName}'s sheet. Hold still…` });
  }, [commit]);

  const scanNow = useCallback(async () => {
    const v = video.current;
    if (!v || !v.videoWidth || busy.current) return;
    busy.current = true;
    try {
      work.current = frameToCanvas(v, v.videoWidth, v.videoHeight, work.current ?? undefined);
      await runAnalysis(work.current, true);
    } finally { busy.current = false; }
  }, [runAnalysis]);

  // Auto-scan loop.
  useEffect(() => {
    if (!camOn || !auto) return;
    const id = setInterval(async () => {
      const v = video.current;
      if (busy.current || currentRef.current || !v || !v.videoWidth) return;
      busy.current = true;
      try {
        work.current = frameToCanvas(v, v.videoWidth, v.videoHeight, work.current ?? undefined);
        await runAnalysis(work.current, false);
      } finally { busy.current = false; }
    }, 700);
    return () => clearInterval(id);
  }, [camOn, auto, runAnalysis]);

  const onUpload = async (file: File | undefined) => {
    if (!file) return;
    setStatus({ tone: "idle", text: "Reading photo…" });
    const bmp = await createImageBitmap(file);
    const canvas = frameToCanvas(bmp, bmp.width, bmp.height);
    await runAnalysis(canvas, true);
  };

  // ---- review state ----
  const full = useMemo(() => {
    if (!current) return null;
    const c = document.createElement("canvas");
    drawWarped(c, current, true);
    return c;
  }, [current]);
  const fullUrl = useMemo(() => full?.toDataURL("image/jpeg", 0.75) ?? null, [full]);

  const eff = (r: PointResult): Edit => edits[r.pointId] ?? { status: r.status, reasonId: r.reasonId, other: r.other };
  const results = current?.results ?? [];
  const unresolved = results.filter((r) => eff(r).status === "review").length;
  const earned = results.filter((r) => eff(r).status === "earned").length;
  const missed = results.filter((r) => eff(r).status === "missed").length;

  const save = async () => {
    if (!current) return;
    setSaving(true);
    try {
      const plain = document.createElement("canvas");
      drawWarped(plain, current, false);
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: current.studentId,
          testId: current.testId,
          page: current.pageNumber,
          image: plain.toDataURL("image/jpeg", 0.8),
          results: results.map((r) => {
            const e = eff(r);
            return { pointId: r.pointId, status: e.status === "review" ? "unknown" : e.status, reasonId: e.reasonId, other: e.other };
          }),
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Save failed");
      lastSaved.current = keyOf(current);
      needsClear.current = true;
      setHistory((h) => [
        { key: keyOf(current), student: current.studentName, test: current.testName, page: current.pageNumber, pageCount: current.pageCount, unresolved },
        ...h.filter((x) => x.key !== keyOf(current)),
      ]);
      setStatus({ tone: "ok", text: `Saved ${current.studentName}, page ${current.pageNumber}. Ready for the next sheet.` });
      setCurrent(null);
    } catch (e) {
      setStatus({ tone: "warn", text: e instanceof Error ? e.message : "Save failed" });
    } finally { setSaving(false); }
  };

  const discard = () => {
    needsClear.current = true;
    lastSaved.current = current ? keyOf(current) : null;
    setCurrent(null);
    setStatus({ tone: "idle", text: "Discarded. Waiting for a sheet…" });
  };

  const byQuestion = current ? Array.from(new Set(current.points.map((p) => p.question))) : [];

  return (
    <div className="grid gap-6 xl:grid-cols-[26rem_1fr]">
      {/* ---------------- left: camera + history ---------------- */}
      <div className="space-y-6">
        <Card>
          <CardHeader title="Camera" description="Lay the sheet flat with all four black corner squares in view." />
          <div className="p-5">
            <div className="relative aspect-video overflow-hidden rounded-lg bg-slate-900">
              <video ref={video} playsInline muted className="h-full w-full object-contain" />
              {!camOn && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <CameraOff className="size-8" />
                  <span className="text-sm">Camera is off</span>
                </div>
              )}
            </div>

            <div className={"mt-3 flex items-start gap-2 rounded-lg px-3 py-2 text-sm " + (status.tone === "ok" ? "bg-emerald-50 text-emerald-800" : status.tone === "warn" ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-600")}>
              {status.tone === "ok" ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : status.tone === "warn" ? <AlertTriangle className="mt-0.5 size-4 shrink-0" /> : <ScanLine className="mt-0.5 size-4 shrink-0" />}
              <span>{status.text}</span>
            </div>
            {camError && <p className="mt-2 text-xs text-red-600">{camError}</p>}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {camOn ? (
                <Button variant="secondary" onClick={stopCamera}><CameraOff className="size-4" /> Stop</Button>
              ) : (
                <Button onClick={() => startCamera(deviceId || undefined)}><Camera className="size-4" /> Start camera</Button>
              )}
              <Button variant="secondary" onClick={scanNow} disabled={!camOn}><ScanLine className="size-4" /> Scan now</Button>
              <label className={buttonClass("secondary") + " cursor-pointer"}>
                <Upload className="size-4" /> Upload photo
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { void onUpload(e.target.files?.[0]); e.target.value = ""; }} />
              </label>
            </div>

            {devices.length > 1 && (
              <Select className="mt-3" value={deviceId} onChange={(e) => { setDeviceId(e.target.value); void startCamera(e.target.value); }} aria-label="Camera">
                {devices.map((d, i) => <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${i + 1}`}</option>)}
              </Select>
            )}

            <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} className="size-4 accent-brand-600" />
              Auto-scan when a sheet is steady
            </label>
          </div>
        </Card>

        <Card>
          <CardHeader title="Scanned this session" actions={history.length ? <Badge tone="brand">{history.length}</Badge> : undefined} />
          {history.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-slate-500">Nothing saved yet.</p>
          ) : (
            <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
              {history.map((h) => (
                <li key={h.key} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-slate-800">{h.student}</span>
                    <span className="block truncate text-xs text-slate-500">{h.test} · page {h.page} of {h.pageCount}</span>
                  </span>
                  {h.unresolved > 0 && <Badge tone="amber">{h.unresolved} unresolved</Badge>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* ---------------- right: review ---------------- */}
      <div>
        {!current ? (
          <Card>
            <EmptyState
              icon={ScanLine}
              title="Ready to scan"
              description="Each sheet is matched to its student and test by the QR code. Results appear here for a quick check before saving."
            />
          </Card>
        ) : (
          <Card>
            <div className="flex flex-wrap items-center gap-4 border-b border-slate-100 px-5 py-4">
              {fullUrl && (
                <button onClick={() => setZoom(true)} className="group relative shrink-0 overflow-hidden rounded-lg border border-slate-200" aria-label="View scan">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={fullUrl} alt="Scanned sheet" className="h-24 w-auto" />
                  <span className="absolute inset-0 flex items-center justify-center bg-slate-900/0 text-white opacity-0 transition group-hover:bg-slate-900/40 group-hover:opacity-100"><ZoomIn className="size-5" /></span>
                </button>
              )}
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-lg font-semibold text-slate-900">{current.studentName}</h2>
                <p className="text-sm text-slate-500">{current.period} · {current.testName} · page {current.pageNumber} of {current.pageCount}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge tone="green">{earned} earned</Badge>
                  <Badge tone="brand">{missed} missed</Badge>
                  {unresolved > 0 ? <Badge tone="amber">{unresolved} need review</Badge> : <Badge tone="green">All clear</Badge>}
                </div>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {byQuestion.map((q) => (
                <div key={q}>
                  <div className="bg-slate-50 px-5 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Question {q}</div>
                  {current.points.filter((p) => p.question === q).map((p) => {
                    const auto = results.find((r) => r.pointId === p.id);
                    if (!auto) return null;
                    return (
                      <PointRow
                        key={p.id}
                        info={p}
                        auto={auto}
                        value={eff(auto)}
                        edited={!!edits[p.id]}
                        scanned={current}
                        full={full}
                        onChange={(e) => setEdits((prev) => ({ ...prev, [p.id]: e }))}
                      />
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 bg-slate-50/60 px-5 py-4">
              <Button onClick={save} disabled={saving || unresolved > 0}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save sheet
              </Button>
              {unresolved > 0 && (
                <Button variant="secondary" onClick={save} disabled={saving}>Save, leave {unresolved} unresolved</Button>
              )}
              <Button variant="ghost" onClick={discard} disabled={saving}><RotateCcw className="size-4" /> Discard & rescan</Button>
              {unresolved > 0 && <span className="text-xs text-slate-500">Unresolved points are saved as &quot;unknown&quot; and left out of results.</span>}
            </div>
          </Card>
        )}
      </div>

      {zoom && fullUrl && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-slate-900/70 p-6" onClick={() => setZoom(false)}>
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setZoom(false)} className="absolute -right-3 -top-3 rounded-full bg-white p-1.5 shadow" aria-label="Close"><X className="size-4" /></button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={fullUrl} alt="Scanned sheet, full size" className="max-w-[min(900px,90vw)] rounded-lg bg-white shadow-2xl" />
          </div>
        </div>
      )}
    </div>
  );
}

function PointRow({
  info, auto, value, edited, scanned, full, onChange,
}: { info: PointInfo; auto: PointResult; value: Edit; edited: boolean; scanned: Scanned; full: HTMLCanvasElement | null; onChange: (e: Edit) => void }) {
  const needsLook = value.status === "review";
  const [open, setOpen] = useState(false);
  const show = needsLook || open;
  const reasonText = value.status === "missed"
    ? value.other ? "Other" : value.reasonId != null ? info.reasons.find((r) => r.id === value.reasonId)?.text ?? "" : "no reason chosen"
    : "";
  const selected = value.other ? "other" : value.reasonId != null ? `r:${value.reasonId}` : "none";

  return (
    <div className={"px-5 py-3 " + (needsLook ? "bg-amber-50/50" : "")}>
      <div className="flex flex-wrap items-center gap-3">
        <Badge>{info.tag}</Badge>
        <span className="min-w-0 flex-1 truncate text-sm text-slate-600">{info.description || (info.topic ? info.topic.title : "")}</span>
        {info.topic && <Badge tone="brand">{info.topic.code}</Badge>}
        {value.status === "earned" && <Badge tone="green">Earned</Badge>}
        {value.status === "missed" && <Badge tone="brand">Missed{reasonText ? `: ${reasonText}` : ""}</Badge>}
        {value.status === "review" && <Badge tone="amber">Needs review</Badge>}
        {!needsLook && <button onClick={() => setOpen(!open)} className="text-xs font-medium text-brand-600 hover:underline">{open ? "Close" : edited ? "Edited" : "Change"}</button>}
      </div>
      {auto.note && !edited && <p className="mt-1 text-xs text-amber-700">{auto.note}</p>}

      {show && (
        <div className="mt-3 space-y-3">
          <Crop scanned={scanned} full={full} pointId={info.id} />
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex overflow-hidden rounded-lg border border-slate-300 text-sm">
              <button
                onClick={() => onChange({ status: "earned", reasonId: null, other: false })}
                className={"px-3 py-1.5 font-medium " + (value.status === "earned" ? "bg-emerald-600 text-white" : "bg-white text-slate-700 hover:bg-slate-50")}
              >Earned</button>
              <button
                onClick={() => onChange({ status: "missed", reasonId: value.reasonId, other: value.other })}
                className={"border-l border-slate-300 px-3 py-1.5 font-medium " + (value.status === "missed" ? "bg-brand-600 text-white" : "bg-white text-slate-700 hover:bg-slate-50")}
              >Missed</button>
            </div>
            {value.status === "missed" && (
              <Select
                value={selected}
                onChange={(e) => {
                  const v = e.target.value;
                  onChange({ status: "missed", reasonId: v.startsWith("r:") ? Number(v.slice(2)) : null, other: v === "other" });
                }}
                className="max-w-80 py-1.5"
                aria-label="Reason"
              >
                <option value="none">No reason chosen</option>
                {info.reasons.map((r) => <option key={r.id} value={`r:${r.id}`}>{r.text}</option>)}
                <option value="other">Other</option>
              </Select>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** A zoomed look at exactly the part of the scan that belongs to one point. */
function Crop({ scanned, full, pointId }: { scanned: Scanned; full: HTMLCanvasElement | null; pointId: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current, r = pointRect(scanned, pointId);
    if (!c || !full || !r) return;
    c.width = Math.round(r.w);
    c.height = Math.round(r.h);
    c.getContext("2d")!.drawImage(full, r.x, r.y, r.w, r.h, 0, 0, c.width, c.height);
  }, [scanned, full, pointId]);
  return <canvas ref={ref} className="w-full max-w-xl rounded-md border border-slate-200 bg-white" />;
}
