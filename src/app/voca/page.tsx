"use client";

import Link from "next/link";
import { useState } from "react";
import { PhoneShell } from "@/components/ui/PhoneShell";
import { storage } from "@/lib/storage";
import { useAsync } from "@/lib/useAsync";
import type { VocabularyItem } from "@/lib/types";

export default function VocabularyPage() {
  const vocabularyState = useAsync(() => storage.getVocabulary(), []);
  const [changed, setChanged] = useState<Record<string, VocabularyItem>>({});
  const [removed, setRemoved] = useState<string[]>([]);
  const items = vocabularyState.status === "ready"
    ? vocabularyState.data.map((item) => changed[item.id] ?? item).filter((item) => !removed.includes(item.id))
    : [];
  const pending = items.filter((item) => !item.reviewed);
  const reviewed = items.filter((item) => item.reviewed);

  async function toggleReviewed(item: VocabularyItem) {
    const next = { ...item, reviewed: !item.reviewed };
    setChanged((current) => ({ ...current, [item.id]: next }));
    try {
      await storage.updateVocabulary(next);
    } catch {
      setChanged((current) => ({ ...current, [item.id]: item }));
    }
  }

  async function remove(item: VocabularyItem) {
    setRemoved((current) => [...current, item.id]);
    try {
      await storage.deleteVocabulary(item.id);
    } catch {
      setRemoved((current) => current.filter((id) => id !== item.id));
    }
  }

  return (
    <PhoneShell tone="paper">
      <div className="flex flex-1 flex-col overflow-y-auto px-6 py-8">
        <div className="mb-7 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-paper-900">내 Voca</h1>
            <p className="mt-1 text-sm text-paper-600">내가 실제로 말한 문장의 더 자연스러운 대안이에요.</p>
          </div>
          <Link href="/" className="text-sm text-paper-600">닫기</Link>
        </div>

        {vocabularyState.status === "error" ? (
          <p className="py-12 text-center text-sm text-paper-600">단어장을 불러오지 못했어요.</p>
        ) : vocabularyState.status === "loading" ? null : items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <div className="text-4xl">📚</div>
            <p className="mt-4 text-sm font-semibold text-paper-900">아직 저장된 Voca가 없어요</p>
            <p className="mt-1 max-w-[26ch] text-xs text-paper-600">통화 중 교정된 문장이 여기 자동으로 쌓여요.</p>
            <Link href="/call" className="mt-5 rounded-full bg-paper-900 px-5 py-2.5 text-sm font-semibold text-paper-0">
              통화 시작하기
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-7">
            <VocabularySection title={`복습할 표현 ${pending.length}`} items={pending} onToggle={toggleReviewed} onDelete={remove} />
            {reviewed.length > 0 && (
              <VocabularySection title={`복습 완료 ${reviewed.length}`} items={reviewed} onToggle={toggleReviewed} onDelete={remove} />
            )}
          </div>
        )}
      </div>
    </PhoneShell>
  );
}

function VocabularySection({ title, items, onToggle, onDelete }: { title: string; items: VocabularyItem[]; onToggle: (item: VocabularyItem) => void; onDelete: (item: VocabularyItem) => void }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-paper-900">{title}</h2>
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <article key={item.id} className="rounded-2xl border border-paper-200 bg-paper-0 p-4">
            <div className="text-xs text-paper-600 line-through">내 문장 · {item.original}</div>
            <div className="mt-1 text-base font-semibold text-paper-900">{item.replacement}</div>
            <p className="mt-2 text-xs text-paper-600">{item.meaningKo}</p>
            {item.reason && <p className="mt-1 text-xs text-paper-600">{item.reason}</p>}
            <div className="mt-4 flex items-center justify-between">
              <Link href={`/reports/${item.reportId}`} className="text-xs font-medium text-paper-600 underline">통화 보기</Link>
              <div className="flex gap-2">
                <button onClick={() => onDelete(item)} className="rounded-full px-3 py-1.5 text-xs text-paper-600">삭제</button>
                <button onClick={() => onToggle(item)} className="rounded-full bg-paper-900 px-3 py-1.5 text-xs font-medium text-paper-0">
                  {item.reviewed ? "다시 복습" : "복습 완료"}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
