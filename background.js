chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    const { type } = msg || {};

    if (type === "PING") return sendResponse({ ok: true });

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return sendResponse({ ok: false, error: "No active tab" });

    const validTypes = ["TOGGLE_ZAP", "CLEAR_SELECTION", "COPY_MD", "GET_MD"];
    if (validTypes.includes(type)) {
      chrome.tabs.sendMessage(tab.id, { type }, sendResponse);
    } else {
      sendResponse({ ok: false, error: "Unknown message" });
    }
  })();

  return true;
});
