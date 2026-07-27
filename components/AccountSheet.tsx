"use client";

import {
  X,
  Store,
  Armchair,
  MapPin,
  Clock3,
  Info,
} from "lucide-react";

interface Props {
  open: boolean;
  restaurantName: string;
  tableName: string;
  hallName?: string | null;
  address?: string | null;
  onClose: () => void;
}

interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-neutral-50 p-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-neutral-900 shadow-sm">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
          {label}
        </p>

        <p className="mt-1 truncate font-bold text-neutral-900">
          {value}
        </p>
      </div>
    </div>
  );
}

export default function AccountSheet({
  open,
  restaurantName,
  tableName,
  hallName,
  address,
  onClose,
}: Props) {
  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Hesab pəncərəsini bağla"
        onClick={onClose}
        className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
      />

      <section className="fixed inset-x-0 bottom-0 z-[61] mx-auto max-h-[88vh] w-full max-w-lg overflow-hidden rounded-t-[34px] bg-white shadow-2xl">
        <div className="flex justify-center pt-3">
          <div className="h-1.5 w-12 rounded-full bg-neutral-200" />
        </div>

        <div className="flex items-center justify-between border-b border-neutral-100 px-6 pb-5 pt-4">
          <div>
            <p className="text-sm font-semibold text-neutral-400">
              Masa məlumatları
            </p>

            <h2 className="mt-1 text-2xl font-black text-neutral-950">
              Hesab
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-700 transition hover:bg-neutral-200 active:scale-95"
            aria-label="Bağla"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[calc(88vh-96px)] overflow-y-auto px-6 pb-[max(28px,env(safe-area-inset-bottom))] pt-6">
          <div className="relative overflow-hidden rounded-[30px] bg-neutral-950 p-6 text-white">
            <div className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-16 -left-8 h-40 w-40 rounded-full bg-white/5 blur-3xl" />

            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
                <Store size={23} />
              </div>

              <p className="mt-7 text-sm font-medium text-white/55">
                Xoş gəlmisiniz
              </p>

              <h3 className="mt-1 text-2xl font-black leading-tight">
                {restaurantName}
              </h3>

              <div className="mt-6 flex items-center gap-2 text-sm text-white/70">
                <Clock3 size={16} />

                <span>
                  Sifarişiniz bu masa üçün hazırlanacaq
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <InfoRow
              icon={<Armchair size={20} />}
              label="Masa"
              value={tableName}
            />

            {hallName && (
              <InfoRow
                icon={<Store size={20} />}
                label="Zal"
                value={hallName}
              />
            )}

            {address && (
              <InfoRow
                icon={<MapPin size={20} />}
                label="Ünvan"
                value={address}
              />
            )}
          </div>

          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-neutral-200 p-4">
            <Info
              size={19}
              className="mt-0.5 shrink-0 text-neutral-400"
            />

            <p className="text-sm leading-6 text-neutral-500">
              Sifariş göndərildikdən sonra restoran əməkdaşları onu qəbul
              edib hazırlamağa başlayacaqlar.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mt-6 w-full rounded-2xl bg-neutral-950 py-4 font-bold text-white transition hover:bg-neutral-800 active:scale-[0.99]"
          >
            Menyuya qayıt
          </button>
        </div>
      </section>
    </>
  );
}