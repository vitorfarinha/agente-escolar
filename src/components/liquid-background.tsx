/** Fundo decorativo partilhado por /login e /chat — gradiente + manchas desfocadas atrás dos painéis de vidro. */
export function LiquidBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-gradient-to-br from-sky-100 via-indigo-50 to-violet-100 dark:from-slate-950 dark:via-indigo-950 dark:to-slate-950">
      <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-sky-300/50 blur-3xl dark:bg-sky-500/20" />
      <div className="absolute right-[-6rem] top-1/4 h-[28rem] w-[28rem] rounded-full bg-violet-300/50 blur-3xl dark:bg-violet-500/20" />
      <div className="absolute bottom-[-8rem] left-1/3 h-[26rem] w-[26rem] rounded-full bg-pink-200/50 blur-3xl dark:bg-fuchsia-500/10" />
    </div>
  );
}
