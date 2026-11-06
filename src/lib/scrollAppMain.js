/** Scroll the AppLayout main pane (desktop) and document to top. */
export function scrollAppMainToTop({ smooth = false } = {}) {
  const main = document.getElementById("app-main");
  const behavior = smooth ? "smooth" : "auto";
  if (main) {
    if (typeof main.scrollTo === "function") {
      main.scrollTo({ top: 0, behavior });
    } else {
      main.scrollTop = 0;
    }
  }
  if (typeof window.scrollTo === "function") {
    window.scrollTo({ top: 0, behavior });
  }
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}
