"use client";

import { useState } from "react";
import { useUserStore } from "@/store/user";
import { Star, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { $fetch } from "@/lib/api";
import { useTranslations } from "next-intl";

interface ProductReviewsProps {
  productId: string;
  hasPurchased: boolean;
  reviews: ecommerceReviewAttributes[];
  onReviewSubmitted?: () => void;
}

export default function ProductReviews({
  productId,
  hasPurchased,
  reviews = [],
  onReviewSubmitted,
}: ProductReviewsProps) {
  const t = useTranslations("ext");
  const { user } = useUserStore();
  const [userRating, setUserRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if current user has already reviewed this product
  const hasReviewed = user
    ? reviews.some((review) => review.userId === user.id && review.status)
    : false;

  // Filter active reviews
  const activeReviews = reviews.filter((review) => review.status);

  const handleRatingChange = (rating: number) => {
    setUserRating(rating);
  };

  const handleSubmitReview = async () => {
    if (!user) {
      toast.error("Please log in to submit a review");
      return;
    }

    if (reviewText.trim().length < 10) {
      toast.error(
        "Please write a more detailed review (at least 10 characters)"
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await $fetch({
        url: `/api/ecommerce/product/${productId}/review`,
        method: "POST",
        body: {
          rating: userRating,
          comment: reviewText.trim(),
        },
      });

      if (error) {
        toast.error(error || "Failed to submit review");
      } else {
        toast.success("Your review has been submitted!");
        setReviewText("untitled");
        setUserRating(5);

        // Call the callback to refresh product data
        if (onReviewSubmitted) {
          onReviewSubmitted();
        }
      }
    } catch (error) {
      console.error("Error submitting review:", error);
      toast.error("Failed to submit review. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const averageRating =
    activeReviews.length > 0
      ? activeReviews.reduce((acc, review) => acc + review.rating, 0) /
        activeReviews.length
      : 0;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">
        {t("customer_reviews")}
      </h2>

      <div className="mt-4 flex items-center">
        <div className="flex items-center">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`h-5 w-5 ${
                star <= Math.round(averageRating)
                  ? "text-yellow-400 fill-yellow-400"
                  : "text-gray-300 dark:text-zinc-600"
              }`}
            />
          ))}
        </div>
        <p className="ml-2 text-sm text-gray-700 dark:text-zinc-300">
          {averageRating > 0 ? averageRating.toFixed(1) : "0.0"}
          {t("out_of_5_stars_(")}
          {activeReviews.length}
          {t("reviews)")}
        </p>
      </div>

      {/* Review Form */}
      {user && hasPurchased && !hasReviewed && (
        <div className="mt-8 bg-gray-50 dark:bg-zinc-800/50 p-6 rounded-lg border border-gray-100 dark:border-zinc-700/50">
          <h3 className="text-lg font-medium text-gray-900 dark:text-zinc-100">
            {t("write_a_review")}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
            {t("share_your_experience_with_this_product")}
          </p>

          <div className="mt-4">
            <div className="flex items-center">
              <p className="mr-2 text-sm font-medium text-gray-700 dark:text-zinc-300">
                {t("rating")}
              </p>
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => handleRatingChange(star)}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`h-5 w-5 transition-colors ${
                        star <= userRating
                          ? "text-yellow-400 fill-yellow-400"
                          : "text-gray-300 dark:text-zinc-600 hover:text-yellow-300"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <label
                htmlFor="review"
                className="block text-sm font-medium text-gray-700 dark:text-zinc-300"
              >
                {t("your_review")}
              </label>
              <Textarea
                id="review"
                rows={4}
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Write your review here..."
                className="mt-1"
                maxLength={500}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
                {reviewText.length}
                {t("500_characters")}
              </p>
            </div>

            <div className="mt-4 flex justify-end">
              <Button
                onClick={handleSubmitReview}
                disabled={isSubmitting || reviewText.trim().length < 10}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {isSubmitting ? "Submitting..." : "Submit Review"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Show message for users who haven't purchased */}
      {user && !hasPurchased && (
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            {t("you_need_to_a_review")}.
          </p>
        </div>
      )}

      {/* Show message for users who already reviewed */}
      {user && hasReviewed && (
        <div className="mt-8 bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
          <p className="text-sm text-green-700 dark:text-green-300">
            {t("thank_you_for_this_product")}.
          </p>
        </div>
      )}

      {/* Login prompt for guests */}
      {!user && (
        <div className="mt-8 bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-lg border border-gray-200 dark:border-zinc-700">
          <p className="text-sm text-gray-700 dark:text-zinc-300">
            {t("please_log_in_to_write_a_review_for_this_product")}.
          </p>
        </div>
      )}

      {/* Reviews List */}
      <div className="mt-8">
        {activeReviews.length === 0 ? (
          <div className="text-center py-8">
            <Star className="mx-auto h-12 w-12 text-gray-400 dark:text-zinc-600" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-zinc-100">
              {t("no_reviews_yet")}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
              {t("be_the_first_to_review_this_product")}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {activeReviews.map((review) => (
              <div
                key={review.id}
                className="border-b border-gray-200 dark:border-zinc-700 pb-8"
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-zinc-700 flex items-center justify-center">
                      <User className="h-6 w-6 text-gray-500 dark:text-zinc-400" />
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-zinc-100">
                      {review.userId === user?.id ? "You" : "Customer"}
                    </h4>
                    <div className="mt-1 flex items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-4 w-4 ${
                            star <= review.rating
                              ? "text-yellow-400 fill-yellow-400"
                              : "text-gray-300 dark:text-zinc-600"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
                      {new Date(review.createdAt || "").toLocaleDateString(
                        undefined,
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        }
                      )}
                    </p>
                    {review.comment && (
                      <div className="mt-2 text-sm text-gray-700 dark:text-zinc-300 whitespace-pre-line">
                        {review.comment}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
