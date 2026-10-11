import Image from "next/image";

import { signIn } from "@/app/actions/session";
import { CopyDemoPassword } from "@/components/copy-demo-password";

type SignInPageProps = { searchParams: Promise<{ error?: string; success?: string; email?: string }> };

const experiencePoints = [
  { number: "01", title: "Ubica la tarea", detail: "Cada rol ve primero lo que necesita resolver." },
  { number: "02", title: "Sigue la ruta", detail: "Los siguientes pasos aparecen dentro de cada pantalla." },
  { number: "03", title: "Mantén el contexto", detail: "Estados y permisos se explican sin interrumpir tu trabajo." },
];

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const errorMessage = params.error === "credentials" ? "El correo o la contraseña son incorrectos." : params.error === "unauthorized" ? "Tu cuenta no tiene un rol activo en la plataforma." : params.error === "session" ? "Tu sesión venció. Vuelve a iniciar sesión." : undefined;

  return (
    <main className="min-h-screen bg-background lg:grid lg:grid-cols-[minmax(30rem,1.05fr)_minmax(30rem,0.95fr)]">
      <section className="relative hidden min-h-screen overflow-hidden bg-primary px-12 py-10 text-on-primary lg:flex lg:flex-col lg:justify-between xl:px-16 xl:py-12">
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(255,255,255,0.14),transparent_28rem),linear-gradient(145deg,transparent_45%,rgba(11,32,80,0.72))]" />
        <div aria-hidden="true" className="absolute -bottom-40 -right-32 size-[34rem] rounded-full border-[5rem] border-white/[0.06]" />
        <div className="relative z-10 flex items-center gap-3">
          <span className="flex items-center -space-x-2" aria-hidden="true"><Image src="/branding/fcsh-uagrm-emblem.png" alt="" width={96} height={96} className="size-12 rounded-full bg-white object-contain p-0.5 ring-1 ring-white/30" /><Image src="/branding/centro-especialidades-emblem.png" alt="" width={96} height={96} className="size-12 rounded-full bg-white object-contain p-0.5 ring-1 ring-white/30" /></span>
          <span><span className="block font-bold tracking-tight">Salud Universitaria</span><span className="mt-0.5 block text-sm text-white/70">Atención médica estudiantil</span></span>
        </div>

        <div className="relative z-10 max-w-2xl py-12">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand-gold">Tu atención, con una ruta clara</p>
          <h1 className="mt-5 max-w-xl text-5xl font-bold leading-[1.08] tracking-[-0.045em] xl:text-6xl">Menos pasos perdidos. Más tiempo para atender.</h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-white/76">La plataforma reúne admisión, agenda e historia clínica en un flujo que explica qué ocurre y qué debes hacer después.</p>
          <ol className="mt-10 grid gap-3 xl:grid-cols-3">
            {experiencePoints.map((point) => (
              <li key={point.number} className="rounded-2xl border border-white/12 bg-white/[0.07] p-4 backdrop-blur-sm">
                <span className="text-xs font-black text-brand-gold">{point.number}</span>
                <p className="mt-2 text-sm font-bold">{point.title}</p>
                <p className="mt-1 text-xs leading-5 text-white/65">{point.detail}</p>
              </li>
            ))}
          </ol>
        </div>

        <p className="relative z-10 text-xs text-white/55">Universidad pública · Servicio de salud estudiantil</p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-8 sm:px-8 lg:py-12">
        <div className="w-full max-w-md">
          <div className="mb-9 flex items-center gap-3 lg:hidden">
            <span className="flex items-center -space-x-2" aria-hidden="true"><Image src="/branding/fcsh-uagrm-emblem.png" alt="" width={80} height={80} className="size-10 rounded-full bg-white object-contain ring-1 ring-secondary-container" /><Image src="/branding/centro-especialidades-emblem.png" alt="" width={80} height={80} className="size-10 rounded-full bg-white object-contain ring-1 ring-primary-200" /></span>
            <span><span className="block font-bold tracking-tight text-text-primary">Salud Universitaria</span><span className="block text-xs text-text-tertiary">Atención médica estudiantil</span></span>
          </div>

          <div className="rounded-[1.75rem] border border-divider bg-surface p-5 shadow-[0_24px_70px_-50px_rgba(18,49,111,0.85)] sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">Acceso institucional</p>
            <h2 className="mt-3 text-3xl font-bold tracking-[-0.035em] text-text-primary">Continúa donde lo dejaste</h2>
            <p className="mt-2 text-sm leading-6 text-text-secondary">Usa tus credenciales para entrar a tu espacio de trabajo.</p>

            {errorMessage && <p role="alert" className="mt-6 rounded-xl border border-error/20 bg-error-container px-4 py-3 text-sm font-semibold text-error">{errorMessage}</p>}
            {params.success === "logout" && <p role="status" className="mt-6 rounded-xl border border-success/20 bg-success-container px-4 py-3 text-sm font-semibold text-success">Cerraste sesión correctamente.</p>}

            <form action={signIn} className="mt-7 space-y-5">
              <label className="block text-sm font-bold text-text-secondary">
                Correo electrónico
                <input required name="email" type="email" autoComplete="username" defaultValue={params.email} placeholder="nombre@correo.com" className="mt-2 min-h-12 w-full rounded-xl border border-border bg-surface px-3.5 py-3 text-text-primary outline-none transition placeholder:text-text-tertiary focus:border-primary focus:ring-2 focus:ring-primary-100" />
              </label>
              <label className="block text-sm font-bold text-text-secondary">
                Contraseña
                <input required name="password" type="password" autoComplete="current-password" minLength={8} placeholder="Ingresa tu contraseña" className="mt-2 min-h-12 w-full rounded-xl border border-border bg-surface px-3.5 py-3 text-text-primary outline-none transition placeholder:text-text-tertiary focus:border-primary focus:ring-2 focus:ring-primary-100" />
              </label>
              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm text-text-secondary"><input name="remember" type="checkbox" className="size-4 rounded accent-primary" />Recordarme</label>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-success"><span className="size-1.5 rounded-full bg-success" />Acceso protegido</span>
              </div>
              <button type="submit" className="min-h-12 w-full rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-on-primary shadow-sm transition hover:-translate-y-0.5 hover:bg-primary-hover">Ingresar a mi espacio</button>
            </form>

            <section className="mt-7 rounded-2xl border border-primary-200 bg-primary-container/55 p-4" aria-labelledby="demo-access-title">
              <div className="flex items-start gap-3">
                <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-sm font-black text-on-primary">i</span>
                <div><h3 id="demo-access-title" className="text-sm font-bold text-text-primary">Acceso de pruebas</h3><p className="mt-1 text-xs leading-5 text-text-secondary">Usa una cuenta de prueba y copia la contraseña inicial.</p></div>
              </div>
              <CopyDemoPassword />
            </section>
          </div>

          <p className="mt-5 text-center text-xs leading-5 text-text-tertiary">Al ingresar aceptas el uso responsable de la información según las políticas institucionales.</p>
        </div>
      </section>
    </main>
  );
}
