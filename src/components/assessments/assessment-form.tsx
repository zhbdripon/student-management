"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Module {
  id: string;
  title: string;
  code: string;
  programme?: { id: string; name: string } | null;
}

interface Programme {
  id: string;
  name: string;
}

interface AssessmentFormProps {
  modules: Module[];
  programmes: Programme[];
}

export function AssessmentForm({ modules, programmes }: AssessmentFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [selectedProgrammeId, setSelectedProgrammeId] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [deadline, setDeadline] = useState("");

  const [moduleList] = useState<Module[]>(modules);

  // Modules filtered by selected programme (unlinked modules always visible)
  const filteredModules = selectedProgrammeId
    ? moduleList.filter((m) => !m.programme || m.programme.id === selectedProgrammeId)
    : moduleList;

  function handleProgrammeChange(id: string) {
    setSelectedProgrammeId(id);
    // Clear module if it no longer belongs to the new programme filter
    if (moduleId) {
      const current = moduleList.find((m) => m.id === moduleId);
      if (current && id && current.programme && current.programme.id !== id) {
        setModuleId("");
      }
    }
    clearFieldError("moduleId");
  }

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function clearFieldError(field: string) {
    setErrors((e) => { const n = { ...e }; delete n[field]; return n; });
    setGlobalError(null);
  }

  function validate() {
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = "Title is required";
    if (!moduleId) next.moduleId = "Module is required";
    if (!deadline) next.deadline = "Deadline is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setGlobalError(null);
    try {
      const res = await fetch("/api/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), moduleId, deadline }),
      });
      const json = await res.json();
      if (!res.ok) {
        setGlobalError(json.error ?? "Failed to create assessment");
        return;
      }
      router.push(`/dashboard/assessments/${json.assessment.id}`);
      router.refresh();
    } catch {
      setGlobalError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass = "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder-zinc-500";
  const errorInputClass = "w-full rounded-lg border border-red-400 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 dark:border-red-600 dark:bg-zinc-900 dark:text-zinc-50";
  const labelClass = "block text-sm font-medium text-zinc-700 dark:text-zinc-300";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {globalError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {globalError}
        </div>
      )}

      {/* Title */}
      <div className="space-y-1.5">
        <label htmlFor="title" className={labelClass}>
          Assessment title <span className="text-red-500">*</span>
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => { setTitle(e.target.value); clearFieldError("title"); }}
          placeholder="e.g. Final Project Report"
          className={errors.title ? errorInputClass : inputClass}
        />
        {errors.title && <p className="text-xs text-red-600 dark:text-red-400">{errors.title}</p>}
      </div>

      {/* Programme filter */}
      <div className="space-y-1.5">
        <label htmlFor="programmeFilter" className={labelClass}>
          Programme <span className="text-zinc-400 font-normal">(filters modules)</span>
        </label>
        <select
          id="programmeFilter"
          value={selectedProgrammeId}
          onChange={(e) => handleProgrammeChange(e.target.value)}
          className={inputClass}
        >
          <option value="">All programmes</option>
          {programmes.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Module */}
      <div className="space-y-1.5">
        <label htmlFor="moduleId" className={labelClass}>
          Module <span className="text-red-500">*</span>
        </label>
        <select
              id="moduleId"
              value={moduleId}
              onChange={(e) => { setModuleId(e.target.value); clearFieldError("moduleId"); }}
              className={errors.moduleId ? errorInputClass : inputClass}
            >
              <option value="">Select a module…</option>
              {filteredModules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.code} — {m.title}{m.programme ? ` (${m.programme.name})` : ""}
                </option>
              ))}
            </select>
        {errors.moduleId && <p className="text-xs text-red-600 dark:text-red-400">{errors.moduleId}</p>}
      </div>

      {/* Deadline */}
      <div className="space-y-1.5">
        <label htmlFor="deadline" className={labelClass}>
          Submission deadline <span className="text-red-500">*</span>
        </label>
        <input
          id="deadline"
          type="datetime-local"
          value={deadline}
          onChange={(e) => { setDeadline(e.target.value); clearFieldError("deadline"); }}
          className={errors.deadline ? errorInputClass : inputClass}
        />
        {errors.deadline && <p className="text-xs text-red-600 dark:text-red-400">{errors.deadline}</p>}
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          Late submissions are accepted but will be flagged.
        </p>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-zinc-900 px-6 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {loading ? "Creating…" : "Create assessment"}
        </button>
      </div>
    </form>
  );
}
