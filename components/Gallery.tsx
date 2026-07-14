'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import NextImage from 'next/image'
import { Library } from '@/models/Library'

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
    const [activeTab, setActiveTab] = useState<'library' | 'cloudinary' | 'cloudflare' | 'url'>('library')
    const [libraryImages, setLibraryImages] = useState<Library[]>([])
    const [loading, setLoading] = useState(false)
    const [selected, setSelected] = useState<string[]>(selectedImages)
    const [urlInput, setUrlInput] = useState('')
    const [dragActive, setDragActive] = useState(false)
    const [previewFiles, setPreviewFiles] = useState<{ file: File; preview: string }[]>([])
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (isOpen && activeTab === 'library') {
            fetchLibraryImages()
        }
    }, [isOpen, activeTab])

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
            const response = await fetch('/api/library/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ urls, type: 'url' })
            })

            if (response.ok) {
                setUrlInput('')
                fetchLibraryImages()
            }
        } catch (error) {
            console.error('Failed to add URLs:', error)
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

        const formData = new FormData()
        const compressed = await Promise.all(previewFiles.map(({ file }) => compressToWebP(file)))
        compressed.forEach((file) => formData.append('files', file))
        formData.append('type', uploadType)

        try {
            setLoading(true)
            const response = await fetch('/api/library/upload-file', {
                method: 'POST',
                body: formData
            })

            if (response.ok) {
                // Clean up previews
                previewFiles.forEach(({ preview }) => URL.revokeObjectURL(preview))
                setPreviewFiles([])

                // Switch to library tab so the user sees the uploaded images
                setActiveTab('library')
                fetchLibraryImages()
            } else {
                let errorMsg = `Upload failed (${response.status})`
                try {
                    const error = await response.json()
                    errorMsg = error?.message || error?.error || JSON.stringify(error) || errorMsg
                } catch {
                    errorMsg = await response.text().catch(() => errorMsg)
                }
                console.error('Upload failed:', errorMsg)
            }
        } catch (error) {
            console.error('Upload error:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true)
        } else if (e.type === 'dragleave') {
            setDragActive(false)
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)

        const files = e.dataTransfer.files
        handleFileSelect(files)
    }

    if (!isOpen) return null

    const modalContent = (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center" style={{ zIndex: 9999 }}>
            <div className="bg-white rounded-lg w-full max-w-7xl h-3/4 flex flex-col">
                <div className="p-4 border-b">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">Select Images</h2>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                            ✕
                        </button>
                    </div>

                    <div className="flex space-x-4">
                        {(['library', 'cloudinary', 'cloudflare', 'url'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-4 py-2 rounded ${activeTab === tab
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                            >
                                {tab === 'library' ? 'Image Library' :
                                    tab === 'url' ? 'Images URL CDN' :
                                        tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 p-4 overflow-auto">
                    {activeTab === 'library' && (
                        <div>
                            {loading ? (
                                <div className="text-center py-8">Loading...</div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                                    {libraryImages.map(image => (
                                        <div
                                            key={image.id}
                                            className={`relative cursor-pointer border-2 rounded-lg overflow-hidden ${selected.includes(image.url) ? 'border-blue-500' : 'border-gray-200'
                                                }`}
                                            onClick={() => handleImageSelect(image.url)}
                                        >
                                            <NextImage
                                                src={image.url}
                                                alt={image.name}
                                                width={200}
                                                height={150}
                                                className="w-full h-32 object-cover"
                                            />
                                            <div className="p-2">
                                                <p className="text-sm truncate">{image.name}</p>
                                            </div>
                                            {selected.includes(image.url) && (
                                                <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
                                                    ✓
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {(activeTab === 'cloudinary' || activeTab === 'cloudflare') && (
                        <div className="space-y-4">
                            <div
                                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                                    }`}
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                            >
                                <div className="space-y-4">
                                    <div className="text-4xl text-gray-400">📁</div>
                                    <div>
                                        <p className="text-lg font-medium">
                                            Upload to {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                                        </p>
                                        <p className="text-gray-600">
                                            Drag and drop files here, or click to select
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                                        disabled={loading}
                                    >
                                        Choose Files
                                    </button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        multiple
                                        accept="image/*,.avif,.heic,.heif,.tiff,.tif,.bmp,.svg,.webp"
                                        className="hidden"
                                        onChange={(e) => handleFileSelect(e.target.files)}
                                    />
                                </div>
                            </div>

                            {previewFiles.length > 0 && (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-lg font-medium">
                                            Preview ({previewFiles.length} image{previewFiles.length !== 1 ? 's' : ''})
                                        </h3>
                                        <button
                                            onClick={() => handleUpload(activeTab)}
                                            className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 font-medium"
                                            disabled={loading}
                                        >
                                            {loading ? 'Uploading...' : 'Upload All'}
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-96 overflow-y-auto p-2 border rounded-lg">
                                        {previewFiles.map((item, index) => (
                                            <div key={index} className="relative group">
                                                <NextImage
                                                    src={item.preview}
                                                    alt={item.file.name}
                                                    width={200}
                                                    height={150}
                                                    className="w-full h-32 object-cover rounded border"
                                                />
                                                <button
                                                    onClick={() => removePreview(index)}
                                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                                    disabled={loading}
                                                >
                                                    ✕
                                                </button>
                                                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs p-1 truncate">
                                                    {item.file.name}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="text-sm text-gray-600">
                                <p>• Supported formats: JPEG, PNG, WebP, AVIF, HEIC, TIFF, BMP and more</p>
                                <p>• Maximum file size: 10MB per file</p>
                                <p>• All images are automatically converted to WebP format</p>
                                <p>• After upload, the Library tab will open automatically</p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'url' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Add Image URLs (one per line)
                                </label>
                                <textarea
                                    value={urlInput}
                                    onChange={(e) => setUrlInput(e.target.value)}
                                    placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg"
                                    className="w-full h-32 p-3 border rounded-lg"
                                    rows={6}
                                />
                                <button
                                    onClick={handleUrlSubmit}
                                    className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                                >
                                    Add URLs to Library
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t flex justify-between items-center">
                    <div className="text-sm text-gray-600">
                        {selected.length} image{selected.length !== 1 ? 's' : ''} selected
                    </div>
                    <div className="space-x-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirm}
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                            disabled={selected.length === 0}
                        >
                            Select
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )

    return typeof window !== 'undefined' ? createPortal(modalContent, document.body) : null
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
        setSelectedImages(filtered)
    }, [value])

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
            <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="w-full p-3 border-2 bg-white border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors"
            >
                {selectedImages.length > 0
                    ? `${selectedImages.length} img${selectedImages.length !== 1 ? 's' : ''} selected`
                    : placeholder
                }
            </button>

            {selectedImages.length > 0 && (
                <div className={`grid ${selectedImages.length === 1 ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'} gap-2`}>
                    {selectedImages.map((url, index) => (
                        <div key={index} className="relative group rounded-md border p-2">
                            <NextImage
                                src={url}
                                alt={`Selected image ${index + 1}`}
                                width={150}
                                height={100}
                                className={`w-full ${selectedImages.length === 1 ? 'h-40' : 'h-10'} object-cover rounded`}
                            />
                            <button
                                onClick={() => removeImage(url)}
                                className="absolute top-1 right-1 bg-red-500 text-white w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <GalleryModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                multiple={multiple}
                selectedImages={selectedImages}
                onSelect={handleSelect}
            />
        </div>
    )
}