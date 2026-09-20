import type { Section } from "@/types/builder";
import {
  el,
  row,
  col,
  section,
  singleColumnRow,
  theme,
  sectionPresets,
  rowPresets,
} from "../../utils";

type Arrival = {
  src: string;
  alt: string;
  name: string;
  price: string;
  category: string;
};

const arrivals: Arrival[] = [
  {
    src: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=900&q=85",
    alt: "Analog silver watch with leather band",
    name: "Meridian Watch",
    price: "$189.00",
    category: "Accessories",
  },
  {
    src: "https://images.unsplash.com/photo-1556906781-9a412961c28c?w=900&q=85",
    alt: "Minimal ceramic mug on linen tablecloth",
    name: "Clay Everyday Mug",
    price: "$28.00",
    category: "Home",
  },
  {
    src: "https://images.unsplash.com/photo-1560343090-f0409e92791a?w=900&q=85",
    alt: "Tan leather cross-body bag",
    name: "Boulevard Crossbody",
    price: "$168.00",
    category: "Bags",
  },
  {
    src: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=900&q=85",
    alt: "Minimal desk lamp with warm glow",
    name: "Noa Desk Lamp",
    price: "$94.00",
    category: "Home",
  },
  {
    src: "https://images.unsplash.com/photo-1434056886845-dac89ffe9b56?w=900&q=85",
    alt: "Silver aviator-style sunglasses",
    name: "Aviator Frames",
    price: "$75.00",
    category: "Accessories",
  },
];

const arrivalCard = (a: Arrival) =>
  col(
    100,
    [
      el.image(a.src, a.alt, {
        borderRadius: 14,
        width: "100%",
        height: "auto",
        marginBottom: 14,
      }),
      el.text(a.category.toUpperCase(), {
        fontSize: 10,
        fontWeight: "800",
        color: theme.textDim,
        letterSpacing: "0.16em",
        marginBottom: 4,
      }),
      el.heading(a.name, {
        level: "h3",
        fontSize: 15,
        fontWeight: "600",
        color: theme.text,
        marginBottom: 4,
      }),
      el.text(a.price, {
        fontSize: 14,
        fontWeight: "700",
        color: theme.text,
        marginBottom: 0,
      }),
    ],
    {
      paddingLeft: 0,
      paddingRight: 0,
      width: "240px",
      maxWidth: "240px",
    }
  );

export const ecommerceNewArrivalsScroll: Section = section(
  [
    row(
      [
        col(70, [
          el.text("JUST IN", {
            fontSize: 12,
            fontWeight: "800",
            color: theme.primary,
            letterSpacing: "0.22em",
            marginBottom: 12,
          }),
          el.heading("New arrivals", {
            level: "h2",
            fontSize: 40,
            fontWeight: "800",
            color: theme.text,
            marginBottom: 0,
            letterSpacing: "-0.025em",
            lineHeight: "1.1",
          }),
        ]),
        col(30, [
          el.link("Shop all arrivals →", "/shop/new", {
            fontSize: 15,
            fontWeight: "600",
            color: theme.primary,
          }),
        ], { textAlign: "right", verticalAlign: "bottom" }),
      ],
      { ...rowPresets.wide, gutter: 24, marginBottom: 40, verticalAlign: "bottom" }
    ),
    row(arrivals.map(arrivalCard), {
      ...rowPresets.wide,
      gutter: 20,
      verticalAlign: "top",
      overflow: "auto",
      flexWrap: "nowrap",
    }),
  ],
  {
    name: "New Arrivals Scroll",
    description: "Horizontal-scroll strip of newest products with fixed card width",
    category: "ecommerce",
    slug: "ecommerce-new-arrivals-scroll",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgBase,
    },
  }
);
