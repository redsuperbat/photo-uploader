import { createSignal, Show } from "solid-js";
import { Toast, useToast } from "./Toast";

export function App() {
  const [progress, setProgress] = createSignal<{
    total: number;
    current: number;
  }>();
  const toast = useToast();

  const handleFileUpload = async (e: InputEvent) => {
    const url = new URL(window.location.href);
    const token = url.searchParams.get("token");
    const target = e.target as HTMLInputElement;

    if (!token) {
      toast.error("No token in url");
      return;
    }
    const files = [...(target?.files ?? [])];
    if (!files) {
      toast.warn("No file selected");
      return;
    }
    const xhr = new XMLHttpRequest();
    xhr.timeout = 600_000; // 10 minutes

    const formData = new FormData();
    files.forEach((it) => formData.append("file", it));

    xhr.upload.onloadstart = (e) => {
      setProgress({ total: e.total, current: 0 });
    };

    xhr.upload.onprogress = (e) => {
      setProgress({ total: 1, current: e.loaded / e.total });
    };

    const handleEnd = () => {
      setProgress();
      target.value = "";
    };
    const handleError = (e: ProgressEvent) => {
      toast.error(`Uploading files failed: ${e.type}`);
      handleEnd();
    };
    const handleSuccess = () => {
      toast.success(`${files.length} Files uploaded successfully`);
      handleEnd();
    };
    xhr.upload.onloadend = handleSuccess;
    xhr.upload.onerror = handleError;
    xhr.upload.onabort = handleError;
    xhr.upload.ontimeout = handleError;

    xhr.open("POST", `/api/files/${token}`, true);
    xhr.send(formData);
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
        accept=".jpg,.jpeg,.png,.mp4,.mov"
        type="file"
        multiple
      />
      <div style={{ height: "5rem" }}>
        <Show
          when={!progress()}
          fallback={
            <div
              style={{
                width: "80vw",
                display: "flex",
                "flex-direction": "column",
                "align-items": "center",
                "max-width": "900px",
              }}
            >
              <p>Uploading...don't close this page!</p>
              <progress value={progress()?.current} max={progress()?.total} />
            </div>
          }
        >
          <label
            aria-label="upload"
            for="upload"
            style={{
              cursor: "pointer",
            }}
          >
            <h2>Click to upload</h2>
          </label>
        </Show>
      </div>
    </div>
  );
}
