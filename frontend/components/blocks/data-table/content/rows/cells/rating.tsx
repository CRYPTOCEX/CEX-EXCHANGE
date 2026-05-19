import React, { JSX } from "react";
import { Icon } from "@iconify/react";

const Rating = ({ rating }: { rating: number }) => {
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5 ? 1 : 0;
  const emptyStars = 5 - fullStars - halfStar;

  const stars: JSX.Element[] = [];
  for (let i = 0; i < fullStars; i++) {
    stars.push(
      <Icon
        key={`full-${i}`}
        icon="uim:star"
        className="h-4 w-4 text-yellow-500"
      />
    );
  }
  if (halfStar) {
    stars.push(
      <Icon
        key="half"
        icon="uim:star-half-alt"
        className="h-4 w-4 text-yellow-500"
      />
    );
  }
  for (let i = 0; i < emptyStars; i++) {
    stars.push(
      <Icon
        key={`empty-${i}`}
        icon="uim:star"
        className="h-4 w-4 text-muted-foreground"
      />
    );
  }

  return <div className="flex items-center">{stars}</div>;
};

export default Rating;
