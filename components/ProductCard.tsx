"use client";

import Image from "next/image";

export interface ProductCardData {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
}

interface Props {
  product: ProductCardData;
  quantity: number;
  onAdd: () => void;
  onRemove: () => void;
}

function money(price: number) {
  return `${price.toFixed(2)} ₼`;
}

export default function ProductCard({
  product,
  quantity,
  onAdd,
  onRemove,
}: Props) {
  return (
    <article className="overflow-hidden rounded-[28px] border border-neutral-200 bg-white shadow-sm transition-all duration-300 hover:shadow-xl">

      <div className="flex">

        <div className="relative h-36 w-36 shrink-0 overflow-hidden bg-neutral-100">

          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-5xl">

              🍽️

            </div>
          )}

        </div>

        <div className="flex flex-1 flex-col p-5">

          <h3 className="text-xl font-black text-neutral-900">

            {product.name}

          </h3>

          {product.description && (

            <p className="mt-2 line-clamp-2 text-sm leading-6 text-neutral-500">

              {product.description}

            </p>

          )}

          <div className="mt-auto flex items-center justify-between pt-5">

            <span className="text-2xl font-black">

              {money(product.price)}

            </span>
                        {quantity === 0 ? (

              <button
                onClick={onAdd}
                className="rounded-2xl bg-black px-5 py-3 text-sm font-bold text-white transition hover:scale-[1.02] hover:bg-neutral-800 active:scale-95"
              >
                Əlavə et
              </button>

            ) : (

              <div className="flex items-center gap-3 rounded-2xl bg-neutral-100 p-1">

                <button
                  onClick={onRemove}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-xl font-black shadow transition hover:bg-neutral-50 active:scale-95"
                >
                  −
                </button>

                <span className="min-w-[28px] text-center text-lg font-black">

                  {quantity}

                </span>

                <button
                  onClick={onAdd}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-xl font-black text-white transition hover:bg-neutral-800 active:scale-95"
                >
                  +
                </button>

              </div>

            )}

          </div>

        </div>

      </div>

    </article>
  );
}