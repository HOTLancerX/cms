'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import 'suneditor/dist/css/suneditor.min.css';
import { GalleryModal } from './Gallery';
import { Icon } from '@iconify/react';
import { useToast } from './ui/Toast';
import { GoogleGenerativeAI } from '@google/generative-ai';

const SunEditor = dynamic(() => import("suneditor-react"), { ssr: false });

interface ContentProps {
    content: string;
    onChange: (content: string) => void;
    label?: string;
    title?: string;
    slug?: string; // auto-select prompt by slug (unique per type)
}


export default function Content({ content, onChange, label = "Content", title, slug }: ContentProps) {
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);
    const [editorInstance, setEditorInstance] = useState<any>(null);
    const { error: toastError, warning } = useToast();

    // Gemini AI states
    const [loading, setLoading] = useState(false);
    const [systemPrompts, setSystemPrompts] = useState<{ id: string; name: string; prompt: string; apiKey: string; model: string; slug: string }[]>([]);
    const [selectedPrompt, setSelectedPrompt] = useState<string>('');
    const [showCustomPrompt, setShowCustomPrompt] = useState(false);
    const [customPrompt, setCustomPrompt] = useState('');

    // Fetch dynamic system prompts from DB
    useEffect(() => {
        fetch('/api/admin/category?type=prompt&status=active')
            .then(r => r.ok ? r.json() : { categories: [] })
            .then(data => {
                const prompts = (data.categories || []).map((c: any) => ({
                    id: c.id,
                    name: c.title,
                    prompt: c.description || '',
                    apiKey: c.metaTitle || '',
                    model: c.metaDescription || 'gemini-2.5-flash',
                    slug: c.slug || '',
                }));
                setSystemPrompts(prompts);
                // Auto-select by slug prop if provided, otherwise first item
                if (prompts.length > 0) {
                    const matched = slug ? prompts.find((p: any) => p.slug === slug) : null;
                    setSelectedPrompt(matched ? matched.id : prompts[0].id);
                }
            })
            .catch(() => { });
    }, [slug]);

    // Clean up empty paragraph tags when editor loads
    useEffect(() => {
        if (editorInstance && content) {
            // Create a temporary div to parse HTML and check if there's actual text content
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = content;
            const textContent = tempDiv.textContent || tempDiv.innerText || '';

            // Only clear if there's no actual text content (just empty tags)
            if (textContent.trim() === '') {
                editorInstance.setContents('');
            }
        }
    }, [editorInstance]);

    const handleChange = (content: string) => {
        // Create a temporary div to parse HTML and check if there's actual text content
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content || '';
        const textContent = tempDiv.textContent || tempDiv.innerText || '';

        // Only clear if there's no actual text content (just empty tags)
        const cleanContent = textContent.trim() === '' ? '' : content;
        onChange(cleanContent);
    };

    const handleImageSelect = (images: string | string[]) => {
        const imageUrls = Array.isArray(images) ? images : [images];

        if (editorInstance && imageUrls.length > 0) {
            imageUrls.forEach(url => {
                if (url) {
                    // Insert image into editor with proper HTML
                    const imgHtml = `<img src="${url}" alt="Inserted image" style="max-width: 100%; height: auto;" />`;
                    editorInstance.insertHTML(imgHtml);
                }
            });
        }

        setIsGalleryOpen(false);
    };

    const editorOptions = {
        buttonList: [
            [
                "formatBlock",
                "bold",
                "underline",
                "italic",
                "blockquote",
                "fontColor",
                "hiliteColor",
                "textStyle",
                "removeFormat",
                "align",
                "horizontalRule",
                "list",
                "lineHeight",
                "table",
                "link",
                "image",
                "video",
                "audio",
                "codeView",
            ],
        ],
        callBackSave: function (contents: string) {
            onChange(contents);
        },
        imageUploadHandler: () => {
            setIsGalleryOpen(true);
            return false;
        },
        onImageUploadBefore: () => {
            setIsGalleryOpen(true);
            return false;
        },
        imageUrlInput: false,
        defaultTag: '',
        mode: 'classic' as const,
        rtl: false,
        placeholder: 'Start writing...',
        onLoad: function (core: any) {
            // Automatically clear empty paragraph on load
            setTimeout(() => {
                const currentContent = core.getContents();
                // Create a temporary div to parse HTML and check if there's actual text content
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = currentContent || '';
                const textContent = tempDiv.textContent || tempDiv.innerText || '';

                // Only clear if there's no actual text content (just empty tags)
                if (textContent.trim() === '') {
                    core.setContents('');
                }
            }, 0);
        },
    };

    // Generate content with Gemini (streaming via server route)
    const generateContent = async () => {
        if (!title) {
            warning("Please provide a title first.");
            return;
        }

        if (selectedPrompt === "customprompt" && !customPrompt.trim()) {
            warning("Please enter a custom prompt first.");
            return;
        }

        setLoading(true);

        let finalPrompt: string;
        let apiKey = '';
        let model = 'gemini-2.5-flash';

        if (selectedPrompt === "customprompt") {
            finalPrompt = `${customPrompt}\n\nTitle: ${title}`;
        } else {
            const sp = systemPrompts.find((p) => p.id === selectedPrompt);
            finalPrompt = `${sp?.prompt}\n\nTitle: ${title}`;
            apiKey = sp?.apiKey || '';
            model = sp?.model || 'gemini-2.5-flash';
        }

        // Clear editor before streaming
        if (editorInstance) editorInstance.setContents('');
        onChange('');

        try {
            const genAI = new GoogleGenerativeAI(apiKey || process.env.NEXT_PUBLIC_AI_KEY!);
            const genModel = genAI.getGenerativeModel({ model });
            const result = await genModel.generateContentStream(finalPrompt);

            let accumulated = '';
            for await (const chunk of result.stream) {
                accumulated += chunk.text();
                if (editorInstance) editorInstance.setContents(accumulated);
                onChange(accumulated);
            }
        } catch (err) {
            toastError("Failed to generate content. Check API key or network.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
                <label className="block text-sm font-medium">{label}</label>
                <button
                    type="button"
                    onClick={() => setIsGalleryOpen(true)}
                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm flex items-center gap-1"
                    title="Add Media"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 32 32">
                        <path fill="currentColor" d="M8.5 16a7.5 7.5 0 1 1 0-15a7.5 7.5 0 0 1 0 15m1-12.25a.75.75 0 0 0-1.5 0V7.5H4.25a.75.75 0 0 0 0 1.5H8v3.75a.75.75 0 0 0 1.5 0V9h3.75a.75.75 0 0 0 0-1.5H9.5zM4 16.296q.482.279 1 .498V25.5c0 .59.146 1.148.405 1.636l9.82-9.905a2.5 2.5 0 0 1 3.55 0l9.82 9.905A3.5 3.5 0 0 0 29 25.5v-17A3.5 3.5 0 0 0 25.5 5h-8.706a9 9 0 0 0-.498-1H25.5A4.5 4.5 0 0 1 30 8.5v17a4.5 4.5 0 0 1-4.5 4.5h-17A4.5 4.5 0 0 1 4 25.5zM8.5 29h17c.978 0 1.862-.4 2.497-1.047l-9.932-10.018a1.5 1.5 0 0 0-2.13 0L6.003 27.953A3.5 3.5 0 0 0 8.5 29M26 12a3.5 3.5 0 1 1-7 0a3.5 3.5 0 0 1 7 0m-1 0a2.5 2.5 0 1 0-5 0a2.5 2.5 0 0 0 5 0" />
                    </svg>
                    Add Media
                </button>
            </div>

            {/* Gemini AI Generation Controls */}
            {title && (
                <div className="mb-4 p-4 bg-linear-to-r from-blue-50 to-purple-50 rounded-lg border">
                    <div className="flex items-center gap-2 mb-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                            <path d="M12 2L2 7l10 5 10-5-10-5z" />
                            <path d="M2 17l10 5 10-5" />
                            <path d="M2 12l10 5 10-5" />
                        </svg>
                        <h3 className="text-sm font-semibold text-gray-700">Generate content with Gemini AI</h3>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 mb-3">
                        <select
                            name="SystemPrompt"
                            id="SystemPrompt"
                            className="flex-1 rounded-md p-2 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            value={selectedPrompt}
                            onChange={(e) => {
                                const value = e.target.value;
                                setSelectedPrompt(value);
                                setShowCustomPrompt(value === 'customprompt');
                            }}
                        >
                            {systemPrompts.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))}
                            <option value="customprompt">Custom AI Prompt</option>
                        </select>
                        <button
                            type="button"
                            onClick={generateContent}
                            disabled={loading}
                            className="px-6 py-2 bg-linear-to-r from-blue-600 to-purple-600 text-white rounded-md hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
                        >
                            <Icon icon="mingcute:ai-fill" width="24" height="24" />
                            {loading ? (
                                <span className="flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:0ms]" />
                                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:150ms]" />
                                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:300ms]" />
                                </span>
                            ) : 'Generate'}
                        </button>
                    </div>
                    {/*
                    <p className="text-xs text-gray-600">
                        <strong>Title:</strong>{' '}
                        <span className="truncate block max-w-full" title={title}>{title}</span>
                    </p>
                    */}
                </div>
            )}

            {/* Custom Prompt Input Box */}
            {showCustomPrompt && (
                <div className="mb-4 bg-gray-50 p-4 rounded-lg border">
                    <label htmlFor="customPrompt" className="block text-sm font-medium text-gray-700 mb-2">
                        Enter your custom AI prompt:
                    </label>
                    <textarea
                        id="customPrompt"
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        placeholder="Enter your custom prompt here. The AI will use this prompt along with the title to generate content..."
                        className="w-full h-32 p-3 border border-gray-300 rounded-md resize-vertical focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                        Note: When using a custom prompt, the predefined SystemPrompts will not be used.
                    </p>
                </div>
            )}

            <SunEditor
                defaultValue={content || ''}
                onChange={handleChange}
                setOptions={editorOptions}
                getSunEditorInstance={(sunEditor) => {
                    setEditorInstance(sunEditor);
                }}
            />

            {/* Reuse GalleryModal from Gallery component - DRY principle */}
            <GalleryModal
                isOpen={isGalleryOpen}
                onClose={() => setIsGalleryOpen(false)}
                multiple={true}
                selectedImages={[]}
                onSelect={handleImageSelect}
            />
        </div>
    );
}
