import type { SVGProps } from "react";
import {
  DatabaseZap,
  GitGraph,
  SquareTerminal,
  ArrowUpRight,
  SlidersHorizontal,
  TerminalSquare,
  SquarePen,
  Webhook,
  FolderCode,
  type LucideProps,
} from "lucide-react";

export type IconProps = SVGProps<SVGSVGElement> & {
  size?: number | string;
};

// Common Lucide config to maintain consistent styling across the application
const ICON_DEFAULTS: LucideProps = {
  strokeWidth: 1.75,
};

/** Stack / database mark — Supabase section */
export function IconStack({ size = 16, className = "", ...props }: IconProps) {
  return (
    <DatabaseZap
      size={size}
      className={`shrink-0 ${className}`}
      {...ICON_DEFAULTS}
      {...props}
    />
  );
}

/** Branch mark — Git section */
export function IconBranch({ size = 16, className = "", ...props }: IconProps) {
  return (
    <GitGraph
      size={size}
      className={`shrink-0 ${className}`}
      {...ICON_DEFAULTS}
      {...props}
    />
  );
}

/** Play / process mark — Dev Server */
export function IconPlay({ size = 16, className = "", ...props }: IconProps) {
  return (
    <SquareTerminal
      size={size}
      className={`shrink-0 ${className}`}
      {...ICON_DEFAULTS}
      {...props}
    />
  );
}

/** External launch mark */
export function IconLaunch({ size = 16, className = "", ...props }: IconProps) {
  return (
    <ArrowUpRight
      size={size}
      className={`shrink-0 ${className}`}
      {...ICON_DEFAULTS}
      {...props}
    />
  );
}

/** Wrench / helpers mark — Toolbox */
export function IconWrench({ size = 16, className = "", ...props }: IconProps) {
  return (
    <SlidersHorizontal
      size={size}
      className={`shrink-0 ${className}`}
      {...ICON_DEFAULTS}
      {...props}
    />
  );
}

/** Bolt / runner mark — Custom commands */
export function IconBolt({ size = 16, className = "", ...props }: IconProps) {
  return (
    <TerminalSquare
      size={size}
      className={`shrink-0 ${className}`}
      {...ICON_DEFAULTS}
      {...props}
    />
  );
}

/** Pencil / edit mark */
export function IconPencil({ size = 16, className = "", ...props }: IconProps) {
  return (
    <SquarePen
      size={size}
      className={`shrink-0 ${className}`}
      {...ICON_DEFAULTS}
      {...props}
    />
  );
}

/** Request / HTTP mark — cURL panel */
export function IconRequest({ size = 16, className = "", ...props }: IconProps) {
  return (
    <Webhook
      size={size}
      className={`shrink-0 ${className}`}
      {...ICON_DEFAULTS}
      {...props}
    />
  );
}

/** Folder mark — Project workspace */
export function IconFolder({ size = 16, className = "", ...props }: IconProps) {
  return (
    <FolderCode
      size={size}
      className={`shrink-0 ${className}`}
      {...ICON_DEFAULTS}
      {...props}
    />
  );
}

/** Brand mark — Target logo mark (hardcoded brand colors) */
export function LogoMark({
  size = 22,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={`shrink-0 ${className}`}
      aria-hidden
    >
      <rect width="32" height="32" rx="8" fill="#b9de07" />
      <circle
        cx="16"
        cy="16"
        r="9"
        fill="none"
        stroke="#0b0b0b"
        strokeWidth="3.2"
      />
      <circle cx="16" cy="16" r="3.6" fill="#0b0b0b" />
    </svg>
  );
}