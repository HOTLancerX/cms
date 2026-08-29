import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Comment from "@/models/Comment";
import Post from "@/models/post";
import PostInfo from "@/models/post_info";
import { getAuthSession } from "@/lib/session";
import mongoose from "mongoose";

// Helper to batch-populate product information (title, slug, image) for reviews
async function populateProductInfo(comments: any[]) {
    if (!comments || comments.length === 0) return comments;
    const postIds = [...new Set(comments.map((c) => c.targetId).filter(Boolean))];
    if (postIds.length === 0) return comments;

    try {
        const validObjectIds = postIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
        const posts = await Post.find({
            $or: [
                { _id: { $in: validObjectIds } },
                { slug: { $in: postIds } },
            ],
        }).select("_id title slug category").lean();

        const postInfoDocs = await PostInfo.find({
            postId: { $in: posts.map((p) => p._id) },
            name: { $in: ["images", "_variate", "shortDescription"] },
        }).lean();

        const infoMap: Record<string, Record<string, string>> = {};
        for (const info of postInfoDocs) {
            const pid = String(info.postId);
            if (!infoMap[pid]) infoMap[pid] = {};
            infoMap[pid][info.name] = String(info.value ?? "");
        }

        const postMap: Record<string, any> = {};
        for (const p of posts) {
            let image = "";
            const rawImages = infoMap[String(p._id)]?.images;
            if (rawImages) {
                try {
                    const parsed = JSON.parse(rawImages);
                    if (Array.isArray(parsed) && parsed.length > 0) image = parsed[0];
                } catch {
                    image = rawImages;
                }
            }

            const postObj = {
                _id: String(p._id),
                title: p.title,
                slug: p.slug,
                image,
            };
            postMap[String(p._id)] = postObj;
            postMap[p.slug] = postObj;
        }

        return comments.map((c) => {
            const doc = typeof c.toObject === "function" ? c.toObject() : { ...c };
            const product = postMap[c.targetId] || null;
            return {
                ...doc,
                product,
            };
        });
    } catch {
        return comments;
    }
}

