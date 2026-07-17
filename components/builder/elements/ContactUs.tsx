"use client";

import React, { useState, useRef, useEffect } from "react";
import { Icon } from "@iconify/react";
import {
  Text,
  Textarea,
  Select,
  NumberControl,
  Dimensions,
  Typography,
  Section,
  Url,
  IconPicker,
  ColorPickerPopup,
} from "../controls";

// Width and input type options matching user requirements
const COLUMN_WIDTH_OPTIONS = [
  { value: "20", label: "20%" },
  { value: "25", label: "25%" },
  { value: "30", label: "30%" },
  { value: "33", label: "33%" },
  { value: "40", label: "40%" },
  { value: "50", label: "50%" },
  { value: "60", label: "60%" },
  { value: "66", label: "66%" },
  { value: "70", label: "70%" },
  { value: "75", label: "75%" },
  { value: "80", label: "80%" },
  { value: "100", label: "100%" },
];

const FIELD_TYPE_OPTIONS = [
  { value: "text", label: "Text" },
  { value: "email", label: "Email" },
  { value: "textarea", label: "Textarea" },
  { value: "url", label: "URL" },
  { value: "tel", label: "Telephone" },
  { value: "acceptance", label: "Acceptance" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "time", label: "Time" },
  { value: "radio", label: "Radio List" },
  { value: "select", label: "Dropdown Select" },
  { value: "checkbox", label: "Checkbox List" },
  { value: "upload", label: "File Upload" },
];

interface FormField {
  type: string;
  label: string;
  placeholder?: string;
  required?: string; // "true" or "false"
  columnWidth?: string;
  options?: string; // separated by newline, e.g. "Label|Value"
  maxFiles?: number;
}

interface SocialLink {
  icon: string;
  name: string;
  link: any;
}

interface AddressItem {
  icon: string;
  name: string;
  link: string;
}

