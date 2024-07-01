import { createSignal, Show } from "solid-js";

export function App() {
  const [loading, setLoading] = createSignal(false);

  const handleFileUpload = async (e: InputEvent) => {
    const url = new URL(window.location.href);
    const token = url.searchParams.get("token");
    if (!token) return;
    setLoading(true);
    try {
      const files = (e.target as HTMLInputElement)?.files;
      if (!files) return;

      const formData = new FormData();
      [...files].forEach((it) => formData.append("file", it));

      try {
        const response = await fetch(`/api/files/${token}`, {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          console.log("File uploaded successfully");
        } else {
          console.error("File upload failed");
        }
      } catch (error) {
        console.error("Error uploading file:", error);
      }
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
      }}
    >
      <div
        style={{
          display: "flex",
          "flex-direction": "column",
          "justify-items": "center",
        }}
      >
        <h1>Upload your images here 💅</h1>
        <Show when={!loading()} fallback={<span aria-busy="true"></span>}>
          <input onInput={handleFileUpload} type="file" multiple />
        </Show>
      </div>
    </div>
  );
}
