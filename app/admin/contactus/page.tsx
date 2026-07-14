"use client";

import React, { useState, useEffect } from "react";
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

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  unread: { label: "Unread", cls: "bg-amber-100 text-amber-700 ring-1 ring-amber-300" },
  read: { label: "Read", cls: "bg-blue-100 text-blue-700 ring-1 ring-blue-300" },
  replied: { label: "Replied", cls: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300" },
};

export default function ContactSubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/contactus", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setSubmissions(json.data || []);
      } else {
        setError("Failed to fetch submissions.");
      }
    } catch (err) {
      setError("An error occurred while fetching data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (!confirm("Are you sure you want to delete this submission?")) return;

    try {
      const res = await fetch(`/api/contactus?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSubmissions((prev) => prev.filter((item) => item._id !== id));
      } else {
        alert("Failed to delete submission.");
      }
    } catch (err) {
      alert("Error deleting submission.");
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: "unread" | "read" | "replied", e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/contactus?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setSubmissions((prev) =>
          prev.map((item) => (item._id === id ? { ...item, status: newStatus } : item))
        );
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px] gap-3 text-gray-400">
        <Icon icon="svg-spinners:ring-resize" width="24" />
        <span className="text-sm font-medium">Loading submissions...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contact Submissions</h1>
          <p className="text-sm text-gray-500 mt-0.5">{submissions.length} total submissions</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700 flex items-center gap-2">
          <Icon icon="solar:danger-bold" width="18" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Table view list */}
      {submissions.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-150">
          <Icon icon="solar:letter-bold-duotone" width="48" className="mx-auto mb-3 opacity-30 text-indigo-500" />
          <p className="text-gray-400 font-medium">No contact submissions found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Sender Details</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Attachment</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Metadata (IP / Location)</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Status</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Submitted</th>
                <th className="px-5 py-3.5 text-right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {submissions.map((sub) => {
                const name = sub.fields.Name || sub.fields.name || "Anonymous";
                const email = sub.fields.Email || sub.fields.email || "";
                const message = sub.fields.Message || sub.fields.message || "";
                const fileCount = sub.files?.length || 0;
                const badge = STATUS_BADGE[sub.status] || STATUS_BADGE.unread;

                return (
                  <tr key={sub._id} className="hover:bg-gray-50/50 transition">
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-0.5 max-w-[240px]">
                        <span className="font-semibold text-gray-800 truncate">{name}</span>
                        {email && <span className="text-xs text-gray-400 truncate">{email}</span>}
                        {message && (
                          <span className="text-xs text-gray-500 truncate mt-1 italic">
                            "{message}"
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {fileCount > 0 ? (
                        <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md text-xs font-semibold">
                          <Icon icon="solar:paperclip-linear" width="13" />
                          {fileCount} File{fileCount !== 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span className="text-gray-350">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-0.5 text-xs">
                        <span className="font-medium text-gray-700 truncate max-w-[200px]" title={sub.location}>
                          {sub.location || "Unknown location"}
                        </span>
                        {sub.ip && <span className="text-gray-400 font-mono">IP: {sub.ip}</span>}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-400 font-medium">
                      {new Date(sub.createdAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/admin/contactus/${sub._id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-600 no-underline transition"
                        >
                          <Icon icon="solar:eye-bold" width="13" />
                          Details
                        </Link>
                        {sub.status === "unread" ? (
                          <button
                            onClick={(e) => handleUpdateStatus(sub._id, "read", e)}
                            className="p-1.5 bg-gray-50 hover:bg-blue-50 text-gray-400 hover:text-blue-600 border border-gray-200 hover:border-blue-200 rounded-lg cursor-pointer transition"
                            title="Mark Read"
                          >
                            <Icon icon="solar:check-read-bold" width="14" />
                          </button>
                        ) : sub.status === "read" ? (
                          <button
                            onClick={(e) => handleUpdateStatus(sub._id, "replied", e)}
                            className="p-1.5 bg-gray-50 hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 border border-gray-200 hover:border-emerald-200 rounded-lg cursor-pointer transition"
                            title="Mark Replied"
                          >
                            <Icon icon="solar:outgoing-call-bold" width="14" />
                          </button>
                        ) : null}
                        <button
                          onClick={(e) => handleDelete(sub._id, e)}
                          className="p-1.5 bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-600 border border-gray-200 hover:border-red-200 rounded-lg cursor-pointer transition"
                          title="Delete"
                        >
                          <Icon icon="solar:trash-bin-trash-bold" width="14" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
