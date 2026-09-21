import type { SVGProps, ReactNode } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({
  size = 16,
  children,
  className = "",
  ...rest
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      aria-hidden
      {...rest}
    >
      {children}
    </svg>
  );
}

/** Stack / database mark — Supabase section */
export function IconStack(props: IconProps) {
  return (
    <Icon {...props}>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
      <path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
    </Icon>
  );
}

/** Branch mark — Git section */
export function IconBranch(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="6" cy="5" r="2.25" />
      <circle cx="18" cy="5" r="2.25" />
      <circle cx="12" cy="19" r="2.25" />
      <path d="M6 7.25v4.5c0 1.5 1.5 2.75 3.5 2.75H12" />
      <path d="M18 7.25v2.5c0 1.5-1.5 2.75-3.5 2.75H12v4" />
    </Icon>
  );
}

/** Play / process mark — Dev Server */
export function IconPlay(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3.5" y="4" width="17" height="16" rx="2.5" />
      <path d="M10 9.5v5l5-2.5-5-2.5z" fill="currentColor" stroke="none" />
    </Icon>
  );
}

/** External launch mark */
export function IconLaunch(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M14 4h6v6" />
      <path d="M10 14 20 4" />
      <path d="M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5" />
    </Icon>
  );
}

/** Wrench / helpers mark — Toolbox */
export function IconWrench(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M14.7 6.3a4.5 4.5 0 0 0-6.1 5.2L4 16.1V20h3.9l4.6-4.6a4.5 4.5 0 0 0 5.2-6.1l-2.5 2.5-2.5-2.5 2-2z" />
    </Icon>
  );
}

/** Request / terminal mark — cURL */
export function IconRequest(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 7h16" />
      <path d="M4 12h10" />
      <path d="M4 17h7" />
      <path d="M16 14.5 20 12l-4-2.5V14.5z" fill="currentColor" stroke="none" />
    </Icon>
  );
}

/** Folder mark — project picker */
export function IconFolder(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.5 8.5A1.5 1.5 0 0 1 5 7h4.2l1.6 1.8H19a1.5 1.5 0 0 1 1.5 1.5V18A1.5 1.5 0 0 1 19 19.5H5A1.5 1.5 0 0 1 3.5 18V8.5z" />
    </Icon>
  );
}

/** Brand mark — concentric target (matches desktop icon). Lime is hardcoded so it never inherits wrong. */
export function LogoMark({ size = 22, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={`shrink-0 ${className}`}
      aria-hidden
    >
      <rect width="32" height="32" rx="8" fill="#b9de07" />
      <circle cx="16" cy="16" r="9" fill="none" stroke="#0b0b0b" strokeWidth="3.2" />
      <circle cx="16" cy="16" r="3.6" fill="#0b0b0b" />
    </svg>
  );
}
