"use client";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";

type Props = {
  href?: string;
  icon?: string;
  size?: number;
  className?: string;
  label?: string;
};

export default function BackButton({
  href,
  icon = "ion:arrow-back-circle-outline",
  size = 36,
  className = "",
  label = "Back",
}: Props) {
  const router = useRouter();
  const handleClick = () => {
    if (href) router.push(href);
    else router.back();
  };
  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      className={`inline-flex items-center group focus:outline-none ${className}`}
    >
      <Icon
        icon={icon}
        width={size}
        height={size}
        className="text-white drop-shadow-sm transition-transform group-hover:scale-105 group-active:scale-95"
      />
    </button>
  );
}