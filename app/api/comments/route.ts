import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Comment from "@/models/Comment";

// GET: Fetch approved comments/reviews + summary stats + pending reviews for owner
export async function GET(request: NextRequest) {
    try {
        await connectDB();
        const { searchParams } = new URL(request.url);
        const targetId = searchParams.get("targetId");
        const targetType = searchParams.get("targetType") || "directory";
        const userId = searchParams.get("userId") || "";
        const ownerId = searchParams.get("ownerId") || "";
        const page = parseInt(searchParams.get("page") || "1", 10);
        const limit = parseInt(searchParams.get("limit") || "10", 10);

        if (searchParams.get("statsOnly") === "true") {
            const stats = await Comment.aggregate([
                { $match: { targetType, status: "approved" } },
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

        if (!targetId && !ownerId && !userId) {
            return NextResponse.json({ success: false, error: "Missing targetId, ownerId, or userId" }, { status: 400 });
        }

        const skip = (page - 1) * limit;

        // Build query for approved comments
        const approvedQuery: any = { targetType, status: "approved" };
        if (targetId) approvedQuery.targetId = targetId;
        if (ownerId && !targetId && !userId) approvedQuery.ownerId = ownerId;
        if (userId && !targetId && !ownerId) approvedQuery.userId = userId;

        // If specifically querying user's submitted reviews without targetId or ownerId
        if (userId && !targetId && !ownerId) {
            const myComments = await Comment.find({ userId, targetType })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);
            const totalMy = await Comment.countDocuments({ userId, targetType });
            return NextResponse.json({
                success: true,
                data: myComments,
                pagination: {
                    page,
                    limit,
                    total: totalMy,
                    hasMore: skip + myComments.length < totalMy,
                },
                pendingReviews: [],
                userPendingReview: null,
            });
        }

        // Fetch approved reviews
        const [approvedComments, totalApproved] = await Promise.all([
            Comment.find(approvedQuery).sort({ createdAt: -1 }).skip(skip).limit(limit),
            Comment.countDocuments(approvedQuery),
        ]);

        // Rating summary stats
        const summaryFilter: any = { targetType, status: "approved", rating: { $gt: 0 } };
        if (targetId) summaryFilter.targetId = targetId;
        if (ownerId) summaryFilter.ownerId = ownerId;

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

        // Fetch pending reviews for owner or requesting user
        let pendingReviews: any[] = [];
        let userPendingReview: any = null;

        const isOwnerQuery = Boolean(ownerId && (!userId || String(ownerId) === String(userId)));

        if (isOwnerQuery) {
            const pendingQuery: any = { targetType, status: "pending" };
            if (targetId) pendingQuery.targetId = targetId;
            if (ownerId) pendingQuery.ownerId = ownerId;
            pendingReviews = await Comment.find(pendingQuery).sort({ createdAt: -1 });
        } else if (userId && targetId) {
            userPendingReview = await Comment.findOne({ targetId, userId, status: "pending" });
        }

        return NextResponse.json({
            success: true,
            data: approvedComments,
            pagination: {
                page,
                limit,
                total: totalApproved,
                hasMore: skip + approvedComments.length < totalApproved,
            },
            summary: {
                averageRating,
                totalCount: totalApproved,
                distribution,
            },
            pendingReviews,
            userPendingReview,
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
            targetType = "directory",
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
        } = body;

        if (!targetId || !userId || !userName || !content) {
            return NextResponse.json(
                { success: false, error: "Missing required fields (targetId, userId, userName, content)" },
                { status: 400 }
            );
        }

        // Block owner from reviewing their own listing
        if (ownerId && String(ownerId) === String(userId)) {
            return NextResponse.json(
                { success: false, error: "You cannot review your own listing." },
                { status: 403 }
            );
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
            title,
            content,
            images,
            videos,
            status: "pending",
        });

        return NextResponse.json({ success: true, data: newComment }, { status: 201 });
    } catch (error: any) {
        console.error("POST /api/comments error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// PATCH: Approve / Reject review or add Owner Reply
export async function PATCH(request: NextRequest) {
    try {
        await connectDB();
        const { searchParams } = new URL(request.url);
        const commentId = searchParams.get("id");
        const body = await request.json();
        const { status, requesterUserId, ownerId, replyContent } = body;

        if (!commentId) {
            return NextResponse.json({ success: false, error: "Missing comment ID" }, { status: 400 });
        }

        const comment = await Comment.findById(commentId);
        if (!comment) {
            return NextResponse.json({ success: false, error: "Review not found" }, { status: 404 });
        }

        // Verify requester is the owner of the listing or ownerId matches
        const targetOwner = comment.ownerId || ownerId;
        if (targetOwner && requesterUserId && String(targetOwner) !== String(requesterUserId)) {
            return NextResponse.json(
                { success: false, error: "Unauthorized. Only the post owner can manage this review." },
                { status: 403 }
            );
        }

        if (status) {
            comment.status = status;
        }

        if (replyContent !== undefined) {
            comment.reply = {
                content: replyContent,
                createdAt: new Date(),
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

        if (!commentId) {
            return NextResponse.json({ success: false, error: "Missing comment ID" }, { status: 400 });
        }

        const comment = await Comment.findById(commentId);
        if (!comment) {
            return NextResponse.json({ success: false, error: "Review not found" }, { status: 404 });
        }

        // Check permission: author or owner
        if (userId && String(comment.userId) !== String(userId) && String(comment.ownerId) !== String(userId)) {
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
