"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";

export default function ExportToolsPage() {
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [collections, setCollections] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "proportion">("all");
  
  // Selection state for full or proportioned export
  const [selectedCols, setSelectedCols] = useState<Record<string, boolean>>({});
  const [proportions, setProportions] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/tools/export");
      const data = await res.json();
      if (data.success) {
        setStats(data.stats || {});
        setCollections(data.collections || []);
        
        const initSelected: Record<string, boolean> = {};
        const initProp: Record<string, number> = {};
        (data.collections || []).forEach((col: string) => {
          initSelected[col] = true;
          initProp[col] = data.stats[col] || 100;
        });
        setSelectedCols(initSelected);
        setProportions(initProp);
      }
    } catch (err) {
      console.error("Failed to load export stats:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportAll = async () => {
    setExporting(true);
    try {
      const selected = Object.keys(selectedCols).filter((k) => selectedCols[k]);
      const res = await fetch("/api/admin/tools/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "all",
          selectedCollections: selected,
        }),
      });

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cms-full-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert("Failed to download export file");
    } finally {
      setExporting(false);
    }
  };

  const handleExportProportion = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/admin/tools/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "proportion",
          proportions: proportions,
        }),
      });

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cms-proportion-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert("Failed to download proportion export file");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="container space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Icon icon="solar:export-bold" className="text-emerald-500" width={28} />
            Export Data Tools
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Export the entire database or export specific collections in type proportion.
          </p>
        </div>

        <button
          onClick={fetchStats}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <Icon icon="solar:restart-bold" className={loading ? "animate-spin" : ""} width={18} />
          Refresh Stats
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 gap-4">
        <button
          onClick={() => setActiveTab("all")}
          className={`pb-3 px-2 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "all"
              ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          }`}
        >
          <Icon icon="solar:database-bold" width={18} />
          Full Data Export
        </button>
        <button
          onClick={() => setActiveTab("proportion")}
          className={`pb-3 px-2 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "proportion"
              ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          }`}
        >
          <Icon icon="solar:pie-chart-2-bold" width={18} />
          Type Proportion Export
        </button>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="p-12 text-center text-zinc-500 flex flex-col items-center gap-3">
          <Icon icon="solar:restart-bold" className="animate-spin text-emerald-500" width={32} />
          <span>Analyzing database collections...</span>
        </div>
      ) : activeTab === "all" ? (
        /* Full Export Tab */
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Select Collections to Include
              </h2>
              <span className="text-xs text-zinc-400">
                {Object.values(selectedCols).filter(Boolean).length} of {collections.length} selected
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {collections.map((col) => (
                <label
                  key={col}
                  className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    selectedCols[col]
                      ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20"
                      : "border-zinc-200 dark:border-zinc-800 opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={!!selectedCols[col]}
                      onChange={(e) =>
                        setSelectedCols({ ...selectedCols, [col]: e.target.checked })
                      }
                      className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <div className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
                        {col}
                      </div>
                      <div className="text-xs text-zinc-400">
                        {stats[col] || 0} records
                      </div>
                    </div>
                  </div>
                  <Icon icon="solar:folder-bold" className="text-zinc-400" width={20} />
                </label>
              ))}
            </div>

            <div className="pt-4 flex justify-end">
              <button
                onClick={handleExportAll}
                disabled={exporting}
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-xl transition-all shadow-md disabled:opacity-50"
              >
                <Icon icon="solar:download-minimalistic-bold" width={20} />
                {exporting ? "Generating Dump File..." : "Export Entire Data Page"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Type Proportion Tab */
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Configure Type Proportions
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Specify maximum records per collection or type to export in custom proportions.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {collections.map((col) => (
                <div
                  key={col}
                  className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4"
                >
                  <div>
                    <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                      {col}
                    </div>
                    <div className="text-xs text-zinc-400">
                      Total database records: {stats[col] || 0}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs text-zinc-500">Limit:</label>
                    <input
                      type="number"
                      min={0}
                      max={stats[col] || 9999}
                      value={proportions[col] ?? (stats[col] || 0)}
                      onChange={(e) =>
                        setProportions({
                          ...proportions,
                          [col]: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-24 px-3 py-1.5 text-sm border rounded-lg border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 text-right focus:ring-emerald-500"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 flex justify-end">
              <button
                onClick={handleExportProportion}
                disabled={exporting}
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-xl transition-all shadow-md disabled:opacity-50"
              >
                <Icon icon="solar:pie-chart-bold" width={20} />
                {exporting ? "Generating Proportion Export..." : "Export Type Proportion Data"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
