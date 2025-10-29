const latencyFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});

const solFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 4,
  maximumFractionDigits: 6
});

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit"
});

export const formatSignature = (signature: string, visible = 6) =>
  `${signature.slice(0, visible)}…${signature.slice(-visible)}`;

export const formatLatency = (ms?: number | null) =>
  ms === undefined || ms === null ? "—" : `${latencyFormatter.format(ms)} ms`;

export const lamportsToSol = (lamports?: number | null) =>
  lamports === undefined || lamports === null ? null : lamports / 1_000_000_000;

export const formatTip = (lamports?: number | null) => {
  const sol = lamportsToSol(lamports);
  return sol === null ? "—" : `${solFormatter.format(sol)} SOL`;
};

export const formatTimestamp = (timestamp?: number) =>
  typeof timestamp === "number" ? timeFormatter.format(new Date(timestamp)) : "—";
