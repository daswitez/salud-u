import Link from "next/link";

type Action = {
  href: string;
  label: string;
};

type Tone = "primary" | "warning" | "success" | "neutral";

const toneStyles: Record<Tone, { border: string; surface: string; text: string; marker: string }> = {
  primary: {
    border: "border-primary-200",
    surface: "bg-primary-container",
    text: "text-primary",
    marker: "bg-primary",
  },
  warning: {
    border: "border-warning/25",
    surface: "bg-warning-container",
    text: "text-warning",
    marker: "bg-warning",
  },
  success: {
    border: "border-success/25",
    surface: "bg-success-container",
    text: "text-success",
    marker: "bg-success",
  },
  neutral: {
    border: "border-divider",
    surface: "bg-surface-secondary",
    text: "text-text-secondary",
    marker: "bg-text-tertiary",
  },
};

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="size-4">
      <path d="M4 10h12m-4-4 4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PageIntro({
  eyebrow,
  title,
  description,
  primaryAction,
  secondaryAction,
  context,
}: {
  eyebrow: string;
  title: string;
  description: string;
  primaryAction?: Action;
  secondaryAction?: Action;
  context?: { label: string; value: string };
}) {
  return (
    <header className="relative overflow-hidden rounded-[1.75rem] border border-primary-200 bg-surface px-5 py-6 shadow-[0_18px_55px_-42px_rgba(18,49,111,0.75)] sm:px-7 sm:py-8">
      <div aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5 bg-[linear-gradient(180deg,var(--color-secondary),var(--color-brand-gold))]" />
      <div aria-hidden="true" className="absolute -right-16 -top-24 size-64 rounded-full border-[38px] border-primary-container/80" />
      <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">{eyebrow}</p>
          <h1 className="mt-3 max-w-2xl text-3xl font-bold tracking-[-0.035em] text-text-primary sm:text-4xl">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary sm:text-base sm:leading-7">{description}</p>
          {(primaryAction || secondaryAction) && (
            <div className="mt-6 flex flex-wrap gap-3">
              {primaryAction && (
                <Link href={primaryAction.href} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-on-primary shadow-sm transition hover:-translate-y-0.5 hover:bg-primary-hover">
                  {primaryAction.label}
                  <ArrowIcon />
                </Link>
              )}
              {secondaryAction && (
                <Link href={secondaryAction.href} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-primary-200 bg-surface px-4 py-2.5 text-sm font-bold text-primary transition hover:border-primary hover:bg-primary-container">
                  {secondaryAction.label}
                </Link>
              )}
            </div>
          )}
        </div>
        {context && (
          <div className="relative min-w-48 rounded-2xl border border-divider bg-background/85 p-4 backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">{context.label}</p>
            <p className="mt-1 text-sm font-bold text-text-primary">{context.value}</p>
          </div>
        )}
      </div>
    </header>
  );
}

export function GuidanceCard({
  eyebrow = "Siguiente paso",
  title,
  description,
  action,
  steps,
  activeStep = 0,
  tone = "primary",
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action: Action;
  steps: string[];
  activeStep?: number;
  tone?: Tone;
}) {
  const styles = toneStyles[tone];
  return (
    <section aria-label={eyebrow} className={`grid gap-5 rounded-2xl border p-5 sm:p-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(22rem,1.15fr)] lg:items-center ${styles.border} ${styles.surface}`}>
      <div>
        <p className={`text-xs font-bold uppercase tracking-[0.16em] ${styles.text}`}>{eyebrow}</p>
        <h2 className="mt-2 text-xl font-bold tracking-tight text-text-primary">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-text-secondary">{description}</p>
        <Link href={action.href} className={`mt-4 inline-flex items-center gap-2 text-sm font-bold ${styles.text} hover:underline`}>
          {action.label}
          <ArrowIcon />
        </Link>
      </div>
      <ol className="grid gap-2 sm:grid-cols-3" aria-label="Ruta sugerida">
        {steps.map((step, index) => {
          const isCurrent = index === activeStep;
          const isComplete = index < activeStep;
          return (
            <li key={step} className={`rounded-xl border p-3 ${isCurrent ? `${styles.border} bg-surface shadow-sm` : "border-transparent bg-surface/55"}`}>
              <div className="flex items-center gap-2">
                <span className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold ${isCurrent || isComplete ? `${styles.marker} text-white` : "bg-divider text-text-secondary"}`}>
                  {isComplete ? "✓" : index + 1}
                </span>
                <span className={`text-xs font-semibold ${isCurrent ? "text-text-primary" : "text-text-secondary"}`}>{step}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function SectionHeading({ title, description, action }: { title: string; description?: string; action?: Action }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-text-primary">{title}</h2>
        {description && <p className="mt-1 text-sm leading-6 text-text-secondary">{description}</p>}
      </div>
      {action && <Link href={action.href} className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline">{action.label}<ArrowIcon /></Link>}
    </div>
  );
}

export function MetricCard({ label, value, detail, tone = "neutral" }: { label: string; value: React.ReactNode; detail: string; tone?: Tone }) {
  const styles = toneStyles[tone];
  return (
    <article className="relative overflow-hidden rounded-2xl border border-divider bg-surface p-5 shadow-[0_14px_38px_-34px_rgba(18,49,111,0.7)]">
      <span aria-hidden="true" className={`absolute inset-y-5 left-0 w-1 rounded-r-full ${styles.marker}`} />
      <p className="text-sm font-semibold text-text-secondary">{label}</p>
      <p className="mt-2 text-3xl font-black tracking-[-0.04em] text-text-primary">{value}</p>
      <p className={`mt-2 text-xs font-semibold ${styles.text}`}>{detail}</p>
    </article>
  );
}
