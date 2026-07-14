"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@iconify/react";

interface Submission {
  _id: string;
  fields: Record<string, any>;
  files?: string[];
  ip?: string;
  location?: string;
  device?: string;
  status: "unread" | "read" | "replied";
  createdAt: string;
}

const STATUS_OPTIONS = [
  { value: "unread", label: "Unread", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "read", label: "Read", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "replied", label: "Replied", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
];

export default function SubmissionDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [doc, setDoc] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");

  const fetchSubmission = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/contactus?id=${id}`, { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setDoc(json.data);
      } else {
        setError("Submission not found or failed to fetch.");
      }
    } catch (err) {
      setError("An error occurred while fetching details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchSubmission();
  }, [id]);

  const handleStatusChange = async (newStatus: "unread" | "read" | "replied") => {
    if (!doc) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/contactus?id=${doc._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setDoc((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!doc || !confirm("Are you sure you want to delete this submission?")) return;

    try {
      const res = await fetch(`/api/contactus?id=${doc._id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/admin/contactus");
      } else {
        alert("Failed to delete submission.");
      }
    } catch (err) {
      alert("Error deleting submission.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px] gap-3 text-gray-400">
        <Icon icon="svg-spinners:ring-resize" width="24" />
        <span className="text-sm font-medium">Loading details...</span>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="space-y-6">
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700 flex items-center gap-2">
          <Icon icon="solar:danger-bold" width="18" />
          <span>{error || "Submission details could not be loaded."}</span>
        </div>
        <Link
          href="/admin/contactus"
          className="inline-flex items-center gap-1.5 text-xs text-indigo-600 font-semibold no-underline"
        >
          <Icon icon="solar:arrow-left-bold" width="14" />
          Back to Submissions
        </Link>
      </div>
    );
  }

  // Find sender email in fields
  const senderEmail = Object.entries(doc.fields).find(
    ([key, val]) =>
      (key.toLowerCase().includes("email") || (typeof val === "string" && val.includes("@"))) &&
      typeof val === "string"
  )?.[1] || "";

  const senderName = doc.fields.Name || doc.fields.name || "Anonymous";

  return (
    <div className="space-y-6 max-w-5xl">
      
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div className="space-y-1">
          <Link
            href="/admin/contactus"
            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-indigo-600 font-semibold no-underline transition"
          >
            <Icon icon="solar:arrow-left-bold" width="14" />
            Back to Submissions
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 m-0">Submission from {senderName}</h1>
        </div>

        <div className="flex items-center gap-2">
          {senderEmail && (
            <a
              href={`mailto:${senderEmail}?subject=Re: Contact Us Form`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow no-underline transition"
            >
              <Icon icon="solar:letter-bold" width={16} />
              Reply by Email
            </a>
          )}
          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-2 px-4 py-2 border border-red-200 hover:bg-red-50 text-red-600 rounded-xl text-sm font-semibold cursor-pointer transition"
          >
            <Icon icon="solar:trash-bin-trash-bold" width={16} />
            Delete
          </button>
        </div>
      </div>

      {/* Grid split Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        
        {/* Left Column (Submission details & files) */}
        <div className="md:col-span-2 space-y-6">
          {/* Card: Submission details */}
          <div className="bg-white rounded-2xl border border-gray-150 p-6 space-y-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider m-0">Submitted Message Fields</h3>
            
            <div className="divide-y divide-gray-100">
              {Object.entries(doc.fields).map(([label, value]) => (
                <div key={label} className="py-3 flex flex-col gap-1">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">{label}</span>
                  <span className="text-[14.5px] text-gray-800 font-medium whitespace-pre-wrap">
                    {Array.isArray(value) ? value.join(", ") : String(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Card: File Attachments */}
          {doc.files && doc.files.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-150 p-6 space-y-4">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider m-0">Uploaded Attachments</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {doc.files.map((url, idx) => {
                  const filename = url.split("/").pop() || "attachment";
                  const isImg = /\.(jpeg|jpg|png|webp|gif)$/i.test(url);

                  return (
                    <div key={idx} className="border border-gray-250 rounded-xl p-3 flex items-center justify-between gap-3 shadow-sm hover:border-indigo-400 transition bg-gray-50/20">
                      <div className="flex items-center gap-2 truncate">
                        <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                          {isImg ? (
                            <img src={url} alt="preview" className="w-full h-full object-cover rounded-lg" />
                          ) : (
                            <Icon icon="solar:document-bold" className="text-indigo-600" width="20" />
                          )}
                        </div>
                        <div className="flex flex-col truncate">
                          <span className="text-xs font-semibold text-gray-700 truncate" title={filename}>{filename}</span>
                          <span className="text-[10px] text-gray-400 font-mono">Click eye to view</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 bg-white border border-gray-250 hover:bg-indigo-50 text-gray-500 hover:text-indigo-600 rounded-lg transition"
                          title="View"
                        >
                          <Icon icon="solar:eye-linear" width="14" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Column (Metadata info & status action panel) */}
        <div className="space-y-6">
          {/* Card: Status control */}
          <div className="bg-white rounded-2xl border border-gray-150 p-6 space-y-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider m-0">Submission Status</h3>
            
            <div className="flex flex-col gap-2">
              {STATUS_OPTIONS.map((opt) => {
                const isSelected = doc.status === opt.value;
                return (
                  <button
                    key={opt.value}
                    disabled={updating}
                    onClick={() => handleStatusChange(opt.value as any)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-sm font-semibold transition cursor-pointer text-left ${
                      isSelected
                        ? `${opt.cls} ring-2 ring-indigo-500/20`
                        : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && (
                      <Icon icon="solar:check-circle-bold" width="18" className="text-indigo-600" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Card: Session details metadata */}
          <div className="bg-white rounded-2xl border border-gray-150 p-6 space-y-4 text-xs">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider m-0">Client Metadata</h3>
            
            <div className="space-y-3">
              <div className="flex flex-col gap-0.5">
                <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px]">Location</span>
                <span className="font-semibold text-gray-800 text-[13px]">{doc.location || "Unknown"}</span>
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px]">IP Address</span>
                <span className="font-mono font-bold text-gray-700 text-[13px]">{doc.ip || "127.0.0.1"}</span>
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px]">Device / Browser</span>
                <span className="font-semibold text-gray-800 text-[13px]">{doc.device || "Unknown Device"}</span>
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px]">Created At</span>
                <span className="font-semibold text-gray-800 text-[13px]">
                  {new Date(doc.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
