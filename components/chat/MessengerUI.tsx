"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Icon } from "@iconify/react";
import { io, Socket } from "socket.io-client";
import { EXPRESS_API, LICENSE_KEY, xFetch } from "@/lib/express";
import { useToast } from "@/components/ui/Toast";

interface UserProfile {
    _id: string;
    name: string;
    slug: string;
    image?: string;
    email?: string;
    type?: string;
    status?: string;
}

interface ProductContext {
    productId?: string;
    title?: string;
    image?: string;
    price?: number;
    slug?: string;
}

interface ChatMessage {
    _id: string;
    senderId: string;
    receiverId: string;
    message: string;
    productContext?: ProductContext;
    read: boolean;
    createdAt: string;
}

interface ConversationItem {
    user: UserProfile;
    lastMessage: ChatMessage;
    unreadCount: number;
}

interface MessengerUIProps {
    targetSlug?: string;
}

export default function MessengerUI({ targetSlug }: MessengerUIProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: session, status: authStatus } = useSession();
    const { error: toastError } = useToast();

    const currentUser = (session?.user as any) ?? null;
    const currentUserId = currentUser?._id || currentUser?.id || "";

    // ── Product Context from URL ───────────────────────────────────────────────
    const urlProductId = searchParams.get("productId") || undefined;
    const urlProductTitle = searchParams.get("productTitle") || undefined;
    const urlProductImage = searchParams.get("productImage") || undefined;
    const urlProductPrice = searchParams.get("productPrice")
        ? parseFloat(searchParams.get("productPrice")!)
        : undefined;
    const urlProductSlug = searchParams.get("productSlug") || undefined;

    const urlProductContext = useMemo<ProductContext | undefined>(() => {
        if (urlProductTitle || urlProductId) {
            return {
                productId: urlProductId,
                title: urlProductTitle,
                image: urlProductImage,
                price: urlProductPrice,
                slug: urlProductSlug,
            };
        }
        return undefined;
    }, [urlProductId, urlProductTitle, urlProductImage, urlProductPrice, urlProductSlug]);

    // ── State ──────────────────────────────────────────────────────────────────
    const [conversations, setConversations] = useState<ConversationItem[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTargetUser, setActiveTargetUser] = useState<UserProfile | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputMessage, setInputMessage] = useState("");
    const [isTargetOnline, setIsTargetOnline] = useState<boolean>(false);
    const [isTargetTyping, setIsTargetTyping] = useState<boolean>(false);
    const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
    const [showMobileList, setShowMobileList] = useState<boolean>(!targetSlug);
    const [showRightPanel, setShowRightPanel] = useState<boolean>(true);

    const socketRef = useRef<Socket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Scroll to bottom of message list
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTargetTyping]);

    // ── 1. Fetch Conversations List ───────────────────────────────────────────
    const loadConversations = async () => {
        if (!currentUserId) return;
        try {
            const res = await xFetch(`/chat/conversations?userId=${currentUserId}`);
            if (res.ok) {
                const data = await res.json();
                setConversations(data.conversations || []);
            }
        } catch {
            /* ignore fetch errors */
        }
    };

    useEffect(() => {
        if (currentUserId) {
            loadConversations();
        }
    }, [currentUserId]);

    // ── 2. Fetch Chat History when Target Changes ──────────────────────────────
    useEffect(() => {
        if (!currentUserId || !targetSlug) {
            setActiveTargetUser(null);
            setMessages([]);
            return;
        }

        setLoadingHistory(true);
        setIsTargetTyping(false);

        xFetch(`/chat/history/${targetSlug}?userId=${currentUserId}`)
            .then((r) => r.json())
            .then((data) => {
                if (data.targetUser) {
                    setActiveTargetUser(data.targetUser);
                    setMessages(data.messages || []);

                    // Check socket online status if connected
                    if (socketRef.current) {
                        socketRef.current.emit("check_user_status", { userId: data.targetUser._id });
                    }
                } else {
                    toastError("User not found for chatting.");
                }
            })
            .catch(() => {
                toastError("Failed to load conversation history.");
            })
            .finally(() => setLoadingHistory(false));
    }, [currentUserId, targetSlug]);

    // ── 3. Socket.io Real-Time Integration ─────────────────────────────────────
    useEffect(() => {
        if (!currentUserId) return;

        // Initialize Socket connection with license key
        const socket: Socket = io(EXPRESS_API, {
            path: "/socket.io/",
            auth: { licenseKey: LICENSE_KEY },
            extraHeaders: { "x-license-key": LICENSE_KEY },
            reconnectionAttempts: 5,
        });

        socketRef.current = socket;

        socket.on("connect", () => {
            socket.emit("register_user", { userId: currentUserId });
            if (activeTargetUser?._id) {
                socket.emit("check_user_status", { userId: activeTargetUser._id });
            }
        });

        socket.on("connect_error", (err) => {
            console.error("[Socket Connect Error]", err.message);
        });

        // Live Incoming Message Handler
        socket.on("receive_message", (newMsg: ChatMessage) => {
            setMessages((prev) => {
                // Avoid duplicates
                if (prev.some((m) => m._id === newMsg._id)) return prev;
                // Only append if message belongs to currently active thread
                if (
                    activeTargetUser &&
                    (newMsg.senderId === activeTargetUser._id || newMsg.receiverId === activeTargetUser._id)
                ) {
                    return [...prev, newMsg];
                }
                return prev;
            });

            // Reload conversation list sidebar
            loadConversations();
        });

        // Live Typing Status
        socket.on("user_typing", ({ senderId }: { senderId: string }) => {
            if (activeTargetUser && senderId === activeTargetUser._id) {
                setIsTargetTyping(true);
            }
        });

        socket.on("user_stop_typing", ({ senderId }: { senderId: string }) => {
            if (activeTargetUser && senderId === activeTargetUser._id) {
                setIsTargetTyping(false);
            }
        });

        // Live Online/Offline Status Change
        socket.on("user_status_change", ({ userId, online }: { userId: string; online: boolean }) => {
            if (activeTargetUser && userId === activeTargetUser._id) {
                setIsTargetOnline(online);
            }
        });

        socket.on("user_status_result", ({ userId, online }: { userId: string; online: boolean }) => {
            if (activeTargetUser && userId === activeTargetUser._id) {
                setIsTargetOnline(online);
            }
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [currentUserId, activeTargetUser?._id]);

    // Re-check target status whenever activeTargetUser changes
    useEffect(() => {
        if (socketRef.current && activeTargetUser?._id) {
            socketRef.current.emit("check_user_status", { userId: activeTargetUser._id });
        }
    }, [activeTargetUser?._id]);

    // ── Input Change & Typing Broadcast Handler ───────────────────────────────
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputMessage(e.target.value);

        if (!socketRef.current || !activeTargetUser?._id || !currentUserId) return;

        socketRef.current.emit("typing", {
            senderId: currentUserId,
            receiverId: activeTargetUser._id,
        });

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            if (socketRef.current && activeTargetUser?._id && currentUserId) {
                socketRef.current.emit("stop_typing", {
                    senderId: currentUserId,
                    receiverId: activeTargetUser._id,
                });
            }
        }, 1500);
    };

    // ── Send Message Handler ───────────────────────────────────────────────────
    const handleSendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!inputMessage.trim() || !activeTargetUser?._id || !currentUserId) return;

        const text = inputMessage.trim();
        setInputMessage("");

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        if (socketRef.current) {
            socketRef.current.emit("stop_typing", {
                senderId: currentUserId,
                receiverId: activeTargetUser._id,
            });
        }

        // Determine product payload (send URL product context on first message or if available)
        const productPayload = urlProductContext;

        if (socketRef.current && socketRef.current.connected) {
            socketRef.current.emit(
                "send_message",
                {
                    senderId: currentUserId,
                    receiverId: activeTargetUser._id,
                    message: text,
                    productContext: productPayload,
                },
                (res: { success: boolean; message?: ChatMessage; error?: string }) => {
                    if (res.success && res.message) {
                        setMessages((prev) => {
                            if (prev.some((m) => m._id === res.message!._id)) return prev;
                            return [...prev, res.message!];
                        });
                        loadConversations();
                    } else if (res.error) {
                        toastError(res.error);
                    }
                }
            );
        } else {
            // Fallback REST call if socket disconnected
            try {
                const res = await xFetch("/chat/send", {
                    method: "POST",
                    body: JSON.stringify({
                        senderId: currentUserId,
                        receiverId: activeTargetUser._id,
                        message: text,
                        productContext: productPayload,
                    }),
                });
                if (res.ok) {
                    const data = await res.json();
                    setMessages((prev) => [...prev, data.message]);
                    loadConversations();
                } else {
                    toastError("Failed to send message.");
                }
            } catch {
                toastError("Network error while sending message.");
            }
        }
    };

    // ── Product Context Active Display ─────────────────────────────────────────
    // Priority: URL product params > product from last message containing product context
    const currentProductContext = useMemo(() => {
        if (urlProductContext && urlProductContext.title) return urlProductContext;
        const msgWithProduct = [...messages].reverse().find((m) => m.productContext && m.productContext.title);
        return msgWithProduct?.productContext || null;
    }, [urlProductContext, messages]);

    // Filter conversations by search
    const filteredConversations = useMemo(() => {
        if (!searchQuery.trim()) return conversations;
        return conversations.filter(
            (c) =>
                c.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.user.slug.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [conversations, searchQuery]);

    if (authStatus === "loading") {
        return (
            <div className="flex items-center justify-center h-96 bg-white rounded-2xl border border-gray-100">
                <Icon icon="svg-spinners:ring-resize" width={28} className="text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="w-full bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-8rem)] min-h-125">
            {/* Top Toolbar / Mobile Header */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200/80 text-xs">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setShowMobileList((v) => !v)}
                        className="md:hidden flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-700 font-semibold"
                    >
                        <Icon icon="solar:users-group-rounded-bold" width={16} />
                        <span>Chats</span>
                    </button>
                    <span className="font-bold text-gray-800 text-sm hidden md:inline-flex items-center gap-1.5">
                        <Icon icon="solar:chat-round-dots-bold" width={18} className="text-indigo-600" />
                        Messenger
                    </span>
                </div>

                {currentProductContext && (
                    <button
                        type="button"
                        onClick={() => setShowRightPanel((v) => !v)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 font-semibold transition-colors"
                    >
                        <Icon icon="solar:box-bold" width={15} />
                        <span>{showRightPanel ? "Hide Product" : "View Product"}</span>
                    </button>
                )}
            </div>

            <div className="flex-1 flex min-h-0 relative">
                {/* ── 1. LEFT SIDEBAR: CONVERSATION LIST ── */}
                <div
                    className={`w-full md:w-72 lg:w-80 border-r border-gray-200/80 bg-gray-50/50 flex flex-col shrink-0 transition-all ${
                        showMobileList ? "flex" : "hidden md:flex"
                    }`}
                >
                    {/* Search Bar */}
                    <div className="p-3 border-b border-gray-200/80 bg-white">
                        <div className="relative">
                            <Icon
                                icon="solar:magnifer-linear"
                                width={16}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                            />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search conversations..."
                                className="w-full pl-9 pr-3 py-1.5 bg-gray-100/80 border border-transparent focus:border-indigo-400 focus:bg-white rounded-xl text-xs outline-none transition-all"
                            />
                        </div>
                    </div>

                    {/* Conversations List */}
                    <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                        {filteredConversations.length === 0 ? (
                            <div className="p-6 text-center text-xs text-gray-400 flex flex-col items-center gap-2">
                                <Icon icon="solar:chat-square-call-linear" width={32} className="text-gray-300" />
                                <p>No conversations found.</p>
                            </div>
                        ) : (
                            filteredConversations.map((item) => {
                                const active = targetSlug === item.user.slug;
                                return (
                                    <Link
                                        key={item.user._id}
                                        href={`/account/messages/${item.user.slug}`}
                                        onClick={() => setShowMobileList(false)}
                                        className={`flex items-center gap-3 p-3 transition-colors ${
                                            active ? "bg-indigo-50/80 border-l-4 border-indigo-600" : "hover:bg-gray-100/80 bg-white"
                                        }`}
                                    >
                                        {/* Avatar */}
                                        <div className="relative shrink-0">
                                            {item.user.image ? (
                                                <img
                                                    src={item.user.image}
                                                    alt={item.user.name}
                                                    className="w-10 h-10 rounded-full object-cover border border-gray-200"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                                                    {item.user.name.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-xs font-bold text-gray-900 truncate">
                                                    {item.user.name}
                                                </h4>
                                                {item.lastMessage?.createdAt && (
                                                    <span className="text-[10px] text-gray-400">
                                                        {new Date(item.lastMessage.createdAt).toLocaleTimeString([], {
                                                            hour: "2-digit",
                                                            minute: "2-digit",
                                                        })}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-gray-500 truncate mt-0.5">
                                                {item.lastMessage?.message || "Started a conversation"}
                                            </p>
                                        </div>

                                        {/* Unread Badge */}
                                        {item.unreadCount > 0 && (
                                            <span className="px-1.5 py-0.5 rounded-full bg-orange-500 text-white font-extrabold text-[10px]">
                                                {item.unreadCount}
                                            </span>
                                        )}
                                    </Link>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* ── 2. CENTER: MAIN CHAT PANEL ── */}
                <div className="flex-1 flex flex-col min-w-0 bg-white">
                    {activeTargetUser ? (
                        <>
                            {/* Chat Top Header */}
                            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white">
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        {activeTargetUser.image ? (
                                            <img
                                                src={activeTargetUser.image}
                                                alt={activeTargetUser.name}
                                                className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-100"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                                                {activeTargetUser.name.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        {/* Live Online Badge */}
                                        <span
                                            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                                                isTargetOnline ? "bg-emerald-500" : "bg-gray-300"
                                            }`}
                                        />
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-sm font-bold text-gray-900 leading-tight">
                                                {activeTargetUser.name}
                                            </h3>
                                            {activeTargetUser.type && (
                                                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                                                    {activeTargetUser.type}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                                            <span
                                                className={`w-1.5 h-1.5 rounded-full ${
                                                    isTargetOnline ? "bg-emerald-500" : "bg-gray-400"
                                                }`}
                                            />
                                            {isTargetOnline ? (
                                                <span className="text-emerald-600 font-semibold">Active Now</span>
                                            ) : (
                                                <span className="text-gray-400">Offline</span>
                                            )}
                                        </p>
                                    </div>
                                </div>

                                <Link
                                    href={`/${activeTargetUser.type === "seller" ? "seller" : "user"}/${activeTargetUser.slug}`}
                                    className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1"
                                >
                                    <span>Profile</span>
                                    <Icon icon="solar:alt-arrow-right-bold" width={12} />
                                </Link>
                            </div>

                            {/* Chat Messages Body */}
                            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50">
                                {loadingHistory ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Icon icon="svg-spinners:ring-resize" width={24} className="text-indigo-600" />
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="py-12 text-center text-xs text-gray-400 flex flex-col items-center gap-2">
                                        <Icon icon="solar:chat-line-linear" width={40} className="text-gray-300" />
                                        <p>No messages yet. Send a message to start chatting!</p>
                                    </div>
                                ) : (
                                    messages.map((msg) => {
                                        const isMine = msg.senderId === currentUserId;
                                        return (
                                            <div
                                                key={msg._id}
                                                className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
                                            >
                                                {/* Embedded Product Card if message has productContext */}
                                                {msg.productContext && msg.productContext.title && (
                                                    <div
                                                        className={`mb-1.5 p-2.5 rounded-xl border max-w-xs sm:max-w-sm flex items-center gap-2.5 bg-white shadow-xs ${
                                                            isMine ? "border-indigo-200" : "border-gray-200"
                                                        }`}
                                                    >
                                                        {msg.productContext.image ? (
                                                            <img
                                                                src={msg.productContext.image}
                                                                alt={msg.productContext.title}
                                                                className="w-12 h-12 rounded object-cover border shrink-0 bg-gray-50"
                                                            />
                                                        ) : (
                                                            <div className="w-12 h-12 rounded bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs shrink-0">
                                                                ITEM
                                                            </div>
                                                        )}
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-[11px] font-bold text-gray-800 truncate">
                                                                {msg.productContext.title}
                                                            </p>
                                                            {msg.productContext.price !== undefined && (
                                                                <p className="text-[11px] font-extrabold text-orange-600">
                                                                    ৳ {msg.productContext.price.toLocaleString("en-US")}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Bubble */}
                                                <div
                                                    className={`px-3.5 py-2.5 rounded-2xl max-w-xs sm:max-w-md text-xs leading-relaxed shadow-2xs ${
                                                        isMine
                                                            ? "bg-linear-to-r from-indigo-600 to-purple-600 text-white rounded-br-none"
                                                            : "bg-white text-gray-800 border border-gray-200/80 rounded-bl-none"
                                                    }`}
                                                >
                                                    <p className="whitespace-pre-wrap wrap-break-word">{msg.message}</p>
                                                    <div
                                                        className={`text-[9px] mt-1 text-right ${
                                                            isMine ? "text-indigo-200" : "text-gray-400"
                                                        }`}
                                                    >
                                                        {new Date(msg.createdAt).toLocaleTimeString([], {
                                                            hour: "2-digit",
                                                            minute: "2-digit",
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}

                                {/* Live Typing Indicator Bar */}
                                {isTargetTyping && (
                                    <div className="flex items-center gap-2 text-xs text-gray-400 italic py-1 animate-pulse">
                                        <Icon icon="solar:pen-bold" width={12} className="text-indigo-500" />
                                        <span>{activeTargetUser.name} is typing...</span>
                                    </div>
                                )}

                                <div ref={messagesEndRef} />
                            </div>

                            {/* Message Composer Input Form */}
                            <form
                                onSubmit={handleSendMessage}
                                className="p-3 border-t border-gray-200/80 bg-white flex items-center gap-2"
                            >
                                <input
                                    type="text"
                                    value={inputMessage}
                                    onChange={handleInputChange}
                                    placeholder={`Write a message to ${activeTargetUser.name}...`}
                                    className="flex-1 px-4 py-2.5 bg-gray-100/80 focus:bg-white border border-transparent focus:border-indigo-500 rounded-xl text-xs outline-none transition-all"
                                />
                                <button
                                    type="submit"
                                    disabled={!inputMessage.trim()}
                                    className="p-2.5 rounded-xl bg-linear-to-r from-indigo-600 to-purple-600 text-white disabled:opacity-40 hover:opacity-90 active:scale-95 transition-all shrink-0"
                                >
                                    <Icon icon="solar:plain-bold" width={18} />
                                </button>
                            </form>
                        </>
                    ) : (
                        /* Empty State when no target user selected */
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50/30">
                            <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                                <Icon icon="solar:chat-round-dots-bold" width={32} />
                            </div>
                            <h3 className="text-base font-bold text-gray-800">Select a conversation</h3>
                            <p className="text-xs text-gray-400 max-w-sm mt-1">
                                Choose a contact from the list or click &quot;Chat with Seller&quot; on any product page to start chatting.
                            </p>
                        </div>
                    )}
                </div>

                {/* ── 3. RIGHT SIDEBAR: PRODUCT DETAILS PANEL ── */}
                {currentProductContext && currentProductContext.title && showRightPanel && (
                    <div className="w-64 border-l border-gray-200/80 bg-gray-50/80 p-4 md:flex flex-col gap-3 shrink-0 hidden lg:flex">
                        <div className="flex items-center justify-between border-b border-gray-200/80 pb-2">
                            <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                                <Icon icon="solar:box-bold" width={15} className="text-orange-500" />
                                Product Details
                            </h4>
                            <button
                                type="button"
                                onClick={() => setShowRightPanel(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <Icon icon="solar:close-circle-bold" width={16} />
                            </button>
                        </div>

                        {/* Thumbnail */}
                        <div className="relative aspect-square w-full bg-white rounded-xl border border-gray-200 overflow-hidden">
                            {currentProductContext.image ? (
                                <Image
                                    src={currentProductContext.image}
                                    alt={currentProductContext.title}
                                    fill
                                    className="object-contain p-2"
                                    unoptimized
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                    <Icon icon="solar:box-linear" width={40} />
                                </div>
                            )}
                        </div>

                        {/* Title & Price */}
                        <div>
                            <h5 className="text-xs font-bold text-gray-900 leading-snug line-clamp-2">
                                {currentProductContext.title}
                            </h5>
                            {currentProductContext.price !== undefined && (
                                <p className="text-base font-extrabold text-orange-600 mt-1">
                                    ৳ {currentProductContext.price.toLocaleString("en-US")}
                                </p>
                            )}
                        </div>

                        {/* Link to Product */}
                        {currentProductContext.slug && (
                            <Link
                                href={`/product/${currentProductContext.slug}`}
                                target="_blank"
                                className="w-full text-center py-2 px-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs transition-colors shadow-xs mt-auto flex items-center justify-center gap-1"
                            >
                                <span>View Product</span>
                                <Icon icon="solar:alt-arrow-right-bold" width={12} />
                            </Link>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
