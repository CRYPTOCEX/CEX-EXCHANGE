import React, { JSX } from "react";
import { Star, StarHalf } from "lucide-react";

const Rating = ({ rating }: { rating: number }) => {
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5 ? 1 : 0;
  const emptyStars = 5 - fullStars - halfStar;

  const stars: JSX.Element[] = [];
  for (let i = 0; i < fullStars; i++) {
    stars.push(
      <Star
        key={`full-${i}`}
        className="h-4 w-4 text-warning"
      />
    );
  }
  if (halfStar) {
    stars.push(
      <StarHalf
        key="half"
        className="h-4 w-4 text-warning"
      />
    );
  }
  for (let i = 0; i < emptyStars; i++) {
    stars.push(
      <Star
        key={`empty-${i}`}
        className="h-4 w-4 text-muted-foreground"
      />
    );
  }

  return <div className="flex items-center">{stars}</div>;
};

export default Rating;
