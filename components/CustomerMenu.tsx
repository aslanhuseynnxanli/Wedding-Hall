"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

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

export interface CustomerSessionItem {
  id: string;
  menuItemId: string | null;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  note: string | null;
  preparationArea: string;
  status: string;
  canCancel: boolean;
  createdAt: string;
  startedAt: string | null;
  readyAt: string | null;
  servedAt: string | null;
  cancelledAt: string | null;
}

export interface CustomerSessionOrder {
  id: string;
  status: string;
  customerNote: string | null;
  submittedAt: string | null;
  createdAt: string;
  items: CustomerSessionItem[];
}

export interface CustomerSessionResponse {
  hasActiveSession: boolean;

  table: {
    id: string;
    number: string;
  };

  session: {
    id: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    billRequestedAt: string | null;
    billReadyAt: string | null;
    billDeliveredAt: string | null;
  } | null;

  orders: CustomerSessionOrder[];

  summary: {
    subtotal: number;
    serviceFeePercent: number;
    serviceFeeAmount: number;
    total: number;
  };
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

  const [sessionData, setSessionData] =
    useState<CustomerSessionResponse | null>(null);

  const [loadingSession, setLoadingSession] =
    useState(true);

  const [sessionError, setSessionError] =
    useState<string | null>(null);

  const [activeCategory, setActiveCategory] = useState(
    categories[0]?.id ?? "",
  );

  const sectionRefs = useRef<
    Record<string, HTMLElement | null>
  >({});

  const loadSession = useCallback(async () => {
    try {
      setLoadingSession(true);
      setSessionError(null);

      const response = await fetch(
        `/api/table/${encodeURIComponent(token)}/session`,
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        },
      );

      const result = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.error ??
            "Masanın açıq hesabı oxunmadı.",
        );
      }

      setSessionData(
        result as CustomerSessionResponse,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Masanın açıq hesabı oxunarkən xəta baş verdi.";

      console.error(
        "Customer session load error:",
        error,
      );

      setSessionError(message);
    } finally {
      setLoadingSession(false);
    }
  }, [token]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  useEffect(() => {
    if (!categories.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) =>
              b.intersectionRatio -
              a.intersectionRatio,
          );

        const firstVisible = visibleEntries[0];

        if (!firstVisible) return;

        setActiveCategory(firstVisible.target.id);
      },
      {
        rootMargin: "-110px 0px -55% 0px",
        threshold: [0.15, 0.3, 0.5, 0.75],
      },
    );

    const sections = Object.values(
      sectionRefs.current,
    ).filter(Boolean) as HTMLElement[];

    sections.forEach((section) => {
      observer.observe(section);
    });

    return () => {
      observer.disconnect();
    };
  }, [categories]);

  function add(id: string) {
    setCart((previous) => ({
      ...previous,
      [id]: (previous[id] ?? 0) + 1,
    }));
  }

  function remove(id: string) {
    setCart((previous) => {
      const quantity = (previous[id] ?? 0) - 1;

      if (quantity <= 0) {
        const nextCart = { ...previous };

        delete nextCart[id];

        return nextCart;
      }

      return {
        ...previous,
        [id]: quantity,
      };
    });
  }

  function clearCart() {
    setCart({});
  }

  const allProducts = useMemo(
    () =>
      categories.flatMap(
        (category) => category.items,
      ),
    [categories],
  );

  const cartLines = useMemo<CartLine[]>(() => {
    return Object.entries(cart)
      .map(([id, quantity]) => {
        const product = allProducts.find(
          (item) => item.id === id,
        );

        if (!product) return null;

        return {
          id: product.id,
          name: product.name,
          price: product.price,
          quantity,
        };
      })
      .filter(
        (item): item is CartLine => item !== null,
      );
  }, [cart, allProducts]);

  const cartCount = useMemo(
    () =>
      cartLines.reduce(
        (sum, item) => sum + item.quantity,
        0,
      ),
    [cartLines],
  );

  const subtotal = useMemo(
    () =>
      cartLines.reduce(
        (sum, item) =>
          sum + item.price * item.quantity,
        0,
      ),
    [cartLines],
  );

  const serviceFeePercent =
    sessionData?.summary.serviceFeePercent ?? 0;

  const serviceFee =
    serviceFeePercent > 0
      ? subtotal * (serviceFeePercent / 100)
      : 0;

  const total = subtotal + serviceFee;

  function scrollToCategory(categoryId: string) {
    const section =
      sectionRefs.current[categoryId];

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

    void loadSession();
  }

  async function submitOrder() {
    if (!cartLines.length || sending) return;

    try {
      setSending(true);

      const response = await fetch(
        `/api/table/${encodeURIComponent(token)}/order`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            items: cartLines.map((item) => ({
              menuItemId: item.id,
              quantity: item.quantity,
              note: null,
            })),
            customerNote: null,
          }),
        },
      );

      const result = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.error ??
            result?.message ??
            "Sifariş göndərilmədi.",
        );
      }

      clearCart();

      await loadSession();

      setCartOpen(false);
      setAccountOpen(true);

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

              {sessionData?.hasActiveSession && (
                <button
                  type="button"
                  onClick={openAccount}
                  className="rounded-2xl bg-white px-4 py-3 text-left text-neutral-950 transition active:scale-[0.98]"
                >
                  <p className="text-xs font-semibold text-neutral-400">
                    Cari hesab
                  </p>

                  <p className="mt-1 font-black">
                    {sessionData.summary.total.toFixed(2)} ₼
                  </p>
                </button>
              )}
            </div>
          </div>
        </section>

        <CategoryTabs
          categories={categories.map((category) => ({
            id: category.id,
            name: category.name,
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
                sectionRefs.current[category.id] =
                  node;
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
                    onRemove={() =>
                      remove(item.id)
                    }
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
        sessionData={sessionData}
        loading={loadingSession}
        error={sessionError}
        onRefresh={loadSession}
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