import { createSignal, For } from "solid-js";

type Severity = "success" | "error" | "info" | "warn";
type Toast = {
  message: string;
  id: string;
  severity: Severity;
};
const [toasts, setToasts] = createSignal<Toast[]>([]);
const randomId = () => Math.random().toString().slice(2);

export const useToast = () => {
  return (message: string, opts?: { severity: Severity }) => {
    const { severity } = opts ?? { severity: "success" };
    const id = randomId();
    setToasts((it) => [{ message, id, severity }, ...it]);
    setTimeout(() => {
      setToasts((it) => it.filter((it) => it.id !== id));
    }, 5000);
  };
};

function ToastChip({ message, severity }: Toast) {
  const icon = () => {
    switch (severity) {
      case "success":
        return "✅";
      case "error":
        return "⛔️";
      case "info":
        return "ℹ️";
      case "warn":
        return "⚠️";
    }
  };

  return (
    <div
      style={{
        padding: "10px",
        "border-radius": "5px",
        background: "white",
      }}
    >
      <span>{icon()}</span> <span>{message}</span>
    </div>
  );
}

export function Toast() {
  return (
    <div
      style={{
        position: "absolute",
        top: "20px",
        right: "20px",
        display: "flex",
        "flex-direction": "column",
        gap: "5px",
      }}
    >
      <For each={toasts()}>{(message) => <ToastChip {...message} />}</For>
    </div>
  );
}
