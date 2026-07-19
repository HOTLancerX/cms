"use client"

import { useState, useEffect, useRef } from 'react'
import { Icon } from '@iconify/react'

interface BgProcessItem {
    id: string
    name: string
    originalUrlOrPreview: string
    processedUrl: string | null
    status: 'idle' | 'processing' | 'completed' | 'failed'
    progress: number
    error?: string
    file?: File
}

interface GalleryBgProps {
    initialImage: string | null
    onLibraryRefresh: () => void
    onSwitchTab: (tab: 'library') => void
}

export default function GalleryBg({ initialImage, onLibraryRefresh, onSwitchTab }: GalleryBgProps) {
    const [items, setItems] = useState<BgProcessItem[]>([])
    const [globalProcessing, setGlobalProcessing] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState(0)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [dragActive, setDragActive] = useState(false)

    // Handle initial image passed from Library tab
    useEffect(() => {
        if (initialImage) {
            // Check if already in items list
            const exists = items.some(item => item.originalUrlOrPreview === initialImage)
            if (!exists) {
                const name = initialImage.split('/').pop()?.split('?')[0] || 'library-image.jpg'
                const newItem: BgProcessItem = {
                    id: Math.random().toString(36).substring(7),
                    name,
                    originalUrlOrPreview: initialImage,
                    processedUrl: null,
                    status: 'idle',
                    progress: 0
                }
                setItems(prev => [newItem, ...prev])
            }
        }
    }, [initialImage])

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true)
        } else if (e.type === "dragleave") {
            setDragActive(false)
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            addLocalFiles(e.dataTransfer.files)
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            addLocalFiles(e.target.files)
        }
    }

    const addLocalFiles = (files: FileList) => {
        const newItems: BgProcessItem[] = Array.from(files)
            .filter(file => file.type.startsWith('image/'))
            .map(file => ({
                id: Math.random().toString(36).substring(7),
                name: file.name,
                originalUrlOrPreview: URL.createObjectURL(file),
                processedUrl: null,
                status: 'idle',
                progress: 0,
                file
            }))
        setItems(prev => [...prev, ...newItems])
    }

    const removeItem = (id: string) => {
        setItems(prev => {
            const updated = prev.filter(item => {
                if (item.id === id) {
                    // Revoke object URLs to avoid memory leaks
                    if (item.originalUrlOrPreview.startsWith('blob:')) {
                        URL.revokeObjectURL(item.originalUrlOrPreview)
                    }
                    if (item.processedUrl) {
                        URL.revokeObjectURL(item.processedUrl)
                    }
                    return false
                }
                return true
            })
            return updated
        })
    }

    const updateItem = (id: string, updates: Partial<BgProcessItem>) => {
        setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item))
    }

    const processItemBg = async (item: BgProcessItem) => {
        if (item.status === 'processing' || item.status === 'completed') return

        updateItem(item.id, { status: 'processing', progress: 0, error: undefined })

        try {
            // Dynamically import @imgly/background-removal to prevent SSR issues
            const imgly = await import('@imgly/background-removal')
            
            let imageSource: string | Blob = item.originalUrlOrPreview

            // If it's a library image (absolute URL), fetch it to feed it as a Blob
            if (item.originalUrlOrPreview.startsWith('http')) {
                const res = await fetch(item.originalUrlOrPreview)
                if (!res.ok) throw new Error('Failed to fetch image source from library due to network or CORS')
                imageSource = await res.blob()
            }

            const config = {
                model: 'isnet' as const,
                progress: (key: string, current: number, total: number) => {
                    const percent = Math.round((current / total) * 100)
                    updateItem(item.id, { progress: percent })
                }
            }

            const resultBlob = await imgly.removeBackground(imageSource, config)
            const processedUrl = URL.createObjectURL(resultBlob)

            const originalName = item.name.replace(/\.[^.]+$/, '')
            const file = new File([resultBlob], `${originalName}-nobg.png`, { type: 'image/png' })

            updateItem(item.id, {
                status: 'completed',
                processedUrl,
                file,
                progress: 100
            })
        } catch (err: any) {
            console.error('Background removal error:', err)
            updateItem(item.id, {
                status: 'failed',
                error: err.message || 'Background removal failed',
                progress: 0
            })
        }
    }

    const processAll = async () => {
        const idleItems = items.filter(item => item.status === 'idle' || item.status === 'failed')
        if (idleItems.length === 0) return

        setGlobalProcessing(true)
        for (const item of idleItems) {
            await processItemBg(item)
        }
        setGlobalProcessing(false)
    }

    const handleUploadProcessed = async (uploadType: 'cloudinary' | 'cloudflare') => {
        const completedItems = items.filter(item => item.status === 'completed' && item.file)
        if (completedItems.length === 0) return

        setUploading(true)
        setUploadProgress(0)

        try {
            const formData = new FormData()
            completedItems.forEach(item => {
                if (item.file) {
                    formData.append('files', item.file)
                }
            })
            formData.append('type', uploadType)

            await new Promise<void>((resolve, reject) => {
                const xhr = new XMLHttpRequest()
                xhr.open('POST', '/api/library/upload-file')

                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        const percent = Math.round((e.loaded / e.total) * 100)
                        setUploadProgress(percent)
                    }
                })

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve()
                    } else {
                        reject(new Error('Upload failed with status ' + xhr.status))
                    }
                }

                xhr.onerror = () => reject(new Error('Network error occurred during upload'))
                xhr.send(formData)
            })

            // Cleanup completed items
            setItems(prev => {
                const remaining = prev.filter(item => {
                    if (item.status === 'completed') {
                        if (item.originalUrlOrPreview.startsWith('blob:')) {
                            URL.revokeObjectURL(item.originalUrlOrPreview)
                        }
                        if (item.processedUrl) {
                            URL.revokeObjectURL(item.processedUrl)
                        }
                        return false
                    }
                    return true
                })
                return remaining
            })

            onLibraryRefresh()
            onSwitchTab('library')
        } catch (error) {
            console.error('Failed to upload processed images:', error)
            alert('Upload failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
        } finally {
            setUploading(false)
        }
    }

    const hasCompletedItems = items.some(item => item.status === 'completed')
    const hasIdleItems = items.some(item => item.status === 'idle' || item.status === 'failed')

    return (
        <div className="space-y-6">
            {items.length === 0 ? (
                /* Empty state / Drag & Drop Upload Zone */
                <div
                    className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-200 cursor-pointer ${
                        dragActive
                            ? 'border-blue-500 bg-blue-50/50 shadow-inner'
                            : 'border-gray-200 hover:border-blue-400 hover:bg-gray-50/50'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        multiple
                        onChange={handleFileChange}
                    />
                    <div className="space-y-4 max-w-sm mx-auto flex flex-col items-center">
                        <div className="p-4 rounded-full bg-blue-50 text-blue-500 transition duration-300">
                            <Icon icon="solar:magic-stick-3-bold-duotone" width={40} />
                        </div>
                        <div>
                            <p className="text-base font-semibold text-gray-800">
                                AI Background Removal
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                Drag and drop images here, choose files, or click the magic wand icon on library images.
                            </p>
                        </div>
                        <button
                            type="button"
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
                        >
                            Choose Images
                        </button>
                    </div>
                </div>
            ) : (
                /* Files List & Management Panel */
                <div className="space-y-4">
                    {/* Header Controls */}
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-700">
                                Queue ({items.length} image{items.length !== 1 ? 's' : ''})
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="px-3 py-1.5 border border-gray-200 text-gray-600 hover:bg-white text-xs font-bold rounded-lg transition flex items-center gap-1.5"
                                disabled={globalProcessing || uploading}
                            >
                                <Icon icon="solar:add-circle-bold" width={14} /> Add Images
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                multiple
                                onChange={handleFileChange}
                            />
                            <button
                                type="button"
                                onClick={processAll}
                                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition flex items-center gap-1.5"
                                disabled={!hasIdleItems || globalProcessing || uploading}
                            >
                                <Icon icon="solar:play-bold" width={14} /> Process All
                            </button>
                        </div>
                    </div>

                    {/* Image Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto pr-1">
                        {items.map(item => (
                            <div key={item.id} className="border border-gray-100 rounded-xl p-3 bg-white shadow-xs flex gap-3 relative group">
                                {/* Thumbnail displays */}
                                <div className="flex gap-2 shrink-0">
                                    {/* Original thumbnail */}
                                    <div className="w-20 h-20 rounded-lg overflow-hidden border border-gray-100 bg-gray-50 flex items-center justify-center relative">
                                        <img src={item.originalUrlOrPreview} alt="Original" className="w-full h-full object-cover" />
                                        <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[8px] font-bold px-1 py-0.5 rounded uppercase">Orig</span>
                                    </div>

                                    {/* Processed/Result thumbnail */}
                                    <div className="w-20 h-20 rounded-lg overflow-hidden border border-dashed border-gray-200 bg-gray-100 flex items-center justify-center relative">
                                        {item.status === 'completed' && item.processedUrl ? (
                                            <>
                                                {/* Transparent checkerboard background */}
                                                <div className="absolute inset-0 bg-[linear-gradient(45deg,#ccc_25%,transparent_25%),linear-gradient(-45deg,#ccc_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#ccc_75%),linear-gradient(-45deg,transparent_75%,#ccc_75%)] bg-size-[8px_8px] bg-position-[0_0,0_4px,4px_-4px,-4px_0] opacity-35" />
                                                <img src={item.processedUrl} alt="Processed" className="w-full h-full object-contain relative z-10" />
                                                <span className="absolute bottom-1 left-1 bg-blue-600 text-white text-[8px] font-bold px-1 py-0.5 rounded uppercase z-10">Clear</span>
                                            </>
                                        ) : item.status === 'processing' ? (
                                            <div className="flex flex-col items-center justify-center p-2 text-blue-500">
                                                <Icon icon="line-md:loading-twotone-loop" width={24} />
                                                <span className="text-[10px] font-bold mt-1 text-blue-600">{item.progress}%</span>
                                            </div>
                                        ) : item.status === 'failed' ? (
                                            <div className="text-red-500 flex items-center justify-center">
                                                <Icon icon="solar:danger-bold" width={24} />
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 text-[10px] font-medium text-center px-1">Waiting...</span>
                                        )}
                                    </div>
                                </div>

                                {/* Text & status info */}
                                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                                    <div className="space-y-1">
                                        <p className="text-xs font-semibold text-gray-800 truncate" title={item.name}>
                                            {item.name}
                                        </p>
                                        <div className="flex items-center gap-1.5">
                                            {item.status === 'completed' && (
                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-bold rounded">
                                                    <Icon icon="solar:check-circle-bold" width={10} /> Completed
                                                </span>
                                            )}
                                            {item.status === 'processing' && (
                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[9px] font-bold rounded">
                                                    Processing...
                                                </span>
                                            )}
                                            {item.status === 'failed' && (
                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-50 text-red-700 text-[9px] font-bold rounded" title={item.error}>
                                                    Failed
                                                </span>
                                            )}
                                            {item.status === 'idle' && (
                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-50 text-gray-600 text-[9px] font-bold rounded">
                                                    Ready
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action button */}
                                    {(item.status === 'idle' || item.status === 'failed') && (
                                        <button
                                            type="button"
                                            onClick={() => processItemBg(item)}
                                            className="w-fit px-2.5 py-1 bg-gray-800 hover:bg-gray-900 text-white text-[10px] font-bold rounded-md shadow-xs transition"
                                            disabled={globalProcessing || uploading}
                                        >
                                            Process
                                        </button>
                                    )}
                                </div>

                                {/* Remove item button */}
                                <button
                                    type="button"
                                    onClick={() => removeItem(item.id)}
                                    className="absolute top-2 right-2 text-gray-300 hover:text-red-500 p-1 rounded-full transition duration-150 opacity-0 group-hover:opacity-100"
                                    disabled={item.status === 'processing' || uploading}
                                >
                                    <Icon icon="solar:close-circle-bold" width={18} />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Progress indicators & Final uploads */}
                    <div className="space-y-3 pt-3 border-t border-gray-100">
                        {uploading && (
                            <div className="space-y-1.5 bg-blue-50/50 border border-blue-100/50 rounded-xl p-3.5">
                                <div className="flex items-center justify-between text-xs font-bold text-blue-700">
                                    <span>Uploading processed images to library...</span>
                                    <span>{uploadProgress}%</span>
                                </div>
                                <div className="w-full bg-blue-100 rounded-full h-1.5 overflow-hidden">
                                    <div className="bg-blue-600 h-1.5 rounded-full transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
                                </div>
                            </div>
                        )}

                        {hasCompletedItems && !uploading && (
                            <div className="flex flex-col gap-2 p-3 bg-emerald-50/40 border border-emerald-100/40 rounded-xl">
                                <p className="text-[10px] text-emerald-800 font-semibold flex items-center gap-1">
                                    <Icon icon="solar:info-circle-bold" width={12} />
                                    Choose where to save the background-removed PNG image(s):
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleUploadProcessed('cloudinary')}
                                        className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center justify-center gap-1.5"
                                        disabled={globalProcessing}
                                    >
                                        <Icon icon="solar:upload-bold" width={14} /> Upload to Cloudinary
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleUploadProcessed('cloudflare')}
                                        className="flex-1 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center justify-center gap-1.5"
                                        disabled={globalProcessing}
                                    >
                                        <Icon icon="solar:upload-bold" width={14} /> Upload to Cloudflare
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
