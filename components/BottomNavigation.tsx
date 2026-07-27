"use client";

export type BottomNavigationItem = "menu" | "cart" | "account";

interface Props {
  activeItem: BottomNavigationItem;
  cartCount: number;
  onMenuClick: () => void;
  onCartClick: () => void;
  onAccountClick: () => void;
}

interface NavigationButtonProps {
  label: string;
  active: boolean;
  badge?: number;
  onClick: () => void;
  icon: React.ReactNode;
}

function NavigationButton({
  label,
  active,
  badge = 0,
  onClick,
  icon,
}: NavigationButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1.5 py-2"
    >
      <div
        className={[
          "relative flex h-10 w-14 items-center justify-center rounded-2xl transition-all duration-300",
          active
            ? "bg-neutral-950 text-white shadow-lg shadow-black/20"
            : "text-neutral-400 group-hover:bg-neutral-100 group-hover:text-neutral-900",
        ].join(" ")}
      >
        {icon}

        {badge > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[10px] font-black leading-none text-white">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </div>

      <span
        className={[
          "truncate text-[11px] font-bold transition-colors duration-300",
          active ? "text-neutral-950" : "text-neutral-400",
        ].join(" ")}
      >
        {label}
      </span>
    </button>
  );
}

export default function BottomNavigation({
  activeItem,
  cartCount,
  onMenuClick,
  onCartClick,
  onAccountClick,
}: Props) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(12px,env(safe-area-inset-bottom))]">
      <nav className="pointer-events-auto mx-auto flex max-w-lg items-center rounded-[28px] border border-white/70 bg-white/90 px-3 py-2 shadow-[0_18px_50px_rgba(0,0,0,0.16)] backdrop-blur-2xl">
        <NavigationButton
          label="Menyu"
          active={activeItem === "menu"}
          onClick={onMenuClick}
          icon={
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path
                d="M4 6.5h16M4 12h16M4 17.5h10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          }
        />

        <NavigationButton
          label="Səbət"
          active={activeItem === "cart"}
          badge={cartCount}
          onClick={onCartClick}
          icon={
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path
                d="M3.5 5h2l1.7 9.1a2 2 0 0 0 2 1.7h7.9a2 2 0 0 0 2-1.6L20.5 8H7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="9.5" cy="19" r="1.2" fill="currentColor" />
              <circle cx="17.5" cy="19" r="1.2" fill="currentColor" />
            </svg>
          }
        />

        <NavigationButton
          label="Hesab"
          active={activeItem === "account"}
          onClick={onAccountClick}
          icon={
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <circle
                cx="12"
                cy="8"
                r="3.5"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M5.5 20c.7-3.5 3-5.5 6.5-5.5s5.8 2 6.5 5.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          }
        />
      </nav>
    </div>
  );
}