"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import CategoryTabs from "@/components/CategoryTabs";
import ProductCard, {
  ProductCardData,
} from "@/components/ProductCard";
import BottomNavigation from "@/components/BottomNavigation";
import CartSheet, {
  CartLine,
} from "@/components/CartSheet";
import AccountSheet from "@/components/AccountSheet";

interface Category {
  id: string;
  name: string;
  items: ProductCardData[];
}

interface TableInfo {
  id: string;
  name: string;
}

interface RestaurantInfo {
  id: string;
  name: string;
  address?: string | null;
}

interface HallInfo {
  id: string;
  name: string;
}

interface Props {
  token: string;
  table: TableInfo;
  hall?: HallInfo | null;
  restaurant: RestaurantInfo;
  categories: Category[];
}

export default function CustomerMenu({
  token,
  table,
  hall,
  restaurant,
  categories,
}: Props) {
  const [cart, setCart] = useState<Record<string, number>>({});

  const [cartOpen, setCartOpen] = useState(false);

  const [accountOpen, setAccountOpen] = useState(false);

  const [sending, setSending] = useState(false);

  const [activeCategory, setActiveCategory] = useState(
    categories[0]?.id ?? ""
  );

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  function add(id: string) {
    setCart((prev) => ({
      ...prev,
      [id]: (prev[id] ?? 0) + 1,
    }));
  }

  function remove(id: string) {
    setCart((prev) => {
      const qty = (prev[id] ?? 0) - 1;

      if (qty <= 0) {
        const clone = { ...prev };
        delete clone[id];
        return clone;
      }

      return {
        ...prev,
        [id]: qty,
      };
    });
  }

  function clearCart() {
    setCart({});
  }

  const allProducts = useMemo(
    () => categories.flatMap((x) => x.items),
    [categories]
  );

  const cartLines: CartLine[] = useMemo(() => {
    return Object.entries(cart)
      .map(([id, qty]) => {
        const product = allProducts.find((p) => p.id === id);

        if (!product) return null;

        return {
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: qty,
        };
      })
      .filter(Boolean) as CartLine[];
  }, [cart, allProducts]);
  const cartCount = useMemo(
    () => cartLines.reduce((sum, item) => sum + item.quantity, 0),
    [cartLines]
  );

  const subtotal = useMemo(
    () =>
      cartLines.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      ),
    [cartLines]
  );

  const serviceFee = 0;

  const total = subtotal + serviceFee;

  useEffect(() => {
    if (!categories.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) =>
              b.intersectionRatio - a.intersectionRatio
          );

        const firstVisible = visibleEntries[0];

        if (!firstVisible) return;

        setActiveCategory(firstVisible.target.id);
      },
      {
        rootMargin: "-110px 0px -55% 0px",
        threshold: [0.15, 0.3, 0.5, 0.75],
      }
    );

    const sections = Object.values(sectionRefs.current).filter(
      Boolean
    ) as HTMLElement[];

    sections.forEach((section) => observer.observe(section));

    return () => {
      observer.disconnect();
    };
  }, [categories]);

  function scrollToCategory(categoryId: string) {
    const section = sectionRefs.current[categoryId];

    if (!section) return;

    setActiveCategory(categoryId);

    const top =
      section.getBoundingClientRect().top +
      window.scrollY -
      92;

    window.scrollTo({
      top,
      behavior: "smooth",
    });
  }

  function openMenu() {
    setCartOpen(false);
    setAccountOpen(false);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function openCart() {
    setAccountOpen(false);
    setCartOpen(true);
  }

  function openAccount() {
    setCartOpen(false);
    setAccountOpen(true);
  }

  async function submitOrder() {
    if (!cartLines.length || sending) return;

    try {
      setSending(true);

      const response = await fetch(
        `/api/table/${token}/order`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            items: cartLines.map((item) => ({
              menuItemId: item.id,
              quantity: item.quantity,
              note: null,
            })),
            customerNote: null,
          }),
        }
      );

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.error ??
          result?.message ??
          "Sifariş göndərilmədi."
        );
      }

      clearCart();
      setCartOpen(false);

      alert("Sifariş uğurla göndərildi.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Sifariş göndərilərkən xəta baş verdi.";

      alert(message);
    } finally {
      setSending(false);
    }
  }
  return (
    <>
      <main className="mx-auto min-h-screen max-w-lg bg-neutral-50 pb-36">

        {/* Hero */}

        <section className="relative overflow-hidden rounded-b-[36px] bg-neutral-950 px-6 pb-10 pt-10 text-white">

          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

          <div className="absolute -left-16 bottom-0 h-52 w-52 rounded-full bg-white/5 blur-3xl" />

          <div className="relative">

            <p className="text-sm font-semibold uppercase tracking-[0.20em] text-white/60">
              QR Menu
            </p>

            <h1 className="mt-3 text-4xl font-black leading-tight">
              {restaurant.name}
            </h1>

            {restaurant.address && (
              <p className="mt-3 text-sm leading-6 text-white/70">
                {restaurant.address}
              </p>
            )}

            <div className="mt-8 flex flex-wrap gap-3">

              <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur">
                <p className="text-xs text-white/60">
                  Masa
                </p>

                <p className="mt-1 font-bold">
                  {table.name}
                </p>
              </div>

              {hall && (
                <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur">
                  <p className="text-xs text-white/60">
                    Zal
                  </p>

                  <p className="mt-1 font-bold">
                    {hall.name}
                  </p>
                </div>
              )}

            </div>

          </div>

        </section>

        <CategoryTabs
          categories={categories.map((c) => ({
            id: c.id,
            name: c.name,
          }))}
          activeCategory={activeCategory}
          onSelect={scrollToCategory}
        />

        <div className="space-y-10 px-4 py-6">

          {categories.map((category) => (
            <section
              key={category.id}
              id={category.id}
              ref={(node) => {
                sectionRefs.current[category.id] = node;
              }}
            >
              <h2 className="mb-5 text-2xl font-black text-neutral-900">
                {category.name}
              </h2>

              <div className="space-y-4">

                {category.items.map((item) => (

                  <ProductCard
                    key={item.id}
                    product={item}
                    quantity={cart[item.id] ?? 0}
                    onAdd={() => add(item.id)}
                    onRemove={() => remove(item.id)}
                  />

                ))}

              </div>

            </section>
          ))}

        </div>
      </main>

      <CartSheet
        open={cartOpen}
        items={cartLines}
        subtotal={subtotal}
        serviceFee={serviceFee}
        total={total}
        loading={sending}
        onClose={() => setCartOpen(false)}
        onAdd={add}
        onRemove={remove}
        onClear={clearCart}
        onCheckout={submitOrder}
      />

      <AccountSheet
        open={accountOpen}
        restaurantName={restaurant.name}
        tableName={table.name}
        hallName={hall?.name ?? null}
        address={restaurant.address ?? null}
        onClose={() => setAccountOpen(false)}
      />

      <BottomNavigation
        activeItem={
          cartOpen
            ? "cart"
            : accountOpen
              ? "account"
              : "menu"
        }
        cartCount={cartCount}
        onMenuClick={openMenu}
        onCartClick={openCart}
        onAccountClick={openAccount}
      />
    </>
  );
}