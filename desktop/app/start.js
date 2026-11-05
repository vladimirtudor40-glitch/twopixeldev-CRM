"use strict";
(function () {
  const crm = window.crm;
  const $ = (id) => document.getElementById(id);
  function render(s) {
    $("status").textContent = s.text;
    const failed = !!s.error;
    $("spinner").classList.toggle("hidden", failed);
    $("error").classList.toggle("hidden", !failed);
    $("errorText").textContent = s.error || "";
  }
  crm.onStartStatus(render);
  crm.getStartStatus().then(render);
  $("retry").addEventListener("click", () => {
    render({ text: "Pornesc…" });
    crm.retry();
  });
  $("setup").addEventListener("click", () => crm.openSetup());
  $("logs").addEventListener("click", () => crm.openLogs());
})();
