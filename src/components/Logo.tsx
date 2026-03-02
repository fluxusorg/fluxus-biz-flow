import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "default" | "white" | "primary";
  showText?: boolean;
}

const Logo = ({ className, size = "md", variant = "default", showText = true }: LogoProps) => {
  const iconSizes = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-14 w-14",
    xl: "h-20 w-20",
  };

  const textSizes = {
    sm: "text-2xl",
    md: "text-3xl",
    lg: "text-4xl",
    xl: "text-5xl",
  };

  const textColorClasses = {
    default: "text-foreground",
    white: "text-white",
    primary: "text-primary",
  };

  const isWhite = variant === "white";
  const iconClass = isWhite ? "text-white" : "";
  const color1 = isWhite ? "currentColor" : "#10B981"; // Emerald-500
  const color2 = isWhite ? "currentColor" : "#3B82F6"; // Blue-500

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("shrink-0 transition-all", iconSizes[size], iconClass)}
      >
        <path
          d="M20 50L50 20L80 50H60V80H40V50H20Z"
          fill={color1}
          className="opacity-0 hidden"
        />
        {/* Dynamic Arrows Inspired by Fluxus (Flow) */}
        <path
          d="M10 45C10 35 15 25 30 25H60L50 15L85 30L50 45L60 35H30C25 35 22 38 22 45H10Z"
          fill={color1}
        />
        <path
          d="M90 55C90 65 85 75 70 75H40L50 85L15 70L50 55L40 65H70C75 65 78 62 78 55H90Z"
          fill={color2}
        />
      </svg>
      {showText && (
        <span
          className={cn(
            "font-bold font-display tracking-tight leading-none",
            textSizes[size],
            textColorClasses[variant]
          )}
        >
          Fluxus
        </span>
      )}
    </div>
  );
};

export default Logo;
