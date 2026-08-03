'use client';

/**
 * Social Media Share Component
 * cms/components/Share.tsx
 *
 * Provides social media sharing links and copy-to-clipboard functionality.
 */

import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';

interface ShareProps {
    title?: string;
    url?: string;
    description?: string;
    className?: string;
}

export default function Share({
    title = '',
    url = '',
    description = '',
    className = '',
}: ShareProps) {
    const [shareUrl, setShareUrl] = useState(url);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!url && typeof window !== 'undefined') {
            setShareUrl(window.location.href);
        } else {
            setShareUrl(url);
        }
    }, [url]);

    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedTitle = encodeURIComponent(title);

    const shareLinks = [
        {
            name: 'Facebook',
            icon: 'ic:baseline-facebook',
            color: 'bg-[#1877F2] text-white hover:bg-[#0d65d9]',
            href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
        },
        {
            name: 'X (Twitter)',
            icon: 'ri:twitter-x-fill',
            color: 'bg-black text-white hover:bg-gray-800',
            href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
        },
        {
            name: 'LinkedIn',
            icon: 'ri:linkedin-fill',
            color: 'bg-[#0A66C2] text-white hover:bg-[#084e96]',
            href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
        },
        {
            name: 'WhatsApp',
            icon: 'ri:whatsapp-fill',
            color: 'bg-[#25D366] text-white hover:bg-[#20bd5a]',
            href: `https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`,
        },
    ];

    const handleCopy = async () => {
        if (!shareUrl) return;
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy link:', err);
        }
    };

    return (
        <div className={`${className}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                    <Icon icon="solar:share-bold" className="text-emerald-700 w-5 h-5" />
                    <span>Share:</span>
                </div>

                <div className="flex items-center flex-wrap gap-2">
                    {shareLinks.map((item) => (
                        <a
                            key={item.name}
                            href={item.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`p-2 sm:px-3 sm:py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all shadow-2xs hover:scale-105 active:scale-95 ${item.color}`}
                            title={`Share on ${item.name}`}
                        >
                            <Icon icon={item.icon} className="w-4 h-4" />
                            <span className="hidden sm:inline">{item.name}</span>
                        </a>
                    ))}

                    <button
                        onClick={handleCopy}
                        type="button"
                        className="p-2 sm:px-3 sm:py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer"
                        title="Copy Link"
                    >
                        <Icon
                            icon={copied ? 'solar:check-circle-bold' : 'solar:link-round-bold'}
                            className={`w-4 h-4 ${copied ? 'text-emerald-600' : 'text-gray-600'}`}
                        />
                        <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy Link'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
