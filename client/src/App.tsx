import { createSignal, Show } from "solid-js";
import { Toast, useToast } from "./Toast";

export function App() {
  const [loading, setLoading] = createSignal(false);
  const addToast = useToast();

  const handleFileUpload = async (e: InputEvent) => {
    const url = new URL(window.location.href);
    const token = url.searchParams.get("token");
    if (!token) {
      addToast("No token in url", { severity: "error" });
      return;
    }
    const files = (e.target as HTMLInputElement)?.files;
    if (!files) {
      addToast("No file selected", { severity: "warn" });
      return;
    }

    const formData = new FormData();
    [...files].forEach((it) => formData.append("file", it));

    try {
      setLoading(true);
      const response = await fetch(`/api/files/${token}`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        addToast(`${files.length} Files uploaded successfully`);
      } else {
        addToast(`Uploading files failed: ${response.statusText}`, {
          severity: "error",
        });
      }
    } catch (error) {
      addToast(`Error uploading files: ${error}`, { severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "grid",
        "place-items": "center",
        height: "100vh",
        position: "relative",
      }}
    >
      <Toast />
      <div
        style={{
          display: "flex",
          "flex-direction": "column",
          "justify-items": "center",
        }}
      >
        <h1>Upload your images here 💅</h1>
        <div style={{ height: "5rem" }}>
          <Show when={!loading()} fallback={<span aria-busy="true"></span>}>
            <input onInput={handleFileUpload} type="file" multiple />
          </Show>
        </div>
      </div>
    </div>
  );
}
