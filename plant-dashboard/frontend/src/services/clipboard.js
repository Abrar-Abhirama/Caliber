/**
 * Copies text to the clipboard with fallback for non-secure contexts or older browsers.
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} True if copy succeeded, false otherwise
 */
export async function copyToClipboard(text) {
  if (!text) return false;

  // 1. Try modern navigator.clipboard API
  if (navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Continue to fallback
    }
  }

  // 2. Fallback to execCommand('copy') with temporary textarea
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.top = "-9999px";
    textArea.style.left = "-9999px";
    textArea.style.opacity = "0";
    textArea.setAttribute("readonly", "");
    document.body.appendChild(textArea);

    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, textArea.value.length);

    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error("Failed to copy text:", err);
    return false;
  }
}
