interface CardProps {
  title: string;
  value: string;
  subtext?: string;
  icon: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

export function Card({ title, value, subtext, icon, className, children }: CardProps) {
  return (
    <div className={`card ${className || ""}`}>
      <div className="card-header">
        <div className="card-title">
          {icon}
          <span>{title}</span>
        </div>
      </div>
      <div className="card-value">{value}</div>
      {subtext && <div className="card-subtext">{subtext}</div>}
      {children}
    </div>
  );
}
