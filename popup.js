const out = document.getElementById("out");
const cleanupCheckbox = document.getElementById("cleanup");

async function send(type) {
  return chrome.runtime.sendMessage({ type });
}

document.getElementById("toggle").addEventListener("click", async () => {
  const res = await send("TOGGLE_ZAP");
  if (!res?.ok) alert(res?.error || "Failed");
  else window.close();
});

document.getElementById("clear").addEventListener("click", async () => {
  const res = await send("CLEAR_SELECTION");
  out.value = "";
  if (!res?.ok) alert(res?.error || "Failed");
});

document.getElementById("copy").addEventListener("click", async () => {
  const res = await send("COPY_MD");
  if (!res?.ok) alert(res?.error || "Failed to copy");
  else out.value = "";
});

cleanupCheckbox.addEventListener("change", async () => {
  await chrome.storage.local.set({ cleanupMarkdown: cleanupCheckbox.checked });
});

(async () => {
  const { cleanupMarkdown = true } = await chrome.storage.local.get("cleanupMarkdown");
  cleanupCheckbox.checked = cleanupMarkdown;

  const res = await send("GET_MD");
  if (res?.ok) out.value = res.md || "";
})();
