import { createSignal, Show, createResource } from "solid-js";
import { Toast, useToast } from "./Toast";

const TOKEN_HEADER = "x-rsb-token";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["bytes", "kb", "mb", "gb", "tb"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  const size = parseFloat((bytes / Math.pow(k, i)).toFixed(2));
  return `${size.toFixed(2)} ${sizes[i]}`;
}

export function App() {
  const [progress, setProgress] = createSignal<{
    total: number;
    current: number;
    speed: string;
  }>();

  const toast = useToast();
  const [token, { refetch }] = createResource(async () => {
    const url = new URL(window.location.href);
    const token = url.searchParams.get("token");
    if (!token) {
      toast.error("No token in url");
      return;
    }

    const response = await fetch("/api/files", {
      headers: {
        [TOKEN_HEADER]: token,
      },
    });
    const body: { uploads: number; lastUsed: string } = await response.json();
    return body;
  });

  const lastUsed = () => {
    const lastUsed = token()?.lastUsed;
    if (!lastUsed) return;
    const date = new Date(lastUsed);
    return date.toLocaleString();
  };

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
    const start = Date.now();
    const xhr = new XMLHttpRequest();
    xhr.timeout = 1200_000; // 20 minutes

    const formData = new FormData();
    files.forEach((it) => formData.append("files", it));

    xhr.upload.onloadstart = (e) => {
      setProgress({ total: e.total, current: 0, speed: "0 kbs/s" });
    };

    xhr.upload.onprogress = (e) => {
      const secondsSinceStart = (Date.now() - start) / 1000;
      const speed = `${formatBytes(e.loaded / secondsSinceStart)}/s`;
      setProgress({ total: 1, current: e.loaded / e.total, speed });
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
      setTimeout(() => refetch(), 2000);
    };
    xhr.upload.onloadend = handleSuccess;
    xhr.upload.onerror = handleError;
    xhr.upload.onabort = handleError;
    xhr.upload.ontimeout = handleError;

    xhr.onreadystatechange = () => {
      if (xhr.readyState !== 4) return;
      if (xhr.status <= 200) return;
      toast.error(`Uploading files failed: ${xhr.response}`);
      handleEnd();
    };

    xhr.open("POST", "/api/files", true);
    xhr.setRequestHeader(TOKEN_HEADER, token);
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
              <p>Uploading...don't close this page! {progress()?.speed} </p>
              <progress value={progress()?.current} max={progress()?.total} />
            </div>
          }
        >
          <label
            aria-label="upload"
            for="upload"
            style={{
              cursor: "pointer",
              display: "flex",
              "flex-direction": "column",
              "align-items": "center",
            }}
          >
            <h2>Click to upload</h2>
            <p>Number of uploads: {token()?.uploads}</p>
            <p>Last upload {lastUsed()}</p>
          </label>
        </Show>
      </div>
    </div>
  );
}
