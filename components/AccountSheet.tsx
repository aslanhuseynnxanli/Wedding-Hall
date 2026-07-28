"use client";

import { useState } from "react";

import {
    AlertCircle,
    Ban,
    ChefHat,
    CheckCircle2,
    Clock3,
    Loader2,
    ReceiptText,
    RefreshCw,
    Store,
    UtensilsCrossed,
    WalletCards,
    X,
} from "lucide-react";

interface CustomerSessionItem {
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

interface CustomerSessionOrder {
    id: string;
    status: string;
    customerNote: string | null;
    submittedAt: string | null;
    createdAt: string;
    items: CustomerSessionItem[];
}

interface CustomerSessionResponse {
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

interface Props {
    open: boolean;
    token: string;
    restaurantName: string;
    tableName: string;
    hallName?: string | null;
    address?: string | null;
    sessionData: CustomerSessionResponse | null;
    loading: boolean;
    error: string | null;
    onRefresh: () => void | Promise<void>;
    onClose: () => void;
}

type StatusView = {
    label: string;
    className: string;
    icon: React.ReactNode;
};
type PaymentMethod = "CASH" | "CARD" | "OTHER";

function formatMoney(value: number) {
    return `${Number(value || 0).toFixed(2)} ₼`;
}

function formatDate(value: string | null | undefined) {
    if (!value) return null;

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return new Intl.DateTimeFormat("az-AZ", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

function getItemStatus(status: string): StatusView {
    switch (status) {
        case "NEW":
            return {
                label: "Qəbul gözləyir",
                className:
                    "border-amber-200 bg-amber-50 text-amber-700",
                icon: <Clock3 size={14} />,
            };

        case "PREPARING":
        case "IN_PROGRESS":
            return {
                label: "Hazırlanır",
                className:
                    "border-blue-200 bg-blue-50 text-blue-700",
                icon: <ChefHat size={14} />,
            };

        case "READY":
            return {
                label: "Hazırdır",
                className:
                    "border-emerald-200 bg-emerald-50 text-emerald-700",
                icon: <CheckCircle2 size={14} />,
            };

        case "SERVED":
            return {
                label: "Təqdim edildi",
                className:
                    "border-neutral-200 bg-neutral-100 text-neutral-700",
                icon: <UtensilsCrossed size={14} />,
            };

        case "CANCELLED":
            return {
                label: "Ləğv edildi",
                className:
                    "border-red-200 bg-red-50 text-red-700",
                icon: <Ban size={14} />,
            };

        default:
            return {
                label: status || "Naməlum",
                className:
                    "border-neutral-200 bg-neutral-100 text-neutral-600",
                icon: <Clock3 size={14} />,
            };
    }
}

function getSessionStatus(status: string) {
    switch (status) {
        case "OPEN":
            return {
                label: "Hesab açıqdır",
                className:
                    "bg-emerald-400 text-emerald-950",
            };

        case "BILL_REQUESTED":
            return {
                label: "Hesab istənilib",
                className:
                    "bg-amber-300 text-amber-950",
            };

        case "BILL_READY":
            return {
                label: "Hesab hazırdır",
                className:
                    "bg-blue-300 text-blue-950",
            };

        case "BILL_DELIVERED":
            return {
                label: "Hesab təqdim edilib",
                className:
                    "bg-violet-300 text-violet-950",
            };

        default:
            return {
                label: status,
                className:
                    "bg-white/15 text-white",
            };
    }
}

function LoadingContent() {
    return (
        <div className="space-y-4 py-2">
            <div className="h-44 animate-pulse rounded-[30px] bg-neutral-200" />

            <div className="space-y-3">
                <div className="h-24 animate-pulse rounded-3xl bg-neutral-100" />
                <div className="h-24 animate-pulse rounded-3xl bg-neutral-100" />
                <div className="h-32 animate-pulse rounded-3xl bg-neutral-100" />
            </div>
        </div>
    );
}

function EmptyAccount({
    restaurantName,
    tableName,
}: {
    restaurantName: string;
    tableName: string;
}) {
    return (
        <div className="py-3">
            <div className="relative overflow-hidden rounded-[30px] bg-neutral-950 p-6 text-white">
                <div className="absolute -right-12 -top-14 h-40 w-40 rounded-full bg-white/10 blur-3xl" />

                <div className="relative">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                        <ReceiptText size={23} />
                    </div>

                    <p className="mt-7 text-sm font-medium text-white/55">
                        {restaurantName}
                    </p>

                    <h3 className="mt-1 text-3xl font-black">
                        Açıq hesab yoxdur
                    </h3>

                    <p className="mt-3 max-w-sm text-sm leading-6 text-white/65">
                        Masa {tableName} üçün hələ sifariş yaradılmayıb.
                        Menyudan məhsul seçib ilk sifarişinizi göndərə
                        bilərsiniz.
                    </p>
                </div>
            </div>

            <div className="mt-5 flex items-start gap-3 rounded-3xl border border-neutral-200 bg-neutral-50 p-5">
                <WalletCards
                    size={21}
                    className="mt-0.5 shrink-0 text-neutral-500"
                />

                <div>
                    <p className="font-bold text-neutral-900">
                        Hesab necə işləyir?
                    </p>

                    <p className="mt-1 text-sm leading-6 text-neutral-500">
                        Verdiyiniz bütün sifarişlər eyni masa hesabında
                        toplanacaq. Kassa masanı bağladıqdan sonra hesab
                        avtomatik sıfırlanacaq.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function AccountSheet({
    open,
    token,
    restaurantName,
    tableName,
    hallName,
    address,
    sessionData,
    loading,
    error,
    onRefresh,
    onClose,
}: Props) {
    const [cancellingItemId, setCancellingItemId] =
        useState<string | null>(null);
    const [paymentModalOpen, setPaymentModalOpen] =
        useState(false);

    const [selectedPaymentMethod, setSelectedPaymentMethod] =
        useState<PaymentMethod | null>(null);

    const [requestingBill, setRequestingBill] =
        useState(false);

    if (!open) return null;

    const activeSession =
        sessionData?.hasActiveSession &&
            sessionData.session
            ? sessionData.session
            : null;

    const sessionStatus = activeSession
        ? getSessionStatus(activeSession.status)
        : null;

    const allItems =
        sessionData?.orders.flatMap(
            (order) => order.items,
        ) ?? [];

    const activeItems = allItems.filter(
        (item) => item.status !== "CANCELLED",
    );

    const cancelledItems = allItems.filter(
        (item) => item.status === "CANCELLED",
    );
    const canRequestBill =
        activeItems.length > 0 &&
        activeItems.every(
            (item) => item.status === "SERVED",
        );
    const cancelItem = async (
        itemId: string,
        itemName: string,
    ) => {
        if (cancellingItemId) {
            return;
        }

        const confirmed = window.confirm(
            `"${itemName}" məhsulunu ləğv etmək istəyirsiniz?`,
        );

        if (!confirmed) {
            return;
        }

        try {
            setCancellingItemId(itemId);

            const response = await fetch(
                `/api/table/${encodeURIComponent(
                    token,
                )}/items/${encodeURIComponent(
                    itemId,
                )}/cancel`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                },
            );

            const result = (await response
                .json()
                .catch(() => null)) as
                | {
                    success?: boolean;
                    error?: string;
                    message?: string;
                }
                | null;

            if (!response.ok) {
                window.alert(
                    result?.error ||
                    "Məhsul ləğv edilə bilmədi.",
                );

                return;
            }

            await onRefresh();

            window.alert(
                result?.message ||
                "Məhsul uğurla ləğv edildi.",
            );
        } catch (cancelError) {
            console.error(
                "Cancel item error:",
                cancelError,
            );

            window.alert(
                "Məhsul ləğv edilərkən gözlənilməz xəta baş verdi.",
            );
        } finally {
            setCancellingItemId(null);
        }
    };

    const requestBill = async () => {
        if (!selectedPaymentMethod || requestingBill) {
            return;
        }

        try {
            setRequestingBill(true);

            const response = await fetch(
                `/api/table/${encodeURIComponent(
                    token,
                )}/bill-request`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify({
                        paymentMethod:
                            selectedPaymentMethod,
                    }),
                },
            );

            const result = (await response
                .json()
                .catch(() => null)) as
                | {
                    error?: string;
                    success?: boolean;
                    paymentMethod?: PaymentMethod;
                }
                | null;

            if (!response.ok) {
                window.alert(
                    result?.error ||
                    "Hesab istənilə bilmədi.",
                );

                return;
            }

            setPaymentModalOpen(false);
            setSelectedPaymentMethod(null);

            await onRefresh();

            window.alert(
                "Hesab restoran əməkdaşlarına göndərildi.",
            );
        } catch (requestError) {
            console.error(
                "Bill request error:",
                requestError,
            );

            window.alert(
                "Hesab istənilərkən gözlənilməz xəta baş verdi.",
            );
        } finally {
            setRequestingBill(false);
        }
    };

    return (
        <>
            <button
                type="button"
                aria-label="Hesab pəncərəsini bağla"
                onClick={onClose}
                className="fixed inset-0 z-[60] bg-black/45 backdrop-blur-sm"
            />

            <section className="fixed inset-x-0 bottom-0 z-[61] mx-auto max-h-[92vh] w-full max-w-lg overflow-hidden rounded-t-[34px] bg-white shadow-2xl">
                <div className="flex justify-center pt-3">
                    <div className="h-1.5 w-12 rounded-full bg-neutral-200" />
                </div>

                <header className="flex items-center justify-between border-b border-neutral-100 px-6 pb-5 pt-4">
                    <div>
                        <p className="text-sm font-semibold text-neutral-400">
                            Masa {tableName}
                            {hallName
                                ? ` · ${hallName}`
                                : ""}
                        </p>

                        <h2 className="mt-1 text-2xl font-black text-neutral-950">
                            Mənim hesabım
                        </h2>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() =>
                                void onRefresh()
                            }
                            disabled={loading}
                            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-700 transition hover:bg-neutral-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                            aria-label="Hesabı yenilə"
                        >
                            {loading ? (
                                <Loader2
                                    size={19}
                                    className="animate-spin"
                                />
                            ) : (
                                <RefreshCw size={19} />
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={onClose}
                            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-700 transition hover:bg-neutral-200 active:scale-95"
                            aria-label="Bağla"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </header>

                <div className="max-h-[calc(92vh-94px)] overflow-y-auto px-5 pb-[max(30px,env(safe-area-inset-bottom))] pt-5">
                    {loading && !sessionData ? (
                        <LoadingContent />
                    ) : error && !sessionData ? (
                        <div className="py-8">
                            <div className="rounded-[28px] border border-red-200 bg-red-50 p-6 text-center">
                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600">
                                    <AlertCircle
                                        size={24}
                                    />
                                </div>

                                <h3 className="mt-4 text-lg font-black text-red-950">
                                    Hesab yüklənmədi
                                </h3>

                                <p className="mt-2 text-sm leading-6 text-red-700">
                                    {error}
                                </p>

                                <button
                                    type="button"
                                    onClick={() =>
                                        void onRefresh()
                                    }
                                    className="mt-5 rounded-2xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition active:scale-[0.98]"
                                >
                                    Yenidən yoxla
                                </button>
                            </div>
                        </div>
                    ) : !sessionData?.hasActiveSession ? (
                        <EmptyAccount
                            restaurantName={
                                restaurantName
                            }
                            tableName={tableName}
                        />
                    ) : (
                        <>
                            <div className="relative overflow-hidden rounded-[30px] bg-neutral-950 p-6 text-white">
                                <div className="absolute -right-14 -top-16 h-48 w-48 rounded-full bg-white/10 blur-3xl" />

                                <div className="absolute -bottom-16 -left-10 h-44 w-44 rounded-full bg-white/5 blur-3xl" />

                                <div className="relative">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
                                            <WalletCards
                                                size={23}
                                            />
                                        </div>

                                        {sessionStatus && (
                                            <span
                                                className={`rounded-full px-3 py-1.5 text-xs font-black ${sessionStatus.className}`}
                                            >
                                                {
                                                    sessionStatus.label
                                                }
                                            </span>
                                        )}
                                    </div>

                                    <p className="mt-7 text-sm font-medium text-white/55">
                                        Ümumi ödəniləcək
                                        məbləğ
                                    </p>

                                    <p className="mt-1 text-4xl font-black tracking-tight">
                                        {formatMoney(
                                            sessionData
                                                .summary
                                                .total,
                                        )}
                                    </p>

                                    <div className="mt-7 grid grid-cols-2 gap-3">
                                        <div className="rounded-2xl bg-white/10 p-4">
                                            <p className="text-xs font-medium text-white/50">
                                                Məhsullar
                                            </p>

                                            <p className="mt-1 text-lg font-black">
                                                {formatMoney(
                                                    sessionData
                                                        .summary
                                                        .subtotal,
                                                )}
                                            </p>
                                        </div>

                                        <div className="rounded-2xl bg-white/10 p-4">
                                            <p className="text-xs font-medium text-white/50">
                                                Servis haqqı{" "}
                                                {sessionData
                                                    .summary
                                                    .serviceFeePercent >
                                                    0
                                                    ? `(${sessionData.summary.serviceFeePercent}%)`
                                                    : ""}
                                            </p>

                                            <p className="mt-1 text-lg font-black">
                                                {formatMoney(
                                                    sessionData
                                                        .summary
                                                        .serviceFeeAmount,
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    {activeSession?.createdAt && (
                                        <div className="mt-5 flex items-center gap-2 text-xs font-medium text-white/55">
                                            <Clock3
                                                size={15}
                                            />

                                            <span>
                                                Hesab açılıb:{" "}
                                                {formatDate(
                                                    activeSession.createdAt,
                                                )}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="mt-6 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-400">
                                        Sifariş tarixçəsi
                                    </p>

                                    <h3 className="mt-1 text-xl font-black text-neutral-950">
                                        Seçilən məhsullar
                                    </h3>
                                </div>

                                <div className="rounded-2xl bg-neutral-100 px-3 py-2 text-sm font-black text-neutral-700">
                                    {activeItems.reduce(
                                        (
                                            sum,
                                            item,
                                        ) =>
                                            sum +
                                            Number(
                                                item.quantity,
                                            ),
                                        0,
                                    )}{" "}
                                    ədəd
                                </div>
                            </div>

                            {sessionData.orders.length ===
                                0 ? (
                                <div className="mt-4 rounded-3xl border border-dashed border-neutral-300 p-7 text-center">
                                    <ReceiptText
                                        size={28}
                                        className="mx-auto text-neutral-300"
                                    />

                                    <p className="mt-3 font-bold text-neutral-700">
                                        Sifariş tapılmadı
                                    </p>
                                </div>
                            ) : (
                                <div className="mt-4 space-y-5">
                                    {sessionData.orders.map(
                                        (
                                            order,
                                            orderIndex,
                                        ) => {
                                            const visibleOrderItems =
                                                order.items.filter(
                                                    (
                                                        item,
                                                    ) =>
                                                        item.status !==
                                                        "CANCELLED",
                                                );

                                            if (
                                                visibleOrderItems.length ===
                                                0
                                            ) {
                                                return null;
                                            }

                                            return (
                                                <article
                                                    key={
                                                        order.id
                                                    }
                                                    className="overflow-hidden rounded-[28px] border border-neutral-200 bg-white"
                                                >
                                                    <div className="flex items-center justify-between border-b border-neutral-100 bg-neutral-50 px-5 py-4">
                                                        <div>
                                                            <p className="text-sm font-black text-neutral-900">
                                                                Sifariş #
                                                                {orderIndex +
                                                                    1}
                                                            </p>

                                                            <p className="mt-1 text-xs font-medium text-neutral-400">
                                                                {formatDate(
                                                                    order.submittedAt ??
                                                                    order.createdAt,
                                                                )}
                                                            </p>
                                                        </div>

                                                        <ReceiptText
                                                            size={
                                                                19
                                                            }
                                                            className="text-neutral-400"
                                                        />
                                                    </div>

                                                    <div className="divide-y divide-neutral-100 px-5">
                                                        {visibleOrderItems.map(
                                                            (
                                                                item,
                                                            ) => {
                                                                const status =
                                                                    getItemStatus(
                                                                        item.status,
                                                                    );

                                                                const isCancelling =
                                                                    cancellingItemId ===
                                                                    item.id;

                                                                return (
                                                                    <div
                                                                        key={
                                                                            item.id
                                                                        }
                                                                        className="py-5"
                                                                    >
                                                                        <div className="flex items-start justify-between gap-4">
                                                                            <div className="min-w-0 flex-1">
                                                                                <div className="flex items-start gap-3">
                                                                                    <div className="flex h-9 min-w-9 items-center justify-center rounded-xl bg-neutral-950 px-2 text-sm font-black text-white">
                                                                                        {
                                                                                            item.quantity
                                                                                        }
                                                                                        ×
                                                                                    </div>

                                                                                    <div className="min-w-0">
                                                                                        <p className="font-black leading-5 text-neutral-950">
                                                                                            {
                                                                                                item.name
                                                                                            }
                                                                                        </p>

                                                                                        <p className="mt-1 text-sm font-medium text-neutral-400">
                                                                                            {formatMoney(
                                                                                                item.unitPrice,
                                                                                            )}{" "}
                                                                                            /
                                                                                            ədəd
                                                                                        </p>
                                                                                    </div>
                                                                                </div>

                                                                                {item.note && (
                                                                                    <p className="mt-3 rounded-xl bg-neutral-50 px-3 py-2 text-xs leading-5 text-neutral-500">
                                                                                        Qeyd:{" "}
                                                                                        {
                                                                                            item.note
                                                                                        }
                                                                                    </p>
                                                                                )}
                                                                            </div>

                                                                            <p className="shrink-0 font-black text-neutral-950">
                                                                                {formatMoney(
                                                                                    item.lineTotal,
                                                                                )}
                                                                            </p>
                                                                        </div>

                                                                        <div className="mt-4 flex items-center justify-between gap-3">
                                                                            <span
                                                                                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${status.className}`}
                                                                            >
                                                                                {
                                                                                    status.icon
                                                                                }

                                                                                {
                                                                                    status.label
                                                                                }
                                                                            </span>

                                                                            {item.canCancel &&
                                                                                activeSession?.status ===
                                                                                "OPEN" && (
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() =>
                                                                                            void cancelItem(
                                                                                                item.id,
                                                                                                item.name,
                                                                                            )
                                                                                        }
                                                                                        disabled={
                                                                                            cancellingItemId !==
                                                                                            null
                                                                                        }
                                                                                        className="inline-flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                                                                                    >
                                                                                        {isCancelling ? (
                                                                                            <>
                                                                                                <Loader2
                                                                                                    size={
                                                                                                        14
                                                                                                    }
                                                                                                    className="animate-spin"
                                                                                                />

                                                                                                Ləğv
                                                                                                edilir
                                                                                            </>
                                                                                        ) : (
                                                                                            <>
                                                                                                <Ban
                                                                                                    size={
                                                                                                        14
                                                                                                    }
                                                                                                />

                                                                                                Ləğv
                                                                                                et
                                                                                            </>
                                                                                        )}
                                                                                    </button>
                                                                                )}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            },
                                                        )}
                                                    </div>
                                                </article>
                                            );
                                        },
                                    )}
                                </div>
                            )}

                            {cancelledItems.length >
                                0 && (
                                    <details className="mt-5 overflow-hidden rounded-3xl border border-neutral-200 bg-neutral-50">
                                        <summary className="cursor-pointer px-5 py-4 text-sm font-bold text-neutral-600">
                                            Ləğv edilmiş
                                            məhsullar (
                                            {
                                                cancelledItems.length
                                            }
                                            )
                                        </summary>

                                        <div className="border-t border-neutral-200 px-5">
                                            {cancelledItems.map(
                                                (item) => (
                                                    <div
                                                        key={
                                                            item.id
                                                        }
                                                        className="flex items-center justify-between border-b border-neutral-200 py-4 last:border-0"
                                                    >
                                                        <div>
                                                            <p className="font-bold text-neutral-500 line-through">
                                                                {
                                                                    item.quantity
                                                                }
                                                                ×{" "}
                                                                {
                                                                    item.name
                                                                }
                                                            </p>

                                                            <p className="mt-1 text-xs text-red-500">
                                                                Ləğv
                                                                edilib
                                                            </p>
                                                        </div>

                                                        <p className="text-sm font-bold text-neutral-400 line-through">
                                                            {formatMoney(
                                                                item.lineTotal,
                                                            )}
                                                        </p>
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    </details>
                                )}

                            {error && (
                                <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                                    <AlertCircle
                                        size={19}
                                        className="mt-0.5 shrink-0 text-amber-600"
                                    />

                                    <p className="text-sm leading-6 text-amber-700">
                                        Son yeniləmə zamanı
                                        xəta baş verdi:{" "}
                                        {error}
                                    </p>
                                </div>
                            )}

                            {address && (
                                <div className="mt-5 flex items-start gap-3 rounded-2xl bg-neutral-50 p-4">
                                    <Store
                                        size={19}
                                        className="mt-0.5 shrink-0 text-neutral-400"
                                    />

                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-neutral-400">
                                            Restoran
                                        </p>

                                        <p className="mt-1 text-sm font-bold text-neutral-800">
                                            {
                                                restaurantName
                                            }
                                        </p>

                                        <p className="mt-1 text-sm leading-5 text-neutral-500">
                                            {address}
                                        </p>
                                    </div>
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedPaymentMethod(null);
                                    setPaymentModalOpen(true);
                                }}
                                disabled={
                                    loading ||
                                    cancellingItemId !== null ||
                                    requestingBill ||
                                    !canRequestBill ||
                                    sessionData.session?.status !==
                                    "OPEN"
                                }

                                className="mt-6 w-full rounded-2xl bg-emerald-600 py-4 text-lg font-bold text-white transition hover:bg-emerald-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-500"
                            >
                                {!canRequestBill &&
                                    sessionData.session?.status ===
                                    "OPEN" && (
                                        <p className="mt-3 text-center text-sm text-neutral-500">
                                            Hesabı yalnız bütün
                                            sifarişlər təqdim
                                            edildikdən sonra
                                            istəyə bilərsiniz.
                                        </p>
                                    )}
                                {sessionData.session?.status ===
                                    "BILL_REQUESTED"
                                    ? "Hesab istənilib"
                                    : sessionData.session?.status ===
                                        "BILL_READY"
                                        ? "Hesab hazırdır"
                                        : sessionData.session?.status ===
                                            "BILL_DELIVERED"
                                            ? "Hesab təqdim edilib"
                                            : "Hesabı istə"}
                            </button>

                            <button
                                type="button"
                                onClick={onClose}
                                className="mt-3 w-full rounded-2xl bg-neutral-950 py-4 font-bold text-white transition hover:bg-neutral-800 active:scale-[0.99]"
                            >
                                Menyuya qayıt
                            </button>
                        </>
                    )}
                </div>
            </section>
            {paymentModalOpen && (
                <>
                    <button
                        type="button"
                        aria-label="Ödəniş pəncərəsini bağla"
                        onClick={() => {
                            if (requestingBill) {
                                return;
                            }

                            setPaymentModalOpen(false);
                            setSelectedPaymentMethod(null);
                        }}
                        className="fixed inset-0 z-[70] bg-black/55 backdrop-blur-sm"
                    />

                    <div className="fixed inset-x-0 bottom-0 z-[71] mx-auto w-full max-w-lg rounded-t-[34px] bg-white px-5 pb-[max(28px,env(safe-area-inset-bottom))] pt-3 shadow-2xl">
                        <div className="flex justify-center">
                            <div className="h-1.5 w-12 rounded-full bg-neutral-200" />
                        </div>

                        <div className="mt-5 flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-400">
                                    Hesabın ödənişi
                                </p>

                                <h3 className="mt-1 text-2xl font-black text-neutral-950">
                                    Ödəniş üsulunu seçin
                                </h3>

                                <p className="mt-2 text-sm leading-6 text-neutral-500">
                                    Restoran əməkdaşları hesabı seçdiyiniz
                                    ödəniş üsuluna uyğun hazırlayacaq.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    if (requestingBill) {
                                        return;
                                    }

                                    setPaymentModalOpen(false);
                                    setSelectedPaymentMethod(null);
                                }}
                                disabled={requestingBill}
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-700 transition hover:bg-neutral-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                                aria-label="Bağla"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="mt-6 grid grid-cols-3 gap-3">
                            <button
                                type="button"
                                onClick={() =>
                                    setSelectedPaymentMethod(
                                        "CASH",
                                    )
                                }
                                disabled={requestingBill}
                                className={`rounded-2xl border p-4 text-left transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${selectedPaymentMethod ===
                                    "CASH"
                                    ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-600/15"
                                    : "border-neutral-200 bg-white hover:border-neutral-300"
                                    }`}
                            >
                                <div
                                    className={`flex h-11 w-11 items-center justify-center rounded-2xl text-xl ${selectedPaymentMethod ===
                                        "CASH"
                                        ? "bg-emerald-600 text-white"
                                        : "bg-neutral-100 text-neutral-700"
                                        }`}
                                >
                                    ₼
                                </div>

                                <p className="mt-4 font-black text-neutral-950">
                                    Nağd
                                </p>

                                <p className="mt-1 text-xs text-neutral-400">
                                    Kassada nağd
                                </p>
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    setSelectedPaymentMethod(
                                        "CARD",
                                    )
                                }
                                disabled={requestingBill}
                                className={`rounded-2xl border p-4 text-left transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${selectedPaymentMethod ===
                                    "CARD"
                                    ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-600/15"
                                    : "border-neutral-200 bg-white hover:border-neutral-300"
                                    }`}
                            >
                                <div
                                    className={`flex h-11 w-11 items-center justify-center rounded-2xl ${selectedPaymentMethod ===
                                        "CARD"
                                        ? "bg-emerald-600 text-white"
                                        : "bg-neutral-100 text-neutral-700"
                                        }`}
                                >
                                    <WalletCards size={21} />
                                </div>

                                <p className="mt-4 font-black text-neutral-950">
                                    Kart
                                </p>

                                <p className="mt-1 text-xs text-neutral-400">
                                    POS terminal
                                </p>
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    setSelectedPaymentMethod(
                                        "OTHER",
                                    )
                                }
                                disabled={requestingBill}
                                className={`rounded-2xl border p-4 text-left transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${selectedPaymentMethod ===
                                    "OTHER"
                                    ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-600/15"
                                    : "border-neutral-200 bg-white hover:border-neutral-300"
                                    }`}
                            >
                                <div
                                    className={`flex h-11 w-11 items-center justify-center rounded-2xl ${selectedPaymentMethod ===
                                        "OTHER"
                                        ? "bg-emerald-600 text-white"
                                        : "bg-neutral-100 text-neutral-700"
                                        }`}
                                >
                                    <ReceiptText size={21} />
                                </div>

                                <p className="mt-4 font-black text-neutral-950">
                                    Digər
                                </p>

                                <p className="mt-1 text-xs text-neutral-400">
                                    Digər üsul
                                </p>
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                void requestBill()
                            }
                            disabled={
                                !selectedPaymentMethod ||
                                requestingBill
                            }
                            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4 text-lg font-bold text-white transition hover:bg-emerald-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-500"
                        >
                            {requestingBill ? (
                                <>
                                    <Loader2
                                        size={20}
                                        className="animate-spin"
                                    />

                                    Göndərilir
                                </>
                            ) : (
                                "Hesabı təsdiqlə"
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setPaymentModalOpen(false);
                                setSelectedPaymentMethod(null);
                            }}
                            disabled={requestingBill}
                            className="mt-3 w-full rounded-2xl bg-neutral-100 py-4 font-bold text-neutral-700 transition hover:bg-neutral-200 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Ləğv et
                        </button>
                    </div>
                </>
            )}
        </>
    );
}