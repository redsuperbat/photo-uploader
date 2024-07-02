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
      <input
        id="upload"
        style={{ display: "none" }}
        onInput={handleFileUpload}
        accept=".jpg,.jpeg,.png,.mp4"
        capture="filesystem"
        type="file"
        multiple
      />
      <div style={{ height: "5rem" }}>
        <Show when={!loading()} fallback={<span aria-busy="true"></span>}>
          <h2>
            <label
              aria-label="upload"
              for="upload"
              style={{
                "line-height": "20px",
                cursor: "pointer",
              }}
            >
              <div>📸📸📸</div>
              <div>📸📸📸</div>
              <div>📸📸📸</div>
            </label>
          </h2>
        </Show>
      </div>
    </div>
  );
}
