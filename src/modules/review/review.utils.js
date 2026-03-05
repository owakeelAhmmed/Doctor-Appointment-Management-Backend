/**
 * Calculate weighted rating
 */
export function calculateWeightedRating(reviews) {
  if (!reviews || reviews.length === 0) return 0;
  
  const total = reviews.reduce((sum, r) => sum + r.rating, 0);
  return Math.round((total / reviews.length) * 10) / 10;
}

/**
 * Get rating text
 */
export function getRatingText(rating) {
  if (rating >= 4.5) return "Excellent";
  if (rating >= 4.0) return "Very Good";
  if (rating >= 3.0) return "Good";
  if (rating >= 2.0) return "Average";
  if (rating >= 1.0) return "Poor";
  return "No Ratings";
}

/**
 * Get rating color
 */
export function getRatingColor(rating) {
  if (rating >= 4.5) return "#4CAF50"; // Green
  if (rating >= 4.0) return "#8BC34A"; // Light Green
  if (rating >= 3.0) return "#FFC107"; // Yellow
  if (rating >= 2.0) return "#FF9800"; // Orange
  return "#F44336"; // Red
}

/**
 * Format review date
 */
export function formatReviewDate(date) {
  const now = new Date();
  const reviewDate = new Date(date);
  const diffDays = Math.floor((now - reviewDate) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

/**
 * Validate review content
 */
export function validateReviewContent(comment) {
  const spamPatterns = [
    /http[s]?:\/\//i,
    /www\./i,
    /click here/i,
    /buy now/i,
    /cheap/i,
    /discount/i,
  ];
  
  const hasSpam = spamPatterns.some(pattern => pattern.test(comment));
  
  return {
    isValid: !hasSpam && comment.length >= 10,
    reason: hasSpam ? "Spam detected" : comment.length < 10 ? "Too short" : null,
  };
}

/**
 * Generate star rating HTML
 */
export function generateStarRating(rating, maxStars = 5) {
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5;
  const emptyStars = maxStars - fullStars - (halfStar ? 1 : 0);
  
  return {
    full: fullStars,
    half: halfStar,
    empty: emptyStars,
    percentage: (rating / maxStars) * 100,
  };
}

/**
 * Calculate response rate
 */
export function calculateResponseRate(totalReviews, respondedReviews) {
  if (totalReviews === 0) return 0;
  return Math.round((respondedReviews / totalReviews) * 100);
}

/**
 * Get review summary
 */
export function getReviewSummary(reviews) {
  if (!reviews || reviews.length === 0) {
    return {
      total: 0,
      average: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      recent: [],
    };
  }
  
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let totalRating = 0;
  
  reviews.forEach(review => {
    distribution[review.rating]++;
    totalRating += review.rating;
  });
  
  return {
    total: reviews.length,
    average: Math.round((totalRating / reviews.length) * 10) / 10,
    distribution,
    recent: reviews.slice(0, 5),
  };
}

/**
 * Detect suspicious reviews
 */
export function detectSuspiciousReviews(reviews) {
  const suspicious = [];
  
  reviews.forEach((review, index) => {
    const flags = [];
    
    // Check for all 5-star reviews without comments
    if (review.rating === 5 && !review.comment) {
      flags.push("No comment with 5-star");
    }
    
    // Check for all 1-star reviews without comments
    if (review.rating === 1 && !review.comment) {
      flags.push("No comment with 1-star");
    }
    
    // Check for duplicate content
    const similarReviews = reviews.filter((r, i) => 
      i !== index && r.comment === review.comment && r.comment?.length > 20
    );
    
    if (similarReviews.length > 0) {
      flags.push("Duplicate content");
    }
    
    // Check for excessive punctuation
    if (review.comment && (review.comment.match(/[!?]/g) || []).length > 5) {
      flags.push("Excessive punctuation");
    }
    
    // Check for all caps
    if (review.comment && review.comment === review.comment.toUpperCase() && review.comment.length > 20) {
      flags.push("All caps");
    }
    
    if (flags.length > 0) {
      suspicious.push({
        reviewId: review._id,
        flags,
        rating: review.rating,
        hasComment: !!review.comment,
      });
    }
  });
  
  return suspicious;
}