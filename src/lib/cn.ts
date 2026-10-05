import clsx, { type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: [(v: string) => /^\[\d/.test(v)] }],
    },
  },
});

export const cn = (...v: ClassValue[]) => twMerge(clsx(v));
