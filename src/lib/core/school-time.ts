// Escolas-alvo são em Portugal — usa-se sempre este fuso para "hoje"/"amanhã",
// independentemente de onde a função serverless está a correr (normalmente UTC).
export const SCHOOL_TIMEZONE = "Europe/Lisbon";

const WEEKDAY_PT: Record<string, string> = {
  Sunday: "domingo",
  Monday: "segunda-feira",
  Tuesday: "terça-feira",
  Wednesday: "quarta-feira",
  Thursday: "quinta-feira",
  Friday: "sexta-feira",
  Saturday: "sábado",
};

// Entre a meia-noite e as 6h, "amanhã" dito no sentido de "a manhã seguinte"
// refere-se ao próprio dia (a manhã que se aproxima), não ao dia seguinte no
// calendário — só depois das 6h é que "amanhã" volta a significar o dia a seguir.
const EARLY_MORNING_CUTOFF_HOUR = 6;

/** Data no formato YYYY-MM-DD, em Portugal, independentemente do fuso do runtime. */
export function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SCHOOL_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Data/hora atuais em Portugal + dia da semana em português, para o modelo
 * conseguir resolver referências relativas ("amanhã", "esta semana", "sexta-feira
 * que vem") contra horários/calendários presentes no contexto. Entre as 00:00 e
 * as 06:00, o cálculo de "amanhã" é feito aqui (não deixado ao modelo) e anotado
 * explicitamente, para não depender do modelo aplicar corretamente esta exceção. */
export function currentDateTimeLabel(): string {
  const now = new Date();
  const weekdayEn = new Intl.DateTimeFormat("en-US", { timeZone: SCHOOL_TIMEZONE, weekday: "long" }).format(now);
  const date = todayISO();
  const time = new Intl.DateTimeFormat("pt-PT", {
    timeZone: SCHOOL_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: SCHOOL_TIMEZONE, hour: "2-digit", hour12: false }).format(now));

  const base = `${WEEKDAY_PT[weekdayEn] ?? weekdayEn}, ${date}, ${time}`;

  if (hour < EARLY_MORNING_CUTOFF_HOUR) {
    return `${base} (madrugada — antes das ${String(EARLY_MORNING_CUTOFF_HOUR).padStart(2, "0")}:00, por isso "amanhã" no sentido de "a manhã seguinte" refere-se a HOJE, ${date}, não ao dia seguinte no calendário)`;
  }

  return base;
}