// GET: Fetch reviews/comments with filtering, stats, and role-based permissions
export async function GET(request: NextRequest) {
    try {
        await connectDB();
        const { searchParams } = new URL(request.url);
        const targetId = searchParams.get("targetId");
        const targetType = searchParams.get("targetType") || "";
        const userId = searchParams.get("userId") || "";
        const ownerId = searchParams.get("ownerId") || "";
        const orderNumber = searchParams.get("orderNumber") || "";
        const status = searchParams.get("status"); // "all", "pending", "approved", "rejected"
        const rating = searchParams.get("rating"); // "1" .. "5"
        const search = searchParams.get("search") || "";
        const isAdmin = searchParams.get("isAdmin") === "true";
        const page = parseInt(searchParams.get("page") || "1", 10);
        const limit = parseInt(searchParams.get("limit") || "10", 10);

        // Stats only for directory or product
        if (searchParams.get("statsOnly") === "true") {
            const matchStage: any = { status: "approved" };
            if (targetType) matchStage.targetType = targetType;
            const stats = await Comment.aggregate([
                { $match: matchStage },
                {
                    $group: {
                        _id: "$targetId",
                        averageRating: { $avg: "$rating" },
                        totalCount: { $sum: 1 },
                    },
                },
            ]);
            const map: Record<string, { averageRating: number; totalCount: number }> = {};
            stats.forEach((s) => {
                map[String(s._id)] = {
                    averageRating: parseFloat((s.averageRating || 0).toFixed(1)),
                    totalCount: s.totalCount || 0,
                };
            });
            return NextResponse.json({ success: true, stats: map });
        }

        const skip = (page - 1) * limit;

        // ── 1. Admin Management Query (returns all product reviews + status counts) ──
        if (isAdmin) {
            const authUser = await getAuthSession(request);
            // Allow if admin or local development
            const query: any = {};
            if (targetType) query.targetType = targetType;
            if (status && status !== "all") query.status = status;
            if (rating && Number(rating) > 0) query.rating = Number(rating);
            if (search) {
                query.$or = [
                    { userName: { $regex: search, $options: "i" } },
                    { title: { $regex: search, $options: "i" } },
                    { content: { $regex: search, $options: "i" } },
                    { orderNumber: { $regex: search, $options: "i" } },
                ];
            }

            const baseCountQuery = targetType ? { targetType } : {};
            const [reviews, total, allCount, pendingCount, approvedCount, rejectedCount] = await Promise.all([
                Comment.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
                Comment.countDocuments(query),
                Comment.countDocuments(baseCountQuery),
                Comment.countDocuments({ ...baseCountQuery, status: "pending" }),
                Comment.countDocuments({ ...baseCountQuery, status: "approved" }),
                Comment.countDocuments({ ...baseCountQuery, status: "rejected" }),
            ]);

            const populatedReviews = await populateProductInfo(reviews);

            // Compute overall average rating for approved items
            const approvedRatings = await Comment.find({ ...baseCountQuery, status: "approved", rating: { $gt: 0 } }).select("rating");
            const sumRating = approvedRatings.reduce((acc, r) => acc + (r.rating || 0), 0);
            const averageRating = approvedRatings.length > 0 ? parseFloat((sumRating / approvedRatings.length).toFixed(1)) : 0;

            return NextResponse.json({
                success: true,
                data: populatedReviews,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit) || 1,
                    hasMore: skip + reviews.length < total,
                },
                counts: {
                    all: allCount,
                    pending: pendingCount,
                    approved: approvedCount,
                    rejected: rejectedCount,
                },
                averageRating,
            });
        }

        // ── 2. Seller Portal Query (reviews for seller's uploaded products) ──
        if (ownerId && !targetId && !orderNumber) {
            const query: any = { ownerId };
            if (targetType) query.targetType = targetType;
            if (status && status !== "all") query.status = status;
            if (rating && Number(rating) > 0) query.rating = Number(rating);
            if (search) {
                query.$or = [
                    { userName: { $regex: search, $options: "i" } },
                    { title: { $regex: search, $options: "i" } },
                    { content: { $regex: search, $options: "i" } },
                    { orderNumber: { $regex: search, $options: "i" } },
                ];
            }

            const sellerBase = { ownerId, ...(targetType ? { targetType } : {}) };
            const [reviews, total, allCount, pendingCount, approvedCount, rejectedCount, allRatings] = await Promise.all([
                Comment.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
                Comment.countDocuments(query),
                Comment.countDocuments(sellerBase),
                Comment.countDocuments({ ...sellerBase, status: "pending" }),
                Comment.countDocuments({ ...sellerBase, status: "approved" }),
                Comment.countDocuments({ ...sellerBase, status: "rejected" }),
                Comment.find({ ...sellerBase, status: "approved", rating: { $gt: 0 } }).select("rating"),
            ]);

            const populatedReviews = await populateProductInfo(reviews);
            const sumRating = allRatings.reduce((acc, r) => acc + (r.rating || 0), 0);
            const averageRating = allRatings.length > 0 ? parseFloat((sumRating / allRatings.length).toFixed(1)) : 0;

            return NextResponse.json({
                success: true,
                data: populatedReviews,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit) || 1,
                    hasMore: skip + reviews.length < total,
                },
                counts: {
                    all: allCount,
                    pending: pendingCount,
                    approved: approvedCount,
                    rejected: rejectedCount,
                },
                averageRating,
            });
        }

        // ── 3. User checking their reviews for a specific order ──
        if (userId && (orderNumber || targetId)) {
            const userOrderQuery: any = { userId };
            if (orderNumber) userOrderQuery.orderNumber = orderNumber;
            if (targetId) userOrderQuery.targetId = targetId;
            if (targetType) userOrderQuery.targetType = targetType;

            const userReviews = await Comment.find(userOrderQuery).sort({ createdAt: -1 });
            return NextResponse.json({
                success: true,
                data: userReviews,
                count: userReviews.length,
            });
        }

        // ── 4. User's general submitted review history ──
        if (userId && !targetId && !ownerId) {
            const myQuery: any = { userId };
            if (targetType) myQuery.targetType = targetType;

            const [myComments, totalMy] = await Promise.all([
                Comment.find(myQuery).sort({ createdAt: -1 }).skip(skip).limit(limit),
                Comment.countDocuments(myQuery),
            ]);

            const populated = await populateProductInfo(myComments);

            return NextResponse.json({
                success: true,
                data: populated,
                pagination: {
                    page,
                    limit,
                    total: totalMy,
                    pages: Math.ceil(totalMy / limit) || 1,
                    hasMore: skip + myComments.length < totalMy,
                },
            });
        }

        // ── 5. Public Product / Directory Approved Reviews List & Summary ──
        const approvedQuery: any = { status: "approved" };
        if (targetType) approvedQuery.targetType = targetType;
        if (targetId) approvedQuery.targetId = targetId;

        const [approvedComments, totalApproved] = await Promise.all([
            Comment.find(approvedQuery).sort({ createdAt: -1 }).skip(skip).limit(limit),
            Comment.countDocuments(approvedQuery),
        ]);

        const summaryFilter: any = { ...approvedQuery, rating: { $gt: 0 } };
        const allRatings = await Comment.find(summaryFilter).select("rating");
        const totalRatingCount = allRatings.length;
        const ratingSum = allRatings.reduce((acc, curr) => acc + (curr.rating || 0), 0);
        const averageRating = totalRatingCount > 0 ? parseFloat((ratingSum / totalRatingCount).toFixed(1)) : 0;

        const distribution = {
            5: allRatings.filter((r) => r.rating === 5).length,
            4: allRatings.filter((r) => r.rating === 4).length,
            3: allRatings.filter((r) => r.rating === 3).length,
            2: allRatings.filter((r) => r.rating === 2).length,
            1: allRatings.filter((r) => r.rating === 1).length,
        };

        return NextResponse.json({
            success: true,
            data: approvedComments,
            pagination: {
                page,
                limit,
                total: totalApproved,
                pages: Math.ceil(totalApproved / limit) || 1,
                hasMore: skip + approvedComments.length < totalApproved,
            },
            summary: {
                averageRating,
                totalCount: totalApproved,
                distribution,
            },
        });
    } catch (error: any) {
        console.error("GET /api/comments error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// POST: Submit a new comment or review (saved as "pending")
export async function POST(request: NextRequest) {
    try {
        await connectDB();
        const body = await request.json();
        const {
            targetType = "product",
            targetId,
            ownerId = "",
            userId,
            userName,
            userImage = "",
            rating = 5,
            title = "",
            content,
            images = [],
            videos = [],
            orderNumber = "",
            orderId = "",
            verifiedPurchase = true,
        } = body;

        if (!targetId || !userId || !userName || !content) {
            return NextResponse.json(
                { success: false, error: "Missing required fields (targetId, userId, userName, content)" },
                { status: 400 }
            );
        }

        // Block owner from reviewing their own product/listing
        if (ownerId && String(ownerId) === String(userId)) {
            return NextResponse.json(
                { success: false, error: "You cannot review your own product or listing." },
                { status: 403 }
            );
        }

        // Check if user already reviewed this item for this order
        if (orderNumber) {
            const existingReview = await Comment.findOne({
                targetId,
                userId,
                orderNumber,
            });
            if (existingReview) {
                return NextResponse.json(
                    { success: false, error: "You have already submitted a review for this item in this order." },
                    { status: 409 }
                );
            }
        }

        // Create review with pending status
        const newComment = await Comment.create({
            targetType,
            targetId,
            ownerId,
            userId,
            userName,
            userImage,
            rating: Math.min(Math.max(Number(rating) || 5, 1), 5),
            title: title ? title.trim() : "",
            content: content.trim(),
            images: Array.isArray(images) ? images.filter(Boolean) : [],
            videos: Array.isArray(videos) ? videos.filter(Boolean) : [],
            orderNumber: orderNumber ? String(orderNumber).trim() : "",
            orderId: orderId ? String(orderId).trim() : "",
            verifiedPurchase: Boolean(verifiedPurchase || orderNumber),
            status: "pending",
        });

        return NextResponse.json({ success: true, data: newComment }, { status: 201 });
    } catch (error: any) {
        console.error("POST /api/comments error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// PATCH: Approve / Reject review or add/edit Owner or Admin Reply
export async function PATCH(request: NextRequest) {
    try {
        await connectDB();
        const { searchParams } = new URL(request.url);
        const commentId = searchParams.get("id");
        const body = await request.json();
        const { status, requesterUserId, ownerId, replyContent, authorName, authorRole, isAdmin } = body;

        if (!commentId) {
            return NextResponse.json({ success: false, error: "Missing comment ID" }, { status: 400 });
        }

        const comment = await Comment.findById(commentId);
        if (!comment) {
            return NextResponse.json({ success: false, error: "Review not found" }, { status: 404 });
        }

        // Permission check: admin OR owner/seller
        const targetOwner = comment.ownerId || ownerId;
        const isOwner = targetOwner && requesterUserId && String(targetOwner) === String(requesterUserId);
        const hasAdminAccess = Boolean(isAdmin);

        if (!isOwner && !hasAdminAccess) {
            // Check session
            const authUser = await getAuthSession(request);
            if (authUser?.type !== "admin" && (!authUser?._id || String(targetOwner) !== String(authUser._id))) {
                return NextResponse.json(
                    { success: false, error: "Unauthorized. Only the seller or admin can manage this review." },
                    { status: 403 }
                );
            }
        }

        if (status && ["pending", "approved", "rejected"].includes(status)) {
            comment.status = status;
        }

        if (replyContent !== undefined) {
            comment.reply = {
                content: replyContent.trim(),
                createdAt: new Date(),
                authorName: authorName || (hasAdminAccess ? "Store Admin" : "Seller"),
                authorRole: authorRole || (hasAdminAccess ? "admin" : "seller"),
            };
        }

        await comment.save();

        return NextResponse.json({ success: true, data: comment });
    } catch (error: any) {
        console.error("PATCH /api/comments error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// DELETE: Delete a review
export async function DELETE(request: NextRequest) {
    try {
        await connectDB();
        const { searchParams } = new URL(request.url);
        const commentId = searchParams.get("id");
        const userId = searchParams.get("userId");
        const isAdmin = searchParams.get("isAdmin") === "true";

        if (!commentId) {
            return NextResponse.json({ success: false, error: "Missing comment ID" }, { status: 400 });
        }

        const comment = await Comment.findById(commentId);
        if (!comment) {
            return NextResponse.json({ success: false, error: "Review not found" }, { status: 404 });
        }

        // Check permission: author, product owner, or admin
        const authUser = await getAuthSession(request);
        const isUserAuthor = userId && String(comment.userId) === String(userId);
        const isUserOwner = userId && String(comment.ownerId) === String(userId);
        const isUserAdmin = isAdmin || authUser?.type === "admin";

        if (!isUserAuthor && !isUserOwner && !isUserAdmin) {
            return NextResponse.json(
                { success: false, error: "Unauthorized to delete this review." },
                { status: 403 }
            );
        }

        await Comment.findByIdAndDelete(commentId);

        return NextResponse.json({ success: true, message: "Review deleted successfully" });
    } catch (error: any) {
        console.error("DELETE /api/comments error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
