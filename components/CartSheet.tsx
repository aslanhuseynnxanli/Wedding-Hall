"use client";

import { X, Minus, Plus, ShoppingBag } from "lucide-react";

export interface CartLine {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface Props {
  open: boolean;
  items: CartLine[];
  subtotal: number;
  serviceFee: number;
  total: number;
  loading?: boolean;
  onClose: () => void;
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onCheckout: () => void;
}

function money(value: number) {
  return `${value.toFixed(2)} ₼`;
}

export default function CartSheet({
  open,
  items,
  subtotal,
  serviceFee,
  total,
  loading = false,
  onClose,
  onAdd,
  onRemove,
  onClear,
  onCheckout,
}: Props) {
  if (!open) return null;

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
      />

      <div className="fixed inset-x-0 bottom-0 z-[61] mx-auto flex max-h-[88vh] w-full max-w-lg flex-col rounded-t-[34px] bg-white shadow-2xl">

        {/* Header */}

        <div className="flex items-center justify-between border-b px-6 py-5">

          <div>

            <h2 className="text-2xl font-black">
              Səbət
            </h2>

            <p className="text-sm text-neutral-500">
              {items.length} məhsul
            </p>

          </div>

          <button
            onClick={onClose}
            className="rounded-xl bg-neutral-100 p-2 transition hover:bg-neutral-200"
          >
            <X size={20} />
          </button>

        </div>

        {/* Empty */}

        {items.length === 0 && (

          <div className="flex flex-1 flex-col items-center justify-center px-8 py-16">

            <ShoppingBag
              size={58}
              className="text-neutral-300"
            />

            <h3 className="mt-5 text-xl font-bold">

              Səbət boşdur

            </h3>

            <p className="mt-2 text-center text-sm text-neutral-500">

              Menyudan məhsul əlavə edin.

            </p>

          </div>

        )}

        {/* Items */}

        {items.length > 0 && (

          <>
            <div className="flex-1 overflow-y-auto px-6 py-4">

              <div className="space-y-4">

                {items.map((item) => (

                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-2xl border border-neutral-200 p-4"
                  >

                    <div>

                      <h4 className="font-bold">

                        {item.name}

                      </h4>

                      <p className="mt-1 text-sm text-neutral-500">

                        {money(item.price)}

                      </p>

                    </div>

                    <div className="flex items-center gap-3">

                      <button
                        onClick={() => onRemove(item.id)}
                        className="rounded-xl bg-neutral-100 p-2 transition hover:bg-neutral-200"
                      >
                        <Minus size={16} />
                      </button>

                      <span className="min-w-[22px] text-center font-bold">

                        {item.quantity}

                      </span>

                      <button
                        onClick={() => onAdd(item.id)}
                        className="rounded-xl bg-black p-2 text-white transition hover:bg-neutral-800"
                      >
                        <Plus size={16} />
                      </button>

                    </div>

                  </div>

                ))}

              </div>

            </div>

            {/* Totals */}

            <div className="border-t bg-white px-6 py-6">

              <div className="space-y-3 text-sm">

                <div className="flex justify-between">

                  <span className="text-neutral-500">

                    Məbləğ

                  </span>

                  <span>

                    {money(subtotal)}

                  </span>

                </div>

                <div className="flex justify-between">

                  <span className="text-neutral-500">

                    Xidmət haqqı

                  </span>

                  <span>

                    {money(serviceFee)}

                  </span>

                </div>

                <div className="flex justify-between border-t pt-3 text-lg font-black">

                  <span>

                    Cəmi

                  </span>

                  <span>

                    {money(total)}

                  </span>

                </div>

              </div>

              <div className="mt-6 flex gap-3">

                <button
                  onClick={onClear}
                  className="flex-1 rounded-2xl border border-neutral-300 py-4 font-semibold transition hover:bg-neutral-100"
                >
                  Təmizlə
                </button>

                <button
                  disabled={loading}
                  onClick={onCheckout}
                  className="flex-1 rounded-2xl bg-black py-4 font-bold text-white transition hover:bg-neutral-800 disabled:opacity-50"
                >
                  {loading ? "Göndərilir..." : "Sifariş et"}
                </button>

              </div>

            </div>

          </>

        )}

      </div>
    </>
  );
}