import { signIn } from "@/app/actions/session";
type SignInPageProps = { searchParams: Promise<{ error?: string; success?: string; email?: string }> };

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const errorMessage = params.error === "credentials" ? "El correo o la contraseña son incorrectos." : params.error === "unauthorized" ? "Tu cuenta no tiene un rol activo en la plataforma." : params.error === "session" ? "Tu sesión venció. Vuelve a iniciar sesión." : undefined;

  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[1.1fr_0.9fr]">
      <section className="relative hidden overflow-hidden bg-primary p-12 text-on-primary lg:flex lg:flex-col lg:justify-between">
        <div className="relative z-10 flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-white/15 text-base font-bold">SU</span><span><span className="block font-semibold">Salud Universitaria</span><span className="block text-sm text-white/75">Atención médica estudiantil</span></span></div>
        <div className="relative z-10 max-w-xl"><p className="text-sm font-semibold tracking-[0.16em] text-white/75">ATENCIÓN CLÍNICA UNIVERSITARIA</p><h1 className="mt-4 text-5xl font-bold leading-tight tracking-tight">Historias clínicas y atención conectadas.</h1><p className="mt-6 max-w-md text-lg leading-8 text-white/85">Registra, consulta y da seguimiento a la atención estudiantil desde un solo lugar.</p></div>
        <p className="relative z-10 text-sm text-white/70">Universidad pública · Servicio de salud estudiantil</p>
        <div aria-hidden="true" className="absolute -bottom-40 -right-28 size-140 rounded-full border-[48px] border-white/10" /><div aria-hidden="true" className="absolute -top-24 right-30 size-80 rounded-full bg-secondary/40 blur-3xl" />
      </section>

      <section className="flex items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center gap-3 lg:hidden"><span className="grid size-10 place-items-center rounded-xl bg-primary text-sm font-bold text-on-primary">SU</span><span><span className="block font-semibold text-text-primary">Salud Universitaria</span><span className="block text-xs text-text-tertiary">Atención médica estudiantil</span></span></div>
          <p className="text-sm font-semibold tracking-wide text-primary">BIENVENIDA/O</p><h2 className="mt-2 text-3xl font-bold tracking-tight text-text-primary">Inicia sesión</h2><p className="mt-2 text-text-secondary">Ingresa con tus credenciales institucionales.</p>
          {errorMessage && <p role="alert" className="mt-6 rounded-lg border border-error bg-error-container px-4 py-3 text-sm font-medium text-error">{errorMessage}</p>}
          {params.success === "logout" && <p role="status" className="mt-6 rounded-lg border border-success bg-success-container px-4 py-3 text-sm font-medium text-success">Cerraste sesión correctamente.</p>}
          <form action={signIn} className="mt-8 space-y-5">
            <label className="block text-sm font-semibold text-text-secondary">Correo electrónico<input required name="email" type="email" defaultValue={params.email} placeholder="nombre@correo.com" className="mt-2 w-full rounded-lg border border-border bg-surface px-3.5 py-3 text-text-primary placeholder:text-text-tertiary" /></label>
            <label className="block text-sm font-semibold text-text-secondary">Contraseña<input required name="password" type="password" minLength={8} placeholder="Ingresa tu contraseña" className="mt-2 w-full rounded-lg border border-border bg-surface px-3.5 py-3 text-text-primary placeholder:text-text-tertiary" /></label>
            <div className="flex items-center justify-between gap-3"><label className="flex items-center gap-2 text-sm text-text-secondary"><input name="remember" type="checkbox" className="size-4 accent-primary" />Recordarme</label><span className="text-sm text-text-tertiary">Acceso seguro</span></div>
            <button type="submit" className="w-full rounded-lg bg-primary px-5 py-3.5 text-sm font-semibold text-on-primary shadow-sm hover:bg-primary-hover">Iniciar sesión</button>
          </form>
          <div className="mt-8 rounded-xl border border-info-container bg-info-container/40 p-4"><p className="text-sm font-semibold text-info">Acceso de pruebas</p><p className="mt-1 text-sm leading-6 text-text-secondary">Usa una cuenta creada en Supabase Auth. Para las cuentas de prueba creadas por el seed, la contraseña inicial es <strong>SaludDemo2026!</strong>.</p></div>
          <p className="mt-8 text-center text-xs leading-5 text-text-tertiary">Al ingresar aceptas el uso responsable de la información según las políticas institucionales.</p>
        </div>
      </section>
    </main>
  );
}
