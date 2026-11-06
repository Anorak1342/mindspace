/* Mindspace shared entry screen. This is a convenience lock only: GitHub Pages serves the site files publicly. */
(() => {
  const ACCESS_KEY = "mindspaceAccessGranted";
  const PASSWORD_SHA256 = "403774aa7e1635aaf218dc899900238e691ffb21ec1701255840aa614a28fc39";
  let unlocked = false;
  try { unlocked = localStorage.getItem(ACCESS_KEY) === "yes"; } catch (_) {}
  if (unlocked) return;

  document.documentElement.classList.add("mindspace-locked");
  const style = document.createElement("style");
  style.textContent = `
    html.mindspace-locked body > *:not(#mindspace-lock-screen) { visibility: hidden !important; }
    #mindspace-lock-screen { visibility: visible !important; position: fixed; inset: 0; z-index: 2147483647;
      display:flex; align-items:center; justify-content:center; padding:24px; box-sizing:border-box;
      background: radial-gradient(ellipse at 50% 0%, #25345a 0%, #101522 52%, #080b12 100%);
      color:#f7f8fc; font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    #mindspace-lock-screen * { box-sizing:border-box; }
    #mindspace-lock-screen .ms-lock-card { width:min(100%,420px); padding:38px 32px 30px; border:1px solid #ffffff20;
      border-radius:24px; background:#151c2ceF; box-shadow:0 24px 90px #0009; text-align:center; }
    #mindspace-lock-screen .ms-lock-mark { width:54px;height:54px;margin:0 auto 20px;border-radius:17px;
      display:grid;place-items:center;background:linear-gradient(135deg,#7c8cff,#a36bff);font-size:27px;font-weight:800; }
    #mindspace-lock-screen h1 { margin:0 0 9px;font-size:29px;letter-spacing:-1px; }
    #mindspace-lock-screen p { margin:0 0 24px;color:#aeb8cd;font-size:14px;line-height:1.55; }
    #mindspace-lock-screen input { width:100%;height:52px;border:1px solid #3a4661;border-radius:12px;background:#0c1220;
      color:#fff;padding:0 16px;font-size:18px;letter-spacing:4px;text-align:center;outline:none; }
    #mindspace-lock-screen input:focus { border-color:#8997ff;box-shadow:0 0 0 3px #8997ff28; }
    #mindspace-lock-screen button { width:100%;height:52px;margin-top:13px;border:0;border-radius:12px;
      background:linear-gradient(100deg,#7185ff,#9a70ff);color:white;font-size:15px;font-weight:750;cursor:pointer; }
    #mindspace-lock-screen button:hover { filter:brightness(1.09); }
    #mindspace-lock-screen .ms-lock-error { min-height:20px;margin:12px 0 0;color:#ff8d9b;font-size:13px; }
    #mindspace-lock-screen .ms-lock-foot { margin:18px 0 0;color:#69758d;font-size:11px; }
  `;
  document.head.appendChild(style);

  function showLock() {
    if (!document.body || document.getElementById("mindspace-lock-screen")) return;
    const screen = document.createElement("div");
    screen.id = "mindspace-lock-screen";
    screen.innerHTML = `
      <form class="ms-lock-card" autocomplete="off">
        <div class="ms-lock-mark">M</div>
        <h1>Welcome to Mindspace</h1>
        <p>This space is password protected.<br>Enter the access code to continue.</p>
        <input id="ms-lock-password" type="password" inputmode="numeric" autocomplete="off" placeholder="Enter password" aria-label="Website password" required>
        <button type="submit">Unlock Mindspace</button>
        <div class="ms-lock-error" id="ms-lock-error" role="alert"></div>
        <div class="ms-lock-foot">Your space to learn, play and create.</div>
      </form>`;
    document.body.appendChild(screen);
    const form = screen.querySelector("form");
    const input = screen.querySelector("input");
    const error = screen.querySelector("#ms-lock-error");
    form.addEventListener("submit", async event => {
      event.preventDefault();
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input.value));
      const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2,"0")).join("");
      if (hash === PASSWORD_SHA256) {
        try { localStorage.setItem(ACCESS_KEY, "yes"); } catch (_) {}
        document.documentElement.classList.remove("mindspace-locked");
        screen.remove();
      } else {
        error.textContent = "That password isn't correct. Try again.";
        input.value = "";
        input.focus();
      }
    });
    input.focus();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", showLock, { once:true });
  else showLock();
})();
