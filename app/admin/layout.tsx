"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import {
    isSuperAdmin,
    isRestaurantAdmin,
    isWaiter,
} from "@/utils/permissions";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const [checking, setChecking] = useState(true);

    const isLoginPage = pathname === "/admin/login";

    useEffect(() => {
        async function checkAuth() {
            if (isLoginPage) {
                setChecking(false);
                return;
            }

            const {
                data: { session },
            } = await supabase.auth.getSession();

            if (!session) {
                router.replace("/admin/login");
                return;
            }

            setChecking(false);
        }

        checkAuth();
    }, [isLoginPage, router]);

    if (isLoginPage) {
        return <>{children}</>;
    }

    if (checking) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                Yüklənir...
            </div>
        );
    }

    return (
        <AuthProvider>
            <AdminShell>{children}</AdminShell>
        </AuthProvider>
    );
}

function AdminShell({ children }: { children: React.ReactNode }) {
    const { profile, loading } = useAuth();
    const pathname = usePathname();
    const router = useRouter();

    const superAdmin = isSuperAdmin(profile);
    const restaurantAdmin = isRestaurantAdmin(profile);
    const waiter = isWaiter(profile);

    const links = [
        {
            href: "/admin/dashboard",
            label: "Dashboard",
            show: superAdmin || restaurantAdmin,
        },
        {
            href: "/admin/restaurants",
            label: "Restoranlar",
            show: superAdmin,
        },
        {
            href: "/admin/users",
            label: "İstifadəçilər",
            show: superAdmin || restaurantAdmin,
        },
        {
            href: "/admin/halls",
            label: "Zallar",
            show: restaurantAdmin,
        },
        {
            href: "/admin/tables",
            label: "Masalar",
            show: restaurantAdmin,
        },
        {
            href: "/admin/service-requests",
            label: "Service Requests",
            show: superAdmin || restaurantAdmin || waiter,
        },
        {
            href: "/admin/request-logs",
            label: "Request Logs",
            show: superAdmin || restaurantAdmin,
        },
    ];

    useEffect(() => {
        if (loading) return;

        if (!profile) {
            router.replace("/admin/login");
            return;
        }

        const currentLink = links.find((link) => pathname.startsWith(link.href));

        if (currentLink && !currentLink.show) {
            if (waiter) {
                router.replace("/admin/service-requests");
            } else {
                router.replace("/admin/dashboard");
            }
        }
    }, [loading, profile, pathname, waiter]);

    async function logout() {
        await supabase.auth.signOut();
        router.replace("/admin/login");
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                Yüklənir...
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 flex">
            <aside className="w-64 bg-black text-white p-6 flex flex-col">
                <h2 className="text-xl font-bold mb-8">Wedding Hall</h2>

                <nav className="space-y-3 flex-1">
                    {links
                        .filter((link) => link.show)
                        .map((link) => (
                            <Link
                                key={link.href}
                                className={`block rounded-lg px-3 py-2 ${pathname === link.href
                                        ? "bg-white text-black"
                                        : "hover:bg-white/10"
                                    }`}
                                href={link.href}
                            >
                                {link.label}
                            </Link>
                        ))}
                </nav>

                <button
                    onClick={logout}
                    className="mt-8 bg-white text-black py-2 rounded-lg font-semibold"
                >
                    Çıxış
                </button>
            </aside>

            <main className="flex-1">{children}</main>
        </div>
    );
}