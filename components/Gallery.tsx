'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import NextImage from 'next/image'
import { Library } from '@/models/Library'
import { Icon } from '@iconify/react'
import GalleryBg from './GalleryBg'

const isVideoUrl = (url: string): boolean => {
    if (!url) return false;
    const cleanUrl = url.toLowerCase().split('?')[0].split('#')[0];
    return (
        cleanUrl.endsWith('.mp4') ||
        cleanUrl.endsWith('.webm') ||
        cleanUrl.endsWith('.ogg') ||
        cleanUrl.endsWith('.mov') ||
        cleanUrl.endsWith('.mkv') ||
        cleanUrl.endsWith('.avi') ||
        url.includes('/video/upload/')
    );
};

interface GalleryProps {
    multiple?: boolean
    value?: string | string[]
    onChange?: (value: string | string[]) => void
    placeholder?: string
}

interface GalleryModalProps {
    isOpen: boolean
    onClose: () => void
    multiple: boolean
    selectedImages: string[]
    onSelect: (images: string | string[]) => void
}

export function GalleryModal({ isOpen, onClose, multiple, selectedImages, onSelect }: GalleryModalProps) {
    const [mounted, setMounted] = useState(false)
    const [activeTab, setActiveTab] = useState<'library' | 'cloudinary' | 'cloudflare' | 'url' | 'bg-removal'>('library')
    const [libraryImages, setLibraryImages] = useState<Library[]>([])
    const [loading, setLoading] = useState(false)
    const [selected, setSelected] = useState<string[]>(selectedImages)
    const [urlInput, setUrlInput] = useState('')
    const [dragActive, setDragActive] = useState(false)
    const [previewFiles, setPreviewFiles] = useState<{ file: File; preview: string }[]>([])
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [uploadProgress, setUploadProgress] = useState(0)
    const [mediaFilter, setMediaFilter] = useState<'all' | 'image' | 'video'>('all')
    const [bgRemovalImage, setBgRemovalImage] = useState<string | null>(null)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (isOpen && activeTab === 'library') {
            fetchLibraryImages()
        }
    }, [isOpen, activeTab])

    useEffect(() => {
        if (isOpen) {
            setSelected(selectedImages)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen])

    const fetchLibraryImages = async () => {
        setLoading(true)
        try {
            const response = await fetch('/api/library')
            if (response.ok) {
                const images = await response.json()
                setLibraryImages(images)
            }
        } catch (error) {
            console.error('Failed to fetch library images:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleImageSelect = (url: string) => {
        if (multiple) {
            setSelected(prev =>
                prev.includes(url)
                    ? prev.filter(img => img !== url)
                    : [...prev, url]
            )
        } else {
            setSelected([url])
        }
    }

    const handleConfirm = () => {
        onSelect(multiple ? selected : selected[0] || '')
        onClose()
    }
    const handleUrlSubmit = async () => {
        const urls = urlInput.split('\n').filter(url => url.trim())
        if (urls.length === 0) return

        try {
            setLoading(true)
            const response = await fetch('/api/library/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ urls, type: 'url' })
            })

            if (response.ok) {
                setUrlInput('')
                setActiveTab('library')
                fetchLibraryImages()
            }
        } catch (error) {
            console.error('Failed to add URLs:', error)
        } finally {
            setLoading(false)
        }
    }
    const handleFileSelect = (files: FileList | null) => {
        if (!files || files.length === 0) return

        const newPreviews = Array.from(files).map(file => ({
            file,
            preview: URL.createObjectURL(file)
        }))

        setPreviewFiles(prev => [...prev, ...newPreviews])
    }

    const removePreview = (index: number) => {
        setPreviewFiles(prev => {
            const updated = [...prev]
            URL.revokeObjectURL(updated[index].preview)
            updated.splice(index, 1)
            return updated
        })
    }

    const compressToWebP = (file: File): Promise<File> => {
        return new Promise((resolve) => {
            if (!file.type.startsWith('image/')) {
                resolve(file)
                return
            }
            const url = URL.createObjectURL(file)

            const draw = (source: HTMLImageElement | ImageBitmap) => {
                const canvas = document.createElement('canvas')
                const maxW = 1920
                const w = 'naturalWidth' in source ? source.naturalWidth : source.width
                const h = 'naturalHeight' in source ? source.naturalHeight : source.height
                const scale = w > maxW ? maxW / w : 1
                canvas.width = w * scale
                canvas.height = h * scale
                const ctx = canvas.getContext('2d')!
                ctx.drawImage(source as CanvasImageSource, 0, 0, canvas.width, canvas.height)
                URL.revokeObjectURL(url)
                canvas.toBlob(
                    (blob) => {
                        if (blob && blob.size < file.size) {
                            const name = file.name.replace(/\.[^.]+$/, '.webp')
                            resolve(new File([blob], name, { type: 'image/webp' }))
                        } else {
                            resolve(file)
                        }
                    },
                    'image/webp',
                    0.82
                )
            }

            // Try createImageBitmap first — handles avif, heic, tiff, etc. in supported browsers
            if (typeof createImageBitmap !== 'undefined') {
                createImageBitmap(file)
                    .then((bitmap) => { draw(bitmap); bitmap.close() })
                    .catch(() => {
                        // Fallback to <img> for formats createImageBitmap can't handle
                        const img = new Image()
                        img.onload = () => draw(img)
                        img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
                        img.src = url
                    })
            } else {
                const img = new Image()
                img.onload = () => draw(img)
                img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
                img.src = url
            }
        })
    }

    const handleUpload = async (uploadType: 'cloudinary' | 'cloudflare') => {
        if (previewFiles.length === 0) return

        setLoading(true)
        setUploadProgress(0)

        try {
            const compressed = await Promise.all(previewFiles.map(({ file }) => compressToWebP(file)))
            const formData = new FormData()
            compressed.forEach((file) => formData.append('files', file))
            formData.append('type', uploadType)

            await new Promise<void>((resolve, reject) => {
                const xhr = new XMLHttpRequest()
                xhr.open('POST', '/api/library/upload-file')

                // Track actual progress
                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        const percent = Math.round((e.loaded / e.total) * 100)
                        setUploadProgress(percent)
                    }
                })

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        // Clean up previews
                        previewFiles.forEach(({ preview }) => URL.revokeObjectURL(preview))
                        setPreviewFiles([])
                        
                        // Switch to library tab so the user sees the uploaded images
                        setActiveTab('library')
                        fetchLibraryImages()
                        resolve()
                    } else {
                        let errorMsg = `Upload failed (${xhr.status})`
                        try {
                            const error = JSON.parse(xhr.responseText)
                            errorMsg = error?.message || error?.error || errorMsg
                        } catch {
                            errorMsg = xhr.responseText || errorMsg
                        }
                        console.error('Upload failed:', errorMsg)
                        reject(new Error(errorMsg))
                    }
                }

                xhr.onerror = () => {
                    reject(new Error('Network upload error'))
                }
                xhr.send(formData)
            })
        } catch (error) {
            console.error('Upload error:', error)
        } finally {
            setLoading(false)
        }
    }

    const isVideoUrl = (url: string) => {
        return url.match(/\.(mp4|webm|ogg|mov)$/i) !== null
    }

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true)
        else if (e.type === 'dragleave') setDragActive(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files)
        }
    }

    const modalContent = (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-800">Media Library</h2>
                    <div className="flex gap-2">
                        {['library', 'cloudinary', 'cloudflare', 'url', 'bg-removal'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => {
                                    setActiveTab(tab as any)
                                    if (tab !== 'bg-removal') {
                                        setBgRemovalImage(null)
                                    }
                                }}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                                    activeTab === tab ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'
                                }`}
                            >
                                {tab === 'bg-removal' ? 'Bg Removal' : tab === 'url' ? 'URL' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </button>
                        ))}
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400">
                        <Icon icon="solar:close-circle-bold" width={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2 md:p-4">
                    {activeTab === 'library' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex gap-2">
                                    {(['all', 'image', 'video'] as const).map(filter => (
                                        <button
                                            key={filter}
                                            onClick={() => setMediaFilter(filter)}
                                            className={`px-3 py-1 text-[11px] font-bold rounded-lg uppercase transition ${
                                                mediaFilter === filter ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                            }`}
                                        >
                                            {filter}
                                        </button>
                                    ))}
                                </div>
                                
                                <button
                                    onClick={handleConfirm}
                                    disabled={selected.length === 0}
                                    className="px-4 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg shadow-sm disabled:opacity-50 hover:bg-blue-700 transition"
                                >
                                    Select ({selected.length})
                                </button>
                            </div>

                            {loading ? (
                                <div className="flex items-center justify-center py-20 text-blue-500">
                                    <Icon icon="line-md:loading-twotone-loop" width={32} />
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                    {libraryImages
                                        .filter(image => {
                                            const isVid = isVideoUrl(image.url);
                                            if (mediaFilter === 'image') return !isVid;
                                            if (mediaFilter === 'video') return isVid;
                                            return true;
                                        })
                                        .map(image => {
                                            const isVid = isVideoUrl(image.url);
                                            const isSelected = selected.includes(image.url);
                                            return (
                                                <div
                                                    key={image.id || image._id?.toString()}
                                                    className={`relative cursor-pointer border rounded-xl overflow-hidden bg-gray-50 flex flex-col transition group hover:shadow-md ${
                                                        isSelected
                                                            ? 'border-blue-600 ring-2 ring-blue-500/20'
                                                            : 'border-gray-200 hover:border-gray-300'
                                                    }`}
                                                    onClick={() => handleImageSelect(image.url)}
                                                >
                                                    {/* Thumbnail preview */}
                                                    <div className="relative w-full h-28 overflow-hidden bg-white flex items-center justify-center border-b border-gray-100">
                                                        {isVid ? (
                                                            // Video element playable on hover
                                                            <div className="relative w-full h-full group/video">
                                                                <video
                                                                    src={image.url}
                                                                    className="w-full h-full object-cover"
                                                                    preload="metadata"
                                                                    muted
                                                                    loop
                                                                    onMouseEnter={(e) => {
                                                                        e.currentTarget.play().catch(() => {});
                                                                    }}
                                                                    onMouseLeave={(e) => {
                                                                        e.currentTarget.pause();
                                                                        e.currentTarget.currentTime = 0;
                                                                    }}
                                                                />
                                                                <div className="absolute inset-0 bg-black/25 flex items-center justify-center transition group-hover/video:bg-transparent">
                                                                    <div className="p-1.5 rounded-full bg-white/90 shadow text-gray-700">
                                                                        <Icon icon="solar:play-bold" width={16} />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <img
                                                                src={image.url}
                                                                alt={image.name}
                                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                                                loading="lazy"
                                                            />
                                                        )}
                                                    </div>
                                                    
                                                    {/* Text details */}
                                                    <div className="p-2 bg-white flex-1 min-w-0">
                                                        <p className="text-xs font-semibold text-gray-800 truncate" title={image.name}>
                                                            {image.name}
                                                        </p>
                                                        <p className="text-[10px] text-gray-400 capitalize font-medium mt-0.5">
                                                            {isVid ? 'video' : 'image'}
                                                        </p>
                                                    </div>
                                                     {/* Selection icon overlay */}
                                                     {isSelected && (
                                                         <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full p-1 shadow border border-white">
                                                             <Icon icon="solar:check-circle-bold" width={16} />
                                                         </div>
                                                     )}
                                                     {!isVid && (
                                                         <button
                                                             type="button"
                                                             onClick={(e) => {
                                                                 e.stopPropagation()
                                                                 setBgRemovalImage(image.url)
                                                                 setActiveTab('bg-removal')
                                                             }}
                                                             className="absolute top-2 left-2 p-1.5 bg-white/90 hover:bg-white text-blue-600 rounded-lg shadow-sm border border-gray-100 hover:scale-105 active:scale-95 transition flex items-center justify-center opacity-0 group-hover:opacity-100 z-20"
                                                             title="Remove Background"
                                                         >
                                                             <Icon icon="solar:magic-stick-3-bold-duotone" width={14} />
                                                         </button>
                                                     )}
                                                </div>
                                            );
                                        })}
                                </div>
                            )}
                        </div>
                    )}
                    {(activeTab === 'cloudinary' || activeTab === 'cloudflare') && (
                        <div className="space-y-6">
                            {/* Upload Area / Drag & Drop */}
                            {previewFiles.length === 0 ? (
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
                                    <div className="space-y-4 max-w-sm mx-auto flex flex-col items-center">
                                        <div className="p-4 rounded-full bg-blue-50 text-blue-500 transition duration-300">
                                            <Icon icon="solar:cloud-upload-bold" width={40} />
                                        </div>
                                        <div>
                                            <p className="text-base font-semibold text-gray-800">
                                                Upload to {activeTab === 'cloudinary' ? 'Cloudinary' : 'Cloudflare'}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Drag and drop your images here, or click to choose from directory
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
                                            disabled={loading}
                                        >
                                            Choose Files
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4 border border-gray-100 rounded-2xl p-4 bg-white shadow-xs">
                                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-50 pb-4">
                                        <div>
                                            <h3 className="text-sm font-semibold text-gray-800">
                                                Upload Queue
                                            </h3>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {previewFiles.length} file{previewFiles.length !== 1 ? 's' : ''} queued for {activeTab}
                                            </p>
                                        </div>
                                        
                                        {!loading && (
                                            <button
                                                type="button"
                                                onClick={() => handleUpload(activeTab)}
                                                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5"
                                            >
                                                <Icon icon="solar:cloud-upload-bold" width={16} />
                                                Upload All
                                            </button>
                                        )}
                                    </div>

                                    {/* Real-time Progress Bar */}
                                    {loading && (
                                        <div className="space-y-2 py-2">
                                            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                                            </div>
                                            <p className="text-[10px] text-gray-500 font-medium mt-1">
                                                Uploading... {uploadProgress}%
                                            </p>
                                        </div>
                                    )}

                                    {/* Multi-image layout grid for files queue */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-96 overflow-y-auto p-1 mt-4">
                                        {/* 1. File list */}
                                        {previewFiles.map((item, index) => {
                                            const isVid = item.file.type.startsWith('video/') || ['mp4', 'webm', 'ogg', 'mov', 'mkv', 'avi'].includes(item.file.name.split('.').pop()?.toLowerCase() || '');
                                            return (
                                                <div key={index} className="relative group rounded-xl border border-gray-200 p-1 bg-white flex items-center justify-center h-28 overflow-hidden shadow-xs hover:border-gray-300 transition">
                                                    {isVid ? (
                                                        <video
                                                            src={item.preview}
                                                            className="w-full h-full object-cover rounded-lg"
                                                            muted
                                                        />
                                                    ) : (
                                                        <NextImage
                                                            src={item.preview}
                                                            alt={item.file.name}
                                                            width={200}
                                                            height={150}
                                                            className="w-full h-full object-cover rounded-lg"
                                                        />
                                                    )}
                                                    {!loading && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removePreview(index)}
                                                            className="absolute top-2 right-2 text-red-500 hover:text-red-600 transition duration-150 hover:scale-110 active:scale-95 bg-white rounded-full shadow"
                                                            title="Remove preview"
                                                        >
                                                            <Icon icon="solar:close-circle-bold" width={18} />
                                                        </button>
                                                    )}
                                                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] px-1.5 py-1 truncate rounded-b-lg font-medium">
                                                        {item.file.name}
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* 2. Single Add box at the end of the list */}
                                        {!loading && (
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="w-full h-28 border-2 border-dashed border-gray-200 hover:border-blue-500 hover:text-blue-600 rounded-xl transition flex flex-col items-center justify-center gap-1.5 bg-gray-50/50 hover:bg-blue-50/10 cursor-pointer"
                                                title="Add more files"
                                            >
                                                <Icon icon="solar:add-circle-bold" width={22} className="text-blue-500" />
                                                <span className="text-[10px] font-bold text-gray-500">Add Files</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Hidden file input */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept="image/*,video/*,.avif,.heic,.heif,.tiff,.tif,.bmp,.svg,.webp"
                                className="hidden"
                                onChange={(e) => handleFileSelect(e.target.files)}
                                disabled={loading}
                            />
                        </div>
                    )}
                    {activeTab === 'url' && (
                        <div className="space-y-6 w-full">
                            <div className="border border-gray-100 p-2 rounded-2xl bg-white shadow-xs space-y-4">
                                <div className="flex items-center gap-3 pb-2">
                                    <div className="p-3 rounded-full bg-indigo-50 text-indigo-600">
                                        <Icon icon="solar:link-circle-bold" width={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-semibold text-gray-800">
                                            Import Media from URL or CDN
                                        </h3>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            Add absolute URLs to import images or videos (mp4) directly into the library.
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="url-input" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Absolute Media URLs (one per line)
                                    </label>
                                    <textarea
                                        id="url-input"
                                        value={urlInput}
                                        onChange={(e) => setUrlInput(e.target.value)}
                                        placeholder="https://example.com/assets/images/product-1.jpg&#10;https://example.com/assets/videos/product-demo.mp4"
                                        className="w-full h-40 p-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-mono placeholder:text-gray-400/80 transition"
                                        rows={6}
                                        disabled={loading}
                                    />
                                </div>

                                <div className="flex justify-end pt-2">
                                    <button
                                        type="button"
                                        onClick={handleUrlSubmit}
                                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-2 cursor-pointer"
                                        disabled={loading || !urlInput.trim()}
                                    >
                                        {loading ? (
                                            <>
                                                <Icon icon="line-md:loading-twotone-loop" width={16} />
                                                Processing URLs...
                                            </>
                                        ) : (
                                            <>
                                                <Icon icon="solar:import-bold" width={16} />
                                                Add URLs to Library
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'bg-removal' && (
                        <GalleryBg
                            initialImage={bgRemovalImage}
                            onLibraryRefresh={fetchLibraryImages}
                            onSwitchTab={setActiveTab}
                        />
                    )}
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                    <p className="text-[11px] text-gray-400 font-medium">
                        {selected.length} item{selected.length !== 1 ? 's' : ''} selected
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirm}
                            className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg shadow-sm hover:bg-blue-700 transition"
                            disabled={selected.length === 0}
                        >
                            Select
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )

    if (!isOpen || !mounted) return null

    return createPortal(modalContent, document.body)
}

export default function Gallery({ multiple = false, value, onChange, placeholder = 'Select images' }: GalleryProps) {
    const [isModalOpen, setIsModalOpen] = useState(false)

    // Helper function to validate if a string is a valid URL
    const isValidUrl = (url: string): boolean => {
        if (!url || !url.trim()) return false
        // Check if it's a valid absolute URL or starts with /
        return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')
    }

    const [selectedImages, setSelectedImages] = useState<string[]>(() => {
        if (!value) return []
        const images = Array.isArray(value) ? value : [value]
        return images.filter(img => isValidUrl(img))
    })

    // Sync internal state when value prop changes externally (e.g. paste from another variant)
    useEffect(() => {
        if (value === undefined || value === null) return
        const images = Array.isArray(value) ? value : [value]
        const filtered = images.filter(img => isValidUrl(img))
        
        const isSame = filtered.length === selectedImages.length &&
            filtered.every((img, idx) => img === selectedImages[idx])
            
        if (!isSame) {
            setSelectedImages(filtered)
        }
    }, [value, selectedImages])

    const handleSelect = (images: string | string[]) => {
        const newSelection = Array.isArray(images) ? images : [images]
        const filtered = newSelection.filter(img => isValidUrl(img))
        setSelectedImages(filtered)
        onChange?.(multiple ? filtered : filtered[0] || '')
    }

    const removeImage = (url: string) => {
        const newSelection = selectedImages.filter(img => img !== url)
        setSelectedImages(newSelection)
        onChange?.(multiple ? newSelection : newSelection[0] || '')
    }

    return (
        <div className="space-y-2">
            {multiple ? (
                // Multi-select Version (WordPress-like gallery grid)
                selectedImages.length === 0 ? (
                    <button
                        type="button"
                        onClick={() => setIsModalOpen(true)}
                        className="w-full p-6 border-2 bg-white border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-blue-500 hover:text-blue-600 transition flex flex-col items-center justify-center gap-1.5"
                    >
                        <Icon icon="solar:gallery-wide-bold" width={24} className="text-gray-400" />
                        <span className="text-xs font-bold">{placeholder}</span>
                    </button>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {/* 2. List of all the images */}
                        {selectedImages.map((url, index) => (
                            <div key={index} className="relative group rounded-xl border border-gray-100 p-1 bg-gray-50 flex items-center justify-center h-24 overflow-hidden shadow-xs">
                                {isVideoUrl(url) ? (
                                    <video
                                        src={url}
                                        onClick={() => setIsModalOpen(true)}
                                        className="w-full h-full object-cover rounded-lg cursor-pointer hover:opacity-90 transition bg-black"
                                        muted
                                    />
                                ) : (
                                    <img
                                        src={url}
                                        alt={`Selected image ${index + 1}`}
                                        onClick={() => setIsModalOpen(true)}
                                        className="w-full h-full object-cover rounded-lg cursor-pointer hover:opacity-90 transition"
                                    />
                                )}
                                <button
                                    type="button"
                                    onClick={() => removeImage(url)}
                                    className="absolute top-2 right-2 text-red-500 hover:text-red-600 transition duration-150 hover:scale-110 active:scale-95 bg-white rounded-full shadow"
                                    title="Remove image"
                                >
                                    <Icon icon="solar:close-circle-bold" width={18} />
                                </button>
                            </div>
                        ))}

                        {/* 3. Button appears again at the end */}
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(true)}
                            className="w-full h-24 border-2 bg-white border-dashed border-gray-200 rounded-xl text-gray-400 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50/10 transition flex flex-col items-center justify-center gap-1 shrink-0"
                            title="Add more images"
                        >
                            <Icon icon="solar:add-circle-bold" width={20} className="text-blue-500" />
                            <span className="text-[10px] font-bold">Add Images</span>
                        </button>
                    </div>
                )
            ) : (
                // Single-select Version (WordPress-like featured image layout)
                selectedImages.length === 0 ? (
                    <button
                        type="button"
                        onClick={() => setIsModalOpen(true)}
                        className="w-full p-6 border-2 bg-white border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-blue-500 hover:text-blue-600 transition flex flex-col items-center justify-center gap-1.5"
                    >
                        <Icon icon="solar:gallery-wide-bold" width={24} className="text-gray-400" />
                        <span className="text-xs font-bold">{placeholder}</span>
                    </button>
                ) : (
                    // Single image container. Clicking on it opens popup, close button in corner. No other box next to it.
                    <div className="relative group w-full h-42 rounded overflow-hidden border border-gray-200 shadow-sm bg-gray-50 flex items-center justify-center">
                        {isVideoUrl(selectedImages[0]) ? (
                            <video
                                src={selectedImages[0]}
                                onClick={() => setIsModalOpen(true)}
                                className="w-min h-full max-h-42 object-cover cursor-pointer hover:opacity-95 transition bg-black"
                                muted
                            />
                        ) : (
                            <img
                                src={selectedImages[0]}
                                alt="Featured image"
                                onClick={() => setIsModalOpen(true)}
                                className="w-min h-full max-h-42 object-cover cursor-pointer hover:opacity-95 transition"
                            />
                        )}
                        <button
                            type="button"
                            onClick={() => removeImage(selectedImages[0])}
                            className="absolute top-2 right-2 text-red-500 hover:text-red-600 transition-all duration-150 hover:scale-110 active:scale-95 bg-white rounded-full shadow"
                            title="Remove image"
                        >
                            <Icon icon="solar:close-circle-bold" width={22} />
                        </button>
                    </div>
                )
            )}

            {isModalOpen && (
                <GalleryModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    multiple={multiple}
                    selectedImages={selectedImages}
                    onSelect={handleSelect}
                />
            )}
        </div>
    );
}

