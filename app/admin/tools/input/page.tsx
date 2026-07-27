"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";

interface DataInputHook {
  key: string;
  name: string;
  filePath: string;
  icon?: string;
  locationIcon?: string;
  description?: string;
  pluginNx?: string;
  fileExists?: boolean;
  fileSize?: number;
  itemCount?: number;
}

export default function InputToolsPage() {
  const [loading, setLoading] = useState(true);
  const [hooks, setHooks] = useState<DataInputHook[]>([]);
  const [importingKey, setImportingKey] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<"replace" | "merge">("replace");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadContent, setUploadContent] = useState<any | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchHooks();
  }, []);

  const fetchHooks = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/tools/input");
      const data = await res.json();
      if (data.success) {
        setHooks(data.hooks || []);
      }
    } catch (err) {
      console.error("Failed to load input hooks:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleImportHook = async (hook: DataInputHook) => {
    if (
      importMode === "replace" &&
      !confirm(
        `Warning: Importing "${hook.name}" in Replace mode will clear existing data in matching database collections before inserting. Do you wish to proceed?`
      )
    ) {
      return;
    }

    setImportingKey(hook.key);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/tools/input", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: hook.key,
          mode: importMode,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({
          type: "success",
          text: `Data successfully dumped into database! (${JSON.stringify(
            data.importedCounts
          )})`,
        });
      } else {
        setMessage({
          type: "error",
          text: data.error || "Failed to import database dump.",
        });
      }
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err?.message || "Import execution error",
      });
    } finally {
      setImportingKey(null);
    }
  };

  const handleFileUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        setUploadContent(json);
      } catch (err) {
        alert("Invalid JSON file uploaded.");
        setUploadFile(null);
        setUploadContent(null);
      }
    };
    reader.readAsText(file);
  };

  const handleImportCustomFile = async () => {
    if (!uploadContent) return;

    if (
      importMode === "replace" &&
      !confirm(
        "Warning: Importing custom file in Replace mode will clear existing database collection records. Proceed?"
      )
    ) {
      return;
    }

    setImportingKey("custom_upload");
    setMessage(null);

    try {
      const res = await fetch("/api/admin/tools/input", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dumpData: uploadContent,
          mode: importMode,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({
          type: "success",
          text: `Custom JSON data dumped into database successfully! (${JSON.stringify(
            data.importedCounts
          )})`,
        });
      } else {
        setMessage({
          type: "error",
          text: data.error || "Failed to import custom data file.",
        });
      }
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err?.message || "Import execution error",
      });
    } finally {
      setImportingKey(null);
    }
  };

  return (
    <div className="container space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Icon icon="solar:import-bold" className="text-main" width={28} />
            Import / Data Input Box Tools
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Import datasets from registered plugin files or custom JSON dumps directly into MongoDB.
          </p>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-3 bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setImportMode("replace")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              importMode === "replace"
                ? "bg-white dark:bg-zinc-700 text-rose-600 dark:text-rose-400 shadow-sm"
                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            Replace Database
          </button>
          <button
            onClick={() => setImportMode("merge")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              importMode === "merge"
                ? "bg-white dark:bg-zinc-700 text-main dark:text-sky-400 shadow-sm"
                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            Merge Data
          </button>
        </div>
      </div>

      {/* Message Feedback Banner */}
      {message && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center gap-3 ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800"
              : "bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800"
          }`}
        >
          <Icon
            icon={message.type === "success" ? "solar:check-circle-bold" : "solar:danger-circle-bold"}
            width={22}
          />
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      {/* Registered Files Grid Header */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-4">
          <Icon icon="solar:folder-with-files-bold" className="text-main" width={22} />
          Registered File Input Grid Hooks
        </h2>

        {loading ? (
          <div className="p-12 text-center text-zinc-500 flex flex-col items-center gap-3">
            <Icon icon="solar:restart-bold" className="animate-spin text-main" width={32} />
            <span>Loading registered file hooks...</span>
          </div>
        ) : hooks.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-400">
            No input file hooks registered yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hooks.map((hook) => (
              <div
                key={hook.key}
                className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 flex flex-col justify-between hover:shadow-lg transition-all space-y-4"
              >
                <div>
                  {/* File location icon & header */}
                  <div className="flex items-center gap-2 w-full mb-4">
                    <div className="p-3 bg-sky-50 dark:bg-sky-950/40 text-main dark:text-sky-400 rounded-xl flex items-center gap-2">
                      <Icon icon={hook.icon || "solar:document-text-bold"} width={20} />
                    </div>
                    {/* Name */}
                    <div className="flex flex-col">
                      <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                        {hook.name}
                      </h3>
                      {hook.pluginNx && (
                        <span className="text-xs inline-flex font-mono font-semibold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                          {hook.pluginNx}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {hook.description && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
                      {hook.description}
                    </p>
                  )}

                  {/* File Location display */}
                  <div className="mt-4 p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/60 space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 font-medium">
                      <span>{hook.itemCount || 0} records</span>
                      <span>
                        {hook.fileSize ? `${(hook.fileSize / 1024).toFixed(1)} KB` : "Stored File"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Input / Dump Button inside that box */}
                <button
                  onClick={() => handleImportHook(hook)}
                  disabled={importingKey === hook.key}
                  className="w-full py-2.5 px-4 bg-main hover:bg-main/80 active:bg-sky-800 text-white font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  <Icon
                    icon={
                      importingKey === hook.key
                        ? "solar:restart-bold"
                        : "solar:download-minimalistic-bold"
                    }
                    className={importingKey === hook.key ? "animate-spin" : ""}
                    width={18}
                  />
                  {importingKey === hook.key ? "Dumping Data..." : "Input & Dump Data"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Custom JSON File Upload Input Box */}
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <Icon icon="solar:file-send-bold" className="text-emerald-500" width={22} />
          Upload Custom Data JSON File
        </h2>

        <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-6 text-center flex flex-col items-center justify-center gap-3">
          <Icon icon="solar:upload-square-bold" className="text-zinc-400" width={40} />
          <div>
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Select a JSON export/dump file from your computer
            </span>
            <p className="text-xs text-zinc-400 mt-1">
              Supports standard CMS database export format (.json)
            </p>
          </div>

          <input
            type="file"
            accept=".json"
            onChange={handleFileUploadChange}
            className="block text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 cursor-pointer"
          />

          {uploadFile && uploadContent && (
            <div className="mt-4 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 w-full max-w-md text-left flex items-center justify-between">
              <div>
                <div className="font-semibold text-sm text-emerald-900 dark:text-emerald-200">
                  {uploadFile.name}
                </div>
                <div className="text-xs text-emerald-600 dark:text-emerald-400">
                  Ready to dump collections:{" "}
                  {Object.keys(uploadContent.collections || uploadContent).join(", ")}
                </div>
              </div>

              <button
                onClick={handleImportCustomFile}
                disabled={importingKey === "custom_upload"}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-xl shadow-sm disabled:opacity-50 flex items-center gap-1.5"
              >
                <Icon
                  icon={importingKey === "custom_upload" ? "solar:restart-bold" : "solar:file-download-bold"}
                  className={importingKey === "custom_upload" ? "animate-spin" : ""}
                  width={16}
                />
                Dump File
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
