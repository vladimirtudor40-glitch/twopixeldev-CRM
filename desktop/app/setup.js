"use strict";
(function () {
  const crm = window.crm;
  const $ = (id) => document.getElementById(id);
  const urlInput = $("url");
  let state = null;
  let check = null;
  let checkedUrl = null;
  let busy = false;

  function show(el, visible) {
    el.classList.toggle("hidden", !visible);
  }
  function message(el, kind, text) {
    el.className = "msg " + kind;
    el.textContent = text;
    show(el, !!text);
  }
  function needsAdmin() {
    return !!check && check.userCount === 0;
  }
  function refreshButtons() {
    const sameUrl = checkedUrl === urlInput.value.trim();
    $("save").disabled = busy || !check || !sameUrl;
    $("test").disabled = busy;
    $("cancel").disabled = busy;
  }

  $("toggle").addEventListener("click", () => {
    const hidden = urlInput.type === "password";
    urlInput.type = hidden ? "text" : "password";
    $("toggle").textContent = hidden ? "Ascunde" : "Arată";
  });

  urlInput.addEventListener("input", () => {
    if (checkedUrl !== urlInput.value.trim()) {
      check = null;
      show($("testResult"), false);
      show($("adminCard"), false);
    }
    refreshButtons();
  });

  $("test").addEventListener("click", async () => {
    busy = true;
    refreshButtons();
    message($("testResult"), "info", "Verific…");
    message($("saveError"), "err", "");
    const value = urlInput.value.trim();
    const r = await crm.testConnection(value);
    busy = false;
    if (!r.ok) {
      check = null;
      checkedUrl = null;
      message($("testResult"), "err", r.error);
      show($("adminCard"), false);
    } else {
      check = r.data;
      checkedUrl = value;
      const ver = r.data.serverVersion ? " (PostgreSQL " + r.data.serverVersion.split(" ")[0] + ")" : "";
      let text = "Conexiune reușită" + ver + ". ";
      if (r.data.userCount === 0) text += "Baza de date e goală: programul va crea tabelele și contul tău de administrator.";
      else if (r.data.pendingMigrations > 0) text += "Baza CRM există și va fi actualizată la versiunea programului.";
      else text += "Baza CRM e pregătită (" + r.data.userCount + (r.data.userCount === 1 ? " utilizator" : " utilizatori") + "). Te vei autentifica cu contul tău.";
      message($("testResult"), "ok", text);
      show($("adminCard"), needsAdmin());
      if (needsAdmin()) $("name").focus();
    }
    refreshButtons();
  });

  $("save").addEventListener("click", async () => {
    message($("saveError"), "err", "");
    let admin = null;
    if (needsAdmin()) {
      admin = { name: $("name").value, email: $("email").value, password: $("pass").value };
      if (!admin.name.trim()) return message($("saveError"), "err", "Scrie numele tău.");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(admin.email.trim())) return message($("saveError"), "err", "Adresa de email nu e validă.");
      if (admin.password.length < 10) return message($("saveError"), "err", "Parola trebuie să aibă cel puțin 10 caractere.");
      if (admin.password !== $("pass2").value) return message($("saveError"), "err", "Parolele nu coincid.");
    }
    busy = true;
    refreshButtons();
    $("log").textContent = "";
    const r = await crm.saveSetup({ url: urlInput.value.trim(), admin });
    if (!r.ok) {
      busy = false;
      message($("saveError"), "err", r.error);
      refreshButtons();
    }
  });

  $("cancel").addEventListener("click", () => crm.cancelSetup());

  crm.onSetupLog((line) => {
    $("log").textContent += line + "\n";
  });

  crm.getState().then((s) => {
    state = s;
    $("version").textContent = "Versiunea " + s.version;
    if (s.notice) message($("notice"), "info", s.notice);
    if (s.hasConfig) {
      $("current").textContent = "Conexiunea actuală: " + s.maskedUrl + ". Lasă câmpul gol și apasă „Verifică” ca s-o păstrezi.";
      show($("current"), true);
      show($("cancel"), !s.needsAdmin);
      urlInput.placeholder = "Lasă gol pentru conexiunea actuală";
    }
    refreshButtons();
    urlInput.focus();
  });
})();
