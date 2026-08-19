"use client";

import Link from "next/link";
import { useState } from "react";
import { PhoneShell } from "@/components/ui/PhoneShell";
import { storage } from "@/lib/storage";
import { archive } from "@/lib/archive";
import { useAsync } from "@/lib/useAsync";

/**
 * SCREEN 03 — report list. Paper (white) tone, unlike most of the app.
 * Tabs: "통화" (call reports) / "보관" (archive of bookmarked expressions &
 * sentences, backed by src/lib/archive.ts's server-backed helpers).
 */
export default function ReportsPage() {
  const [tab, setTab] = useState<"calls" | "archive">("calls");
  const [archiveTab, setArchiveTab] = useState<"expressions" | "sentences">("expressions");
  const reportsState = useAsync(() => storage.getReports(), []);
  const expressionsState = useAsync(() => archive.getExpressions(), []);
  const sentencesState = useAsync(() => archive.getSentences(), []);

  const reports = reportsState.status === "ready" ? reportsState.data : null;
  const bookmarkedExpressions = expressionsState.status === "ready" ? expressionsState.data : null;
  const bookmarkedSentences = sentencesState.status === "ready" ? sentencesState.data : null;

  const reportsError = reportsState.status === "error";
  const expressionsError = expressionsState.status === "error";
  const sentencesError = sentencesState.status === "error";

  return (
    <PhoneShell tone="paper">
      <div className="flex flex-1 flex-col overflow-y-auto px-6 py-8">
        <h1 className="mb-6 text-2xl font-bold text-paper-900">리포트</h1>

        {/* main tabs */}
        <div className="mb-6 flex gap-2">
          <TabButton active={tab === "calls"} onClick={() => setTab("calls")}>
            통화
          </TabButton>
          <TabButton active={tab === "archive"} onClick={() => setTab("archive")}>
            보관
          </TabButton>
        </div>

        {tab === "calls" ? (
          reportsError ? (
            <p className="py-8 text-center text-sm text-paper-600">불러오지 못했어요.</p>
          ) : reports === null ? null : reports.length === 0 ? (
            <EmptyState
              icon={<DocumentIcon />}
              title="아직 통화 리포트가 없어요"
              subtitle="꾸준히 통화하면서 리포트를 차곡차곡 쌓아보세요"
            />
          ) : (
            <div className="flex flex-col gap-3">
              {reports.map((r) => (
                <Link
                  key={r.id}
                  href={`/reports/${r.id}`}
                  className="rounded-2xl border border-paper-200 bg-paper-0 p-4 transition hover:border-paper-600"
                >
                  <p className="mb-1 text-base font-semibold text-paper-900">{r.title}</p>
                  <div className="flex items-center gap-3 text-xs text-paper-600">
                    <span>{formatDate(r.createdAt)}</span>
                    <span>·</span>
                    <span>🔥 {r.wordCount} 단어</span>
                  </div>
                </Link>
              ))}
            </div>
          )
        ) : (
          <>
            <div className="mb-6 flex gap-2">
              <TabButton
                small
                active={archiveTab === "expressions"}
                onClick={() => setArchiveTab("expressions")}
              >
                표현
              </TabButton>
              <TabButton
                small
                active={archiveTab === "sentences"}
                onClick={() => setArchiveTab("sentences")}
              >
                문장
              </TabButton>
            </div>
            {archiveTab === "expressions" ? (
              expressionsError ? (
                <p className="py-8 text-center text-sm text-paper-600">불러오지 못했어요.</p>
              ) : bookmarkedExpressions === null ? null : bookmarkedExpressions.length === 0 ? (
                <EmptyState
                  icon={<FolderIcon />}
                  title="아직 저장한 표현이 없어요"
                  subtitle="리포트에서 마음에 드는 표현을 저장해보세요"
                />
              ) : (
                <div className="flex flex-col gap-3">
                  {bookmarkedExpressions.map((e) => (
                    <Link
                      key={e.id}
                      href={`/reports/${e.reportId}`}
                      className="rounded-2xl border border-paper-200 bg-paper-0 p-4 transition hover:border-paper-600"
                    >
                      <p className="mb-1 text-base font-semibold text-paper-900">{e.phrase}</p>
                      <p className="text-xs text-paper-600">{e.meaningKo}</p>
                    </Link>
                  ))}
                </div>
              )
            ) : sentencesError ? (
              <p className="py-8 text-center text-sm text-paper-600">불러오지 못했어요.</p>
            ) : bookmarkedSentences === null ? null : bookmarkedSentences.length === 0 ? (
              <EmptyState
                icon={<FolderIcon />}
                title="아직 저장한 문장이 없어요"
                subtitle="리포트에서 마음에 드는 문장을 저장해보세요"
              />
            ) : (
              <div className="flex flex-col gap-3">
                {bookmarkedSentences.map((s) => (
                  <Link
                    key={s.id}
                    href={`/reports/${s.reportId}`}
                    className="rounded-2xl border border-paper-200 bg-paper-0 p-4 transition hover:border-paper-600"
                  >
                    <p className="mb-1 text-sm font-medium text-paper-900">{s.textEn}</p>
                    {s.textKo && <p className="text-xs text-paper-600">{s.textKo}</p>}
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </PhoneShell>
  );
}

function TabButton({
  active,
  onClick,
  children,
  small,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  small?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full font-medium transition ${
        small ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"
      } ${
        active
          ? "bg-paper-900 text-paper-0"
          : "bg-paper-100 text-paper-600 hover:bg-paper-200"
      }`}
    >
      {children}
    </button>
  );
}

function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 text-paper-200">{icon}</div>
      <p className="mb-1 text-sm font-semibold text-paper-900">{title}</p>
      <p className="max-w-[24ch] text-xs text-paper-600">{subtitle}</p>
    </div>
  );
}

function DocumentIcon() {
  return (
    <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 2h9l5 5v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8M8 17h5" strokeLinecap="round" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6Z" />
    </svg>
  );
}

function formatDate(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate()
  ).padStart(2, "0")}`;
}
