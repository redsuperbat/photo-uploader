import { createSignal, Show } from "solid-js";
import { Toast, useToast } from "./Toast";

export function App() {
  const [loading, setLoading] = createSignal(false);
  const toast = useToast();

  const handleFileUpload = async (e: InputEvent) => {
    const url = new URL(window.location.href);
    const token = url.searchParams.get("token");
    if (!token) {
      toast.error("No token in url");
      return;
    }
    const files = (e.target as HTMLInputElement)?.files;
    if (!files) {
      toast.warn("No file selected");
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
        toast.success(`${files.length} Files uploaded successfully`);
      } else {
        toast.error(`Uploading files failed: ${response.statusText}`);
      }
    } catch (error) {
      toast.error(`Error uploading files: ${error}`);
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