/* ── File Upload Drag and Drop Component ── */
function DragDropUpload({
  field,
  uploadAutomatically = true,
  onFilesChanged,
}: {
  field: FormField;
  uploadAutomatically?: boolean;
  onFilesChanged: (urls: string[]) => void;
}) {
  const maxFiles = field.maxFiles || 1;
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList) => {
    const list = Array.from(files);
    if (uploadedUrls.length + list.length > maxFiles) {
      alert(`You can only upload up to ${maxFiles} file(s).`);
      return;
    }

    setUploading(true);
    const urls: string[] = [...uploadedUrls];

    for (const file of list) {
      try {
        const formData = new FormData();
        formData.append("files", file);
        formData.append("type", "cloudflare");

        const res = await fetch("/api/library/upload-file", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          if (data.results && data.results.length > 0) {
            const url = data.results[0].library.url;
            urls.push(url);
          }
        } else {
          console.error("Upload failed for file:", file.name);
        }
      } catch (err) {
        console.error("Error uploading file:", err);
      }
    }

    setUploadedUrls(urls);
    onFilesChanged(urls);
    setUploading(false);
  };

  const onDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const removeFile = (indexToRemove: number) => {
    const nextUrls = uploadedUrls.filter((_, idx) => idx !== indexToRemove);
    setUploadedUrls(nextUrls);
    onFilesChanged(nextUrls);
  };

  return (
    <div className="w-full flex flex-col gap-2">
      <div
        onDragEnter={onDrag}
        onDragOver={onDrag}
        onDragLeave={onDrag}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`w-full border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
          dragActive
            ? "border-indigo-500 bg-indigo-50/40"
            : "border-gray-300 hover:border-indigo-400 bg-gray-50/50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={maxFiles > 1}
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        <div className="flex flex-col items-center justify-center gap-2">
          {uploading ? (
            <Icon icon="svg-spinners:ring-resize" width="30" className="text-indigo-600" />
          ) : (
            <Icon icon="solar:upload-cloud-bold-duotone" width="36" className="text-gray-400" />
          )}
          <span className="text-sm font-medium text-gray-700">
            {uploading ? "Uploading files..." : "Drag & drop files here or click to select"}
          </span>
          <span className="text-xs text-gray-400">
            Max {maxFiles} file(s) allowed
          </span>
        </div>
      </div>

      {uploadedUrls.length > 0 && (
        <div className="flex flex-col gap-1.5 mt-1">
          {uploadedUrls.map((url, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between bg-white border border-gray-100 rounded-lg p-2 text-xs shadow-sm"
            >
              <div className="flex items-center gap-2 truncate">
                <Icon icon="solar:document-bold" className="text-indigo-500 shrink-0" width="16" />
                <span className="text-gray-700 truncate font-medium">{url.split("/").pop()}</span>
              </div>
              <button
                type="button"
                onClick={() => removeFile(idx)}
                className="text-gray-400 hover:text-red-500 border-none bg-transparent cursor-pointer"
              >
                <Icon icon="solar:trash-bin-trash-bold" width="16" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Contact Form Render Component ── */
function ContactUsFrontend({ element }: { element: any }) {
  const s = element.schema;

  // Content configurations
  const labelToggle: boolean = s.content?.labelToggle === "true";
  const requiredMarkToggle: boolean = s.content?.requiredMarkToggle === "true";
  
  const fields: FormField[] = s.content?.fields || [];

  const successMessage: string = s.content?.successMessage || "Your submission has been received successfully. We will get back to you shortly.";
  const errorMessage: string = s.content?.errorMessage || "Submission failed. Please try again.";
  const submitButtonText: string = s.content?.submitButtonText || "Submit Message";
  const redirectUrl: string = s.content?.redirectUrl || "";
  const webhookUrl: string = s.content?.webhookUrl || "";

  // Theme settings
  const formBg: string = s.style?.formBg || "#ffffff";
  const submitButtonBg: string = s.style?.submitButtonBg || "#4f46e5";
  const submitButtonTextColor: string = s.style?.submitButtonTextColor || "#ffffff";

  // Form State
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [formFiles, setFormFiles] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [windowWidth, setWindowWidth] = useState(1200);

  useEffect(() => {
    setWindowWidth(window.innerWidth);
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleSocialSend = (platform: "whatsapp" | "telegram" | "facebook") => {
    const messageLines = Object.entries(formData)
      .map(([label, val]) => `*${label}*: ${Array.isArray(val) ? val.join(", ") : val}`)
      .join("\n");
    const fullText = `Contact Form Submission:\n\n${messageLines}`;

    if (platform === "whatsapp") {
      const cleanPhone = (s.content?.whatsappNumber || "").replace(/[^0-9+]/g, "");
      window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(fullText)}`, "_blank");
    } else if (platform === "telegram") {
      const cleanTg = (s.content?.telegramUsername || "").replace("@", "");
      window.open(`https://t.me/share/url?url=&text=${encodeURIComponent(fullText)}`, "_blank");
    } else if (platform === "facebook") {
      const cleanFb = s.content?.facebookPage || "";
      window.open(`https://m.me/${cleanFb}`, "_blank");
    }
  };

  const handleInputChange = (label: string, value: any) => {
    setFormData((prev) => ({ ...prev, [label]: value }));
  };

  const handleFilesChange = (label: string, urls: string[]) => {
    setFormFiles((prev) => ({ ...prev, [label]: urls }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");
    setSuccess(false);

    try {
      // Gather files flat list
      const allFiles = Object.values(formFiles).flat();

      const res = await fetch("/api/contactus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: formData,
          files: allFiles,
          webhookUrl,
        }),
      });

      if (res.ok) {
        setSuccess(true);
        setFormData({});
        setFormFiles({});
        if (redirectUrl) {
          setTimeout(() => {
            window.location.href = redirectUrl;
          }, 1200);
        }
      } else {
        const data = await res.json();
        setErrorMsg(data.error || errorMessage);
      }
    } catch (err: any) {
      setErrorMsg("An unexpected error occurred. Please try again later.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full box-border">
      {success ? (
        <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center">
            <Icon icon="solar:check-circle-bold-duotone" width="36" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 m-0">Thank You!</h3>
          <p className="text-sm text-gray-500 max-w-sm m-0">
            {successMessage}
          </p>
          <button
            onClick={() => setSuccess(false)}
            className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 border-none rounded-xl text-xs font-semibold cursor-pointer transition-colors"
          >
            Send another message
          </button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="flex flex-wrap -mx-2 w-[calc(100%+16px)] box-border"
        >
          {errorMsg && (
            <div className="w-full px-2 mb-2">
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-xl text-xs border border-red-100">
                <Icon icon="solar:danger-bold-duotone" width="16" className="shrink-0" />
                <span className="font-semibold">{errorMsg}</span>
              </div>
            </div>
          )}

          {fields.map((field, idx) => {
            const width = field.columnWidth || "100";
            const isRequired = field.required === "true";
            const optionsList = (field.options || "")
              .split("\n")
              .filter((opt) => opt.trim() !== "")
              .map((opt) => {
                const parts = opt.split("|");
                return {
                  label: parts[0] || "",
                  value: parts[1] || parts[0] || "",
                };
              });

            return (
              <div
                key={idx}
                className="px-2 pb-4 flex flex-col gap-1.5 box-border"
                style={{
                  width: windowWidth > 768 ? `${width}%` : "100%",
                  flex: windowWidth > 768 ? `0 0 ${width}%` : "0 0 100%",
                  maxWidth: windowWidth > 768 ? `${width}%` : "100%",
                }}
              >
                {/* Field Label */}
                {labelToggle && field.label && (
                  <label className="text-[13px] font-bold text-gray-700 flex items-center gap-0.5">
                    {field.label}
                    {isRequired && requiredMarkToggle && (
                      <span className="text-red-500">*</span>
                    )}
                  </label>
                )}

                  {/* Inputs router */}
                  {field.type === "textarea" ? (
                    <textarea
                      placeholder={field.placeholder}
                      required={isRequired}
                      rows={4}
                      value={formData[field.label] || ""}
                      onChange={(e) => handleInputChange(field.label, e.target.value)}
                      className="w-full border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl p-3 text-sm transition-all outline-none box-border resize-none"
                    />
                  ) : field.type === "select" ? (
                    <select
                      required={isRequired}
                      value={formData[field.label] || ""}
                      onChange={(e) => handleInputChange(field.label, e.target.value)}
                      className="w-full border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl p-3 text-sm transition-all outline-none bg-white box-border"
                    >
                      <option value="">{field.placeholder || "Select option..."}</option>
                      {optionsList.map((opt, i) => (
                        <option key={i} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : field.type === "radio" ? (
                    <div className="flex flex-wrap gap-3 py-1">
                       {optionsList.map((opt, i) => (
                        <label key={i} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                          <input
                            type="radio"
                            name={`radio_${idx}`}
                            required={isRequired}
                            value={opt.value}
                            checked={formData[field.label] === opt.value}
                            onChange={(e) => handleInputChange(field.label, e.target.value)}
                            className="cursor-pointer"
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  ) : field.type === "checkbox" ? (
                    <div className="flex flex-wrap gap-3 py-1">
                      {optionsList.map((opt, i) => {
                        const currentVal = formData[field.label] || [];
                        const isChecked = currentVal.includes(opt.value);
                        return (
                          <label key={i} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                const nextVal = isChecked
                                  ? currentVal.filter((v: string) => v !== opt.value)
                                  : [...currentVal, opt.value];
                                handleInputChange(field.label, nextVal);
                              }}
                              className="cursor-pointer"
                            />
                            {opt.label}
                          </label>
                        );
                      })}
                    </div>
                  ) : field.type === "acceptance" ? (
                    <label className="flex items-start gap-2 py-1 text-xs text-gray-500 cursor-pointer leading-normal">
                      <input
                        type="checkbox"
                        required={isRequired}
                        checked={!!formData[field.label]}
                        onChange={(e) => handleInputChange(field.label, e.target.checked)}
                        className="cursor-pointer mt-0.5"
                      />
                      <span>{field.placeholder || "I agree to the privacy policy & terms."}</span>
                    </label>
                  ) : field.type === "upload" ? (
                    <DragDropUpload
                      field={field}
                      uploadAutomatically={true}
                      onFilesChanged={(urls) => handleFilesChange(field.label, urls)}
                    />
                  ) : (
                    <input
                      type={field.type}
                      placeholder={field.placeholder}
                      required={isRequired}
                      value={formData[field.label] || ""}
                      onChange={(e) => handleInputChange(field.label, e.target.value)}
                      className="w-full border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl p-3 text-sm transition-all outline-none box-border"
                    />
                  )}
                </div>
              );
            })}

            {/* Submit Button */}
            <div className="w-full px-2 mt-4 flex">
              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl border-none text-sm font-bold tracking-[0.5px] uppercase text-white cursor-pointer transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
                style={{
                  backgroundColor: submitButtonBg,
                  color: submitButtonTextColor,
                }}
              >
                {submitting && (
                  <Icon icon="svg-spinners:ring-resize" width="16" className="text-white" />
                )}
                {submitting ? "Sending..." : submitButtonText}
              </button>
            </div>

            {/* Direct Messaging Chat Row */}
            {(s.content?.whatsappNumber || s.content?.facebookPage || s.content?.telegramUsername) && (
              <div className="w-full px-2 mt-3 flex flex-wrap gap-3 justify-center items-center">
                {s.content?.whatsappNumber && (
                  <button
                    type="button"
                    onClick={() => handleSocialSend("whatsapp")}
                    className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl border-none text-xs font-bold uppercase text-white cursor-pointer transition-all hover:opacity-90 bg-[#25d366]"
                  >
                    <Icon icon="logos:whatsapp-icon" width="16" />
                    WhatsApp
                  </button>
                )}
                {s.content?.facebookPage && (
                  <button
                    type="button"
                    onClick={() => handleSocialSend("facebook")}
                    className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl border-none text-xs font-bold uppercase text-white cursor-pointer transition-all hover:opacity-90 bg-[#0084ff]"
                  >
                    <Icon icon="logos:facebook" width="16" className="brightness-0 invert" />
                    Facebook
                  </button>
                )}
                {s.content?.telegramUsername && (
                  <button
                    type="button"
                    onClick={() => handleSocialSend("telegram")}
                    className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl border-none text-xs font-bold uppercase text-white cursor-pointer transition-all hover:opacity-90 bg-[#0088cc]"
                  >
                    <Icon icon="logos:telegram" width="16" />
                    Telegram
                  </button>
                )}
              </div>
            )}
          </form>
        )}
    </div>
  );
}

/* ── Drag & Drop Custom Fields Manager Component ── */
function FieldsManager({ value, onChange }: { value: any[]; onChange: (val: any[]) => void }) {
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === targetIdx) return;
    const next = [...value];
    const temp = next[draggedIdx];
    next.splice(draggedIdx, 1);
    next.splice(targetIdx, 0, temp);
    onChange(next);
    setDraggedIdx(null);
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const next = [...value];
    const temp = next[index];
    next[index] = next[index - 1];
    next[index - 1] = temp;
    onChange(next);
  };

  const moveDown = (index: number) => {
    if (index === value.length - 1) return;
    const next = [...value];
    const temp = next[index];
    next[index] = next[index + 1];
    next[index + 1] = temp;
    onChange(next);
  };

  return (
    <div className="space-y-4">
      {(value || []).map((item: any, idx: number) => (
        <div
          key={idx}
          draggable
          onDragStart={(e) => handleDragStart(e, idx)}
          onDragOver={(e) => handleDragOver(e, idx)}
          onDrop={(e) => handleDrop(e, idx)}
          className="border border-gray-200 rounded-xl p-3 bg-gray-50/30 hover:bg-gray-50/80 transition-colors"
        >
          {/* Header Row with Drag Handle, Label and Reordering Controls */}
          <div className="flex items-center justify-between pb-2 border-b border-gray-100 mb-3 select-none">
            <div className="flex items-center gap-2 cursor-grab active:cursor-grabbing">
              <Icon icon="solar:hamburger-menu-bold" className="text-gray-400 shrink-0" width="18" />
              <span className="text-xs font-bold text-gray-700 truncate max-w-[120px]">
                {item.label || `Field #${idx + 1}`}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => moveUp(idx)}
                disabled={idx === 0}
                className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 border-none bg-transparent cursor-pointer"
                title="Move Up"
              >
                <Icon icon="solar:arrow-up-bold" width="14" />
              </button>
              <button
                type="button"
                onClick={() => moveDown(idx)}
                disabled={idx === value.length - 1}
                className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 border-none bg-transparent cursor-pointer"
                title="Move Down"
              >
                <Icon icon="solar:arrow-down-bold" width="14" />
              </button>
              <button
                type="button"
                onClick={() => onChange(value.filter((_: any, i: number) => i !== idx))}
                className="p-1 text-red-400 hover:text-red-600 border-none bg-transparent cursor-pointer ml-1"
                title="Remove Field"
              >
                <Icon icon="solar:trash-bin-trash-bold" width="16" />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <Select
              label="Field Type"
              value={item.type || "text"}
              onChange={(v: string) => {
                const u = [...value]; u[idx] = { ...u[idx], type: v }; onChange(u);
              }}
              options={FIELD_TYPE_OPTIONS}
            />

            <Text
              label="Label text"
              value={item.label || ""}
              onChange={(v: string) => {
                const u = [...value]; u[idx] = { ...u[idx], label: v }; onChange(u);
              }}
            />

            <Text
              label="Placeholder text"
              value={item.placeholder || ""}
              onChange={(v: string) => {
                const u = [...value]; u[idx] = { ...u[idx], placeholder: v }; onChange(u);
              }}
            />

            <Select
              label="Is Required"
              value={item.required ?? "false"}
              onChange={(v: string) => {
                const u = [...value]; u[idx] = { ...u[idx], required: v }; onChange(u);
              }}
              options={[
                { value: "false", label: "No" },
                { value: "true", label: "Yes" },
              ]}
            />

            <Select
              label="Column Width (Desktop)"
              value={item.columnWidth || "100"}
              onChange={(v: string) => {
                const u = [...value]; u[idx] = { ...u[idx], columnWidth: v }; onChange(u);
              }}
              options={COLUMN_WIDTH_OPTIONS}
            />

            {(item.type === "radio" || item.type === "select" || item.type === "checkbox") && (
              <Textarea
                label="Options (New line separated. Label|Value)"
                value={item.options || ""}
                placeholder="Option 1|val1&#10;Option 2|val2"
                onChange={(v: string) => {
                  const u = [...value]; u[idx] = { ...u[idx], options: v }; onChange(u);
                }}
                rows={3}
              />
            )}

            {item.type === "upload" && (
              <NumberControl
                label="Max files allowed"
                value={item.maxFiles ?? 1}
                onChange={(v: number) => {
                  const u = [...value]; u[idx] = { ...u[idx], maxFiles: v }; onChange(u);
                }}
                min={1}
                max={10}
              />
            )}
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => {
          const newItem: FormField = {
            type: "text",
            label: "New Field",
            placeholder: "Enter value",
            required: "false",
            columnWidth: "100",
          };
          onChange([...(value || []), newItem]);
        }}
        className="w-full flex items-center justify-center gap-1 py-2.5 bg-gray-700 hover:bg-gray-800 text-white rounded text-[13px] font-semibold cursor-pointer transition-colors border-none"
      >
        + Add Custom Field
      </button>
    </div>
  );
}

/* ── Element Registry Definition ── */
const contactUsElement = {
  type: "contact-us-form",
  category: "Forms",
  label: "Contact Us Form",
  icon: "solar:letter-bold-duotone",

  schema: {
    content: {
      labelToggle: "true",
      requiredMarkToggle: "true",
      submitButtonText: "Submit Message",
      successMessage: "Your submission has been received successfully. We will get back to you shortly.",
      errorMessage: "Submission failed. Please try again.",
      redirectUrl: "",
      webhookUrl: "",
      fields: [
        {
          type: "text",
          label: "Name",
          placeholder: "Enter your name",
          required: "true",
          columnWidth: "50",
        },
        {
          type: "email",
          label: "Email",
          placeholder: "Enter your email",
          required: "true",
          columnWidth: "50",
        },
        {
          type: "textarea",
          label: "Message",
          placeholder: "Enter your message",
          required: "true",
          columnWidth: "100",
        },
      ],
      whatsappNumber: "8801700000000",
      telegramUsername: "",
      facebookPage: "",
    },

    style: {
      formBg: "#ffffff",
      titleColor: "#111827",
      descriptionColor: "#475569",
      submitButtonBg: "#4f46e5",
      submitButtonTextColor: "#ffffff",
    },

    advanced: {
      margin: { top: 0, right: 0, bottom: 0, left: 0, unit: "px" },
      padding: { top: 0, right: 0, bottom: 0, left: 0, unit: "px" },
    },
  },

  controls: [
    // ═══════════════════ CONTENT TAB ════════════════
    {
      tab: "Content",
      section: "Form Fields List",
      controls: [
        {
          name: "fields",
          responsive: false,
          render: (value: any, onChange: any) => (
            <FieldsManager value={value} onChange={onChange} />
          ),
        },
      ],
    },

    {
      tab: "Content",
      section: "Form Settings",
      controls: [
        {
          name: "submitButtonText",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Text label="Submit Button Text" value={value ?? "Submit Message"} onChange={onChange} />
          ),
        },
        {
          name: "successMessage",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Textarea label="Custom Success Message" value={value ?? "Your submission has been received successfully."} onChange={onChange} rows={2} />
          ),
        },
        {
          name: "errorMessage",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Textarea label="Custom Error Message" value={value ?? "Submission failed. Please try again."} onChange={onChange} rows={2} />
          ),
        },
        {
          name: "redirectUrl",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Text label="Redirect URL after submit (optional)" value={value ?? ""} onChange={onChange} />
          ),
        },
        {
          name: "webhookUrl",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Text label="Webhook URL (optional)" value={value ?? ""} onChange={onChange} />
          ),
        },
        {
          name: "labelToggle",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Select
              label="Show Fields Labels"
              value={value ?? "true"}
              onChange={onChange}
              options={[
                { value: "false", label: "No" },
                { value: "true", label: "Yes" },
              ]}
            />
          ),
        },
        {
          name: "requiredMarkToggle",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Select
              label="Show Required Asterisk (*)"
              value={value ?? "true"}
              onChange={onChange}
              options={[
                { value: "false", label: "No" },
                { value: "true", label: "Yes" },
              ]}
            />
          ),
        },
      ],
    },

    

    {
      tab: "Content",
      section: "Social Messaging Integration",
      controls: [
        {
          name: "whatsappNumber",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Text label="WhatsApp Number (with country code, e.g. +8801700000000)" value={value || ""} onChange={onChange} />
          ),
        },
        {
          name: "telegramUsername",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Text label="Telegram Username (e.g. @username)" value={value || ""} onChange={onChange} />
          ),
        },
        {
          name: "facebookPage",
          responsive: false,
          render: (value: any, onChange: any) => (
            <Text label="Facebook Username/ID for Messenger (e.g. pageusername)" value={value || ""} onChange={onChange} />
          ),
        },
      ],
    },

    // ═══════════════════ STYLE TAB ══════════════════
    {
      tab: "Style",
      section: "Color Palette",
      controls: [
        {
          name: "formBg",
          responsive: false,
          render: (value: any, onChange: any) => (
            <ColorPickerPopup label="Form Container Background" value={value ?? "#ffffff"} onChange={onChange} />
          ),
        },
        {
          name: "titleColor",
          responsive: false,
          render: (value: any, onChange: any) => (
            <ColorPickerPopup label="Header Title Color" value={value ?? "#111827"} onChange={onChange} />
          ),
        },
        {
          name: "descriptionColor",
          responsive: false,
          render: (value: any, onChange: any) => (
            <ColorPickerPopup label="Header Description Color" value={value ?? "#475569"} onChange={onChange} />
          ),
        },
        {
          name: "submitButtonBg",
          responsive: false,
          render: (value: any, onChange: any) => (
            <ColorPickerPopup label="Submit Button Background" value={value ?? "#4f46e5"} onChange={onChange} />
          ),
        },
        {
          name: "submitButtonTextColor",
          responsive: false,
          render: (value: any, onChange: any) => (
            <ColorPickerPopup label="Submit Button Text" value={value ?? "#ffffff"} onChange={onChange} />
          ),
        },
      ],
    },

    // ═══════════════════ ADVANCED TAB ═══════════════
    {
      tab: "Advanced",
      section: "Spacing Bounds",
      controls: [
        {
          name: "margin",
          responsive: true,
          render: (value: any, onChange: any) => (
            <Dimensions type="margin" value={value} onChange={onChange} />
          ),
        },
        {
          name: "padding",
          responsive: true,
          render: (value: any, onChange: any) => (
            <Dimensions type="padding" value={value} onChange={onChange} />
          ),
        },
      ],
    },
  ],

  render: (element: any) => <ContactUsFrontend element={element} />,
};

export default contactUsElement;

