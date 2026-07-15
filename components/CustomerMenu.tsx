"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

export type CustomerMenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  preparationArea: "KITCHEN" | "WAITER";
};

export type CustomerMenuCategory = {
  id: string;
  name: string;
  sortOrder: number;
  items: CustomerMenuItem[];
};

type CartLine = {
  item: CustomerMenuItem;
  categoryName: string;
  quantity: number;
};

type OrderResult = {
  orderId: string;
  sessionId: string;
  subtotal: number;
  serviceFeeAmount: number;
  total: number;
};

interface CustomerMenuProps {
  token: string;
  categories: CustomerMenuCategory[];
  serviceFeePercent: number;
}

function formatPrice(value: number) {
  return `${Number(value).toFixed(2)} ₼`;
}

function roundMoney(value: number) {
  return Math.round(
    (value + Number.EPSILON) * 100,
  ) / 100;
}

export default function CustomerMenu({
  token,
  categories,
  serviceFeePercent,
}: CustomerMenuProps) {
  const [quantities, setQuantities] =
    useState<Record<string, number>>({});

  const [cartOpen, setCartOpen] =
    useState(false);

  const [customerNote, setCustomerNote] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const [orderResult, setOrderResult] =
    useState<OrderResult | null>(null);

  useEffect(() => {
    if (!cartOpen) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [cartOpen]);

  const cartLines = useMemo(() => {
    const lines: CartLine[] = [];

    for (const category of categories) {
      for (const item of category.items) {
        const quantity =
          quantities[item.id] ?? 0;

        if (quantity > 0) {
          lines.push({
            item,
            categoryName: category.name,
            quantity,
          });
        }
      }
    }

    return lines;
  }, [categories, quantities]);

  const cartCount = useMemo(() => {
    return cartLines.reduce(
      (total, line) =>
        total + line.quantity,
      0,
    );
  }, [cartLines]);

  const subtotal = useMemo(() => {
    return roundMoney(
      cartLines.reduce(
        (total, line) =>
          total +
          line.item.price * line.quantity,
        0,
      ),
    );
  }, [cartLines]);

  const serviceFeeAmount = useMemo(() => {
    return roundMoney(
      subtotal *
        (Number(serviceFeePercent) / 100),
    );
  }, [subtotal, serviceFeePercent]);

  const total = useMemo(() => {
    return roundMoney(
      subtotal + serviceFeeAmount,
    );
  }, [subtotal, serviceFeeAmount]);

  function addItem(itemId: string) {
    setOrderResult(null);
    setErrorMessage(null);

    setQuantities((current) => ({
      ...current,
      [itemId]: Math.min(
        (current[itemId] ?? 0) + 1,
        99,
      ),
    }));
  }

  function removeItem(itemId: string) {
    setOrderResult(null);
    setErrorMessage(null);

    setQuantities((current) => {
      const currentQuantity =
        current[itemId] ?? 0;

      const next = {
        ...current,
      };

      if (currentQuantity <= 1) {
        delete next[itemId];
      } else {
        next[itemId] =
          currentQuantity - 1;
      }

      return next;
    });
  }

  function clearCart() {
    setQuantities({});
    setCustomerNote("");
    setErrorMessage(null);
  }

  function scrollToCategory(
    categoryId: string,
  ) {
    document
      .getElementById(
        `category-${categoryId}`,
      )
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  }

  async function submitOrder() {
  if (cartLines.length === 0) {
    setErrorMessage("Səbət boşdur.");
    return;
  }

  try {
    setSubmitting(true);
    setErrorMessage(null);
    setOrderResult(null);

    const apiUrl =
      `/api/table/${encodeURIComponent(token)}/order`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: cartLines.map((line) => ({
          menuItemId: line.item.id,
          quantity: line.quantity,
          note: null,
        })),
        customerNote:
          customerNote.trim() || null,
      }),
    });

    const responseText = await response.text();

    console.log("ORDER API URL:", apiUrl);
    console.log("ORDER API STATUS:", response.status);
    console.log("ORDER API RESPONSE:", responseText);

    let result: {
      success?: boolean;
      error?: string;
      orderId?: string;
      sessionId?: string;
      subtotal?: number;
      serviceFeeAmount?: number;
      total?: number;
    } | null = null;

    try {
      result = responseText
        ? JSON.parse(responseText)
        : null;
    } catch {
      result = null;
    }

    if (!response.ok) {
      if (result?.error) {
        throw new Error(result.error);
      }

      if (response.status === 404) {
        throw new Error(
          "Sifariş API route-u tapılmadı. app/api/table/[token]/order/route.ts yolunu yoxlayın.",
        );
      }

      throw new Error(
        `Sifariş API xətası: HTTP ${response.status}. ` +
          (responseText
            ? responseText.slice(0, 250)
            : "Server boş cavab qaytardı."),
      );
    }

    if (
      !result?.orderId ||
      !result?.sessionId
    ) {
      throw new Error(
        "Server sifariş nəticəsini düzgün qaytarmadı.",
      );
    }

    setOrderResult({
      orderId: result.orderId,
      sessionId: result.sessionId,
      subtotal: Number(result.subtotal ?? 0),
      serviceFeeAmount: Number(
        result.serviceFeeAmount ?? 0,
      ),
      total: Number(result.total ?? 0),
    });

    setQuantities({});
    setCustomerNote("");
    setCartOpen(false);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  } catch (error) {
    console.error(
      "Submit customer order error:",
      error,
    );

    setErrorMessage(
      error instanceof Error
        ? error.message
        : "Sifariş göndərilmədi.",
    );
  } finally {
    setSubmitting(false);
  }
}

  if (categories.length === 0) {
    return (
      <section className="mt-6 rounded-3xl border border-gray-200 bg-white p-7 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 text-2xl font-black text-gray-700">
          M
        </div>

        <h2 className="mt-4 text-xl font-extrabold text-gray-950">
          Menyu hazırlanır
        </h2>

        <p className="mt-2 text-sm leading-6 text-gray-500">
          Bu restoran üçün aktiv məhsul
          tapılmadı.
        </p>
      </section>
    );
  }

  return (
    <>
      <section className="mt-6">
        {orderResult ? (
          <div className="mb-5 rounded-3xl border border-green-200 bg-green-50 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-green-600 text-xl font-black text-white">
                ✓
              </div>

              <div>
                <h2 className="text-lg font-extrabold text-green-950">
                  Sifariş qəbul edildi
                </h2>

                <p className="mt-1 text-sm leading-5 text-green-800">
                  Sifariş mətbəxə və
                  ofisianta göndərildi.
                </p>

                <p className="mt-2 text-xs font-semibold text-green-700">
                  Sifariş:
                  {" "}
                  {orderResult.orderId
                    .slice(0, 8)
                    .toUpperCase()}
                </p>

                <p className="mt-1 text-sm font-extrabold text-green-950">
                  Cari masa hesabı:
                  {" "}
                  {formatPrice(
                    orderResult.total,
                  )}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="sticky top-0 z-20 -mx-4 border-y border-gray-200 bg-gray-100/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() =>
                  scrollToCategory(
                    category.id,
                  )
                }
                className="shrink-0 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-800 shadow-sm transition active:scale-95"
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 space-y-7">
          {categories.map((category) => (
            <section
              key={category.id}
              id={`category-${category.id}`}
              className="scroll-mt-20"
            >
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Kateqoriya
                  </p>

                  <h2 className="mt-1 text-2xl font-black text-gray-950">
                    {category.name}
                  </h2>
                </div>

                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-gray-500 shadow-sm">
                  {category.items.length}
                  {" "}
                  məhsul
                </span>
              </div>

              <div className="space-y-3">
                {category.items.map(
                  (item) => {
                    const quantity =
                      quantities[item.id] ?? 0;

                    return (
                      <article
                        key={item.id}
                        className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gray-950 text-lg font-black text-white">
                            {item.name
                              .trim()
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div className="min-w-0 flex-1">
                            <h3 className="text-base font-extrabold text-gray-950">
                              {item.name}
                            </h3>

                            {item.description ? (
                              <p className="mt-1 text-sm leading-5 text-gray-500">
                                {
                                  item.description
                                }
                              </p>
                            ) : null}

                            <p className="mt-3 text-lg font-black text-gray-950">
                              {formatPrice(
                                item.price,
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-end">
                          {quantity === 0 ? (
                            <button
                              type="button"
                              onClick={() =>
                                addItem(item.id)
                              }
                              className="min-h-11 rounded-2xl bg-gray-950 px-5 text-sm font-extrabold text-white transition active:scale-95"
                            >
                              Səbətə əlavə et
                            </button>
                          ) : (
                            <div className="flex items-center gap-3 rounded-2xl bg-gray-100 p-1">
                              <button
                                type="button"
                                aria-label={`${item.name} sayını azalt`}
                                onClick={() =>
                                  removeItem(
                                    item.id,
                                  )
                                }
                                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-xl font-black text-gray-950 shadow-sm transition active:scale-90"
                              >
                                −
                              </button>

                              <span className="min-w-7 text-center text-base font-black text-gray-950">
                                {quantity}
                              </span>

                              <button
                                type="button"
                                aria-label={`${item.name} sayını artır`}
                                onClick={() =>
                                  addItem(item.id)
                                }
                                className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-950 text-xl font-black text-white transition active:scale-90"
                              >
                                +
                              </button>
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  },
                )}
              </div>
            </section>
          ))}
        </div>
      </section>

      {cartCount > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 p-3 shadow-[0_-12px_35px_rgba(0,0,0,0.12)] backdrop-blur">
          <div className="mx-auto max-w-xl">
            <button
              type="button"
              onClick={() =>
                setCartOpen(true)
              }
              className="flex min-h-14 w-full items-center justify-between rounded-2xl bg-gray-950 px-5 text-white transition active:scale-[0.99]"
            >
              <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-white px-2 text-sm font-black text-gray-950">
                {cartCount}
              </span>

              <span className="font-extrabold">
                Səbətə bax
              </span>

              <span className="font-black">
                {formatPrice(total)}
              </span>
            </button>
          </div>
        </div>
      ) : null}

      {cartOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/45 sm:items-center sm:justify-center sm:p-5"
          role="dialog"
          aria-modal="true"
          aria-label="Səbət"
        >
          <button
            type="button"
            aria-label="Səbəti bağla"
            className="absolute inset-0 cursor-default"
            onClick={() =>
              setCartOpen(false)
            }
          />

          <div className="relative z-10 max-h-[92vh] w-full overflow-hidden rounded-t-[2rem] bg-white shadow-2xl sm:max-w-xl sm:rounded-[2rem]">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Sifariş
                </p>

                <h2 className="mt-1 text-2xl font-black text-gray-950">
                  Səbət
                </h2>
              </div>

              <button
                type="button"
                aria-label="Səbəti bağla"
                onClick={() =>
                  setCartOpen(false)
                }
                className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-100 text-2xl font-bold text-gray-700"
              >
                ×
              </button>
            </div>

            <div className="max-h-[calc(92vh-190px)] overflow-y-auto px-5 py-4">
              <div className="space-y-3">
                {cartLines.map((line) => (
                  <div
                    key={line.item.id}
                    className="rounded-2xl border border-gray-200 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-extrabold text-gray-950">
                          {line.item.name}
                        </h3>

                        <p className="mt-1 text-xs font-semibold text-gray-400">
                          {line.categoryName}
                        </p>

                        <p className="mt-2 text-sm font-black text-gray-950">
                          {formatPrice(
                            line.item.price *
                              line.quantity,
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 rounded-xl bg-gray-100 p-1">
                        <button
                          type="button"
                          onClick={() =>
                            removeItem(
                              line.item.id,
                            )
                          }
                          className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-lg font-black shadow-sm"
                        >
                          −
                        </button>

                        <span className="min-w-6 text-center font-black">
                          {line.quantity}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            addItem(
                              line.item.id,
                            )
                          }
                          className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-950 text-lg font-black text-white"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <label className="mt-5 block">
                <span className="text-sm font-extrabold text-gray-800">
                  Sifariş qeydi
                </span>

                <textarea
                  value={customerNote}
                  onChange={(event) =>
                    setCustomerNote(
                      event.target.value.slice(
                        0,
                        500,
                      ),
                    )
                  }
                  rows={3}
                  placeholder="Məsələn: Soğansız hazırlayın"
                  className="mt-2 w-full resize-none rounded-2xl border border-gray-300 px-4 py-3 text-sm text-gray-950 outline-none transition focus:border-gray-950"
                />

                <span className="mt-1 block text-right text-xs text-gray-400">
                  {customerNote.length}/500
                </span>
              </label>

              <div className="mt-5 space-y-3 rounded-2xl bg-gray-100 p-4">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Ara cəm</span>

                  <span className="font-bold text-gray-950">
                    {formatPrice(subtotal)}
                  </span>
                </div>

                {serviceFeePercent > 0 ? (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>
                      Servis haqqı
                      {" "}
                      ({serviceFeePercent}%)
                    </span>

                    <span className="font-bold text-gray-950">
                      {formatPrice(
                        serviceFeeAmount,
                      )}
                    </span>
                  </div>
                ) : null}

                <div className="border-t border-gray-300 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-gray-950">
                      Ümumi
                    </span>

                    <span className="text-xl font-black text-gray-950">
                      {formatPrice(total)}
                    </span>
                  </div>
                </div>
              </div>

              {errorMessage ? (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                  {errorMessage}
                </div>
              ) : null}
            </div>

            <div className="border-t border-gray-200 bg-white p-4">
              <button
                type="button"
                onClick={submitOrder}
                disabled={
                  submitting ||
                  cartLines.length === 0
                }
                className="flex min-h-14 w-full items-center justify-center rounded-2xl bg-gray-950 px-5 text-base font-extrabold text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting
                  ? "Sifariş göndərilir..."
                  : `Sifarişi təsdiqlə · ${formatPrice(
                      total,
                    )}`}
              </button>

              <button
                type="button"
                onClick={clearCart}
                disabled={submitting}
                className="mt-2 min-h-11 w-full rounded-xl text-sm font-bold text-red-600 disabled:opacity-50"
              >
                Səbəti təmizlə
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}