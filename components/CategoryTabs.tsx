"use client";

import { useEffect, useRef } from "react";
import clsx from "clsx";

export interface CategoryTab {
  id: string;
  name: string;
}

interface Props {
  categories: CategoryTab[];
  activeCategory: string;
  onSelect: (id: string) => void;
}

export default function CategoryTabs({
  categories,
  activeCategory,
  onSelect,
}: Props) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    const el = refs.current[activeCategory];

    if (!el) return;

    el.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [activeCategory]);

  return (
    <div className="sticky top-0 z-40 border-b border-neutral-200/60 bg-white/90 backdrop-blur-xl">

      <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 py-4">

        {categories.map((category) => (
          <button
            key={category.id}
            ref={(node) => {
              refs.current[category.id] = node;
            }}
            onClick={() => onSelect(category.id)}
            className={clsx(
              "whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-300",
              activeCategory === category.id
                ? "bg-black text-white shadow-lg"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            )}
          >
            {category.name}
          </button>
        ))}

      </div>

    </div>
  );
}