// TableFlow Troubleshooter
// Local repair helpers for startup failures, corrupted localStorage, and stuck loading.

(function () {
  "use strict";

  const REPORT_KEY = "tableflow.troubleshoot.lastReport";
  const LAST_ERROR_KEY = "tableflow.troubleshoot.lastError";
  const BACKUP_KEY_PREFIX = "tableflow.troubleshoot.backup.";
  const JSON_KEYS = [
    "tableflow.users",
    "tableflow.activeSession",
    "tableflow.currentShift",
    "tableflow.layoutConfig",
    "tableflow.menuConfig",
    "tableflow.settings",
    "tableflow.analytics",
    "tableflow.profile",
    "tableflow.backup"
  ];

  const DEFAULT_SETTINGS_PATCH = {
    serviceWorkflow: {
      quickDrinkDelivery: true,
      skipDrinkDeliveryConfirm: false
    },
    developer: {
      enabled: false,
      showTesterToggle: false,
      debugLogs: false
    },
    branding: {},
    sideWork: {
      remindersEnabled: true,
      chimeEnabled: true,
      reminderStyle: "gentle",
      snoozeDefaultMinutes: 15,
      maxFocusTasks: 3
    },
    checkBack: {
      enabled: true,
      firstCheckMinutes: 2,
      refillCheckMinutes: 8,
      secondCheckMinutes: 15,
      dessertSuggestMinutes: 25,
      useSmartTiming: true,
      chimeEnabled: true,
      pulseTable: true
    }
  };

  function safeSet(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn("TableFlow troubleshoot write failed", key, error);
      return false;
    }
  }

  function safeGet(key) {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn("TableFlow troubleshoot read failed", key, error);
      return null;
    }
  }

  function safeRemove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn("TableFlow troubleshoot remove failed", key, error);
      return false;
    }
  }

  function parseJSON(value) {
    if (!value) return { ok: true, value: null };
    try {
      return { ok: true, value: JSON.parse(value) };
    } catch (error) {
      return { ok: false, error };
    }
  }

  function allTableFlowKeys() {
    const keys = [];
    try {
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (key && key.startsWith("tableflow.")) keys.push(key);
      }
    } catch (error) {
      console.warn("TableFlow troubleshoot key scan failed", error);
    }
    return keys;
  }

  function createSmallBackup() {
    const snapshot = {};
    allTableFlowKeys().forEach((key) => {
      if (key.startsWith(BACKUP_KEY_PREFIX)) return;
      const value = safeGet(key);
      if (value && value.length < 250000) snapshot[key] = value;
    });
    const backupKey = `${BACKUP_KEY_PREFIX}${Date.now()}`;
    safeSet(backupKey, JSON.stringify({
      createdAt: new Date().toISOString(),
      note: "Automatic pre-repair backup. Large values may be omitted.",
      snapshot
    }));
    return backupKey;
  }

  function quarantineKey(key, report) {
    const value = safeGet(key);
    if (value !== null) {
      safeSet(`${key}.corrupt.${Date.now()}`, value);
      safeRemove(key);
      report.repaired.push(`Moved corrupted ${key} out of the way.`);
    }
  }

  function patchObjectKey(key, patch, report) {
    const raw = safeGet(key);
    if (!raw) return;
    const parsed = parseJSON(raw);
    if (!parsed.ok || !parsed.value || typeof parsed.value !== "object") return;
    const next = { ...patch, ...parsed.value };
    Object.keys(patch).forEach((property) => {
      if (patch[property] && typeof patch[property] === "object" && !Array.isArray(patch[property])) {
        next[property] = { ...patch[property], ...(parsed.value[property] || {}) };
      }
    });
    if (safeSet(key, JSON.stringify(next))) {
      report.repaired.push(`Filled missing defaults in ${key}.`);
    }
  }

  function estimateStorageSize() {
    let bytes = 0;
    allTableFlowKeys().forEach((key) => {
      const value = safeGet(key) || "";
      bytes += (key.length + value.length) * 2;
    });
    return bytes;
  }

  function repairStorage() {
    const report = {
      createdAt: new Date().toISOString(),
      repaired: [],
      warnings: [],
      storageBytes: 0,
      backupKey: null
    };

    report.backupKey = createSmallBackup();

    JSON_KEYS.concat(allTableFlowKeys().filter((key) => key.startsWith("tableflow.userData."))).forEach((key) => {
      const value = safeGet(key);
      if (!value) return;
      const parsed = parseJSON(value);
      if (!parsed.ok) quarantineKey(key, report);
    });

    safeRemove("tableflow.dev.corruptTest");
    patchObjectKey("tableflow.settings", DEFAULT_SETTINGS_PATCH, report);

    const currentShiftRaw = safeGet("tableflow.currentShift");
    const currentShift = parseJSON(currentShiftRaw);
    if (currentShift.ok && currentShift.value && typeof currentShift.value === "object") {
      const repairedShift = {
        ...currentShift.value,
        tables: currentShift.value.tables || {},
        alerts: Array.isArray(currentShift.value.alerts) ? currentShift.value.alerts : [],
        sideWork: currentShift.value.sideWork || {}
      };
      safeSet("tableflow.currentShift", JSON.stringify(repairedShift));
      report.repaired.push("Checked current shift structure.");
    }

    report.storageBytes = estimateStorageSize();
    safeSet(REPORT_KEY, JSON.stringify(report));
    return report;
  }

  function clearBrokenShiftOnly() {
    const report = {
      createdAt: new Date().toISOString(),
      repaired: [],
      warnings: ["Current shift/layout/menu/settings keys were cleared. Account keys were preserved."],
      storageBytes: 0,
      backupKey: createSmallBackup()
    };
    [
      "tableflow.currentShift",
      "tableflow.layoutConfig",
      "tableflow.menuConfig",
      "tableflow.settings",
      "tableflow.analytics",
      "tableflow.backup"
    ].forEach((key) => {
      safeRemove(key);
      report.repaired.push(`Cleared ${key}.`);
    });
    report.storageBytes = estimateStorageSize();
    safeSet(REPORT_KEY, JSON.stringify(report));
    return report;
  }

  function saveError(error) {
    const payload = {
      createdAt: new Date().toISOString(),
      message: error?.message || String(error),
      stack: error?.stack || "",
      source: error?.filename || "",
      line: error?.lineno || null,
      column: error?.colno || null
    };
    safeSet(LAST_ERROR_KEY, JSON.stringify(payload));
    return payload;
  }

  function button(label, className, onClick) {
    const node = document.createElement("button");
    node.type = "button";
    node.className = className || "";
    node.textContent = label;
    node.addEventListener("click", onClick);
    return node;
  }

  function showRecoveryPanel(reason, error) {
    const loadingScreen = document.getElementById("loadingScreen");
    if (!loadingScreen) return;

    const savedError = error ? saveError(error) : parseJSON(safeGet(LAST_ERROR_KEY)).value;
    loadingScreen.classList.remove("fade-out", "hidden");
    loadingScreen.innerHTML = "";

    const panel = document.createElement("section");
    panel.className = "troubleshoot-panel";
    panel.innerHTML = `
      <div class="loading-logo">TableFlow</div>
      <h1>Startup recovery</h1>
      <p>${reason || "TableFlow noticed the loading screen did not finish."}</p>
      <p class="troubleshoot-note">This repair keeps your local account data when possible and moves broken saved JSON into a quarantine backup.</p>
    `;

    const actions = document.createElement("div");
    actions.className = "troubleshoot-actions";
    actions.append(
      button("Repair and Reload", "primary", () => {
        const report = repairStorage();
        safeSet(REPORT_KEY, JSON.stringify(report));
        window.location.reload();
      }),
      button("Clear Broken Shift Only", "", () => {
        clearBrokenShiftOnly();
        window.location.reload();
      }),
      button("Try Opening App", "", () => {
        loadingScreen.remove();
        document.getElementById("authScreen")?.classList.remove("hidden");
        document.getElementById("appShell")?.classList.remove("hidden");
      })
    );

    const details = document.createElement("details");
    details.className = "troubleshoot-details";
    details.innerHTML = `<summary>Show technical details</summary><pre>${escapeHTML(JSON.stringify(savedError || {}, null, 2))}</pre>`;

    panel.append(actions, details);
    loadingScreen.append(panel);
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function handleFatal(error) {
    showRecoveryPanel("TableFlow hit a startup issue before the app could finish loading.", error);
  }

  window.addEventListener("error", (event) => {
    saveError(event.error || event);
    window.setTimeout(() => {
      const loadingScreen = document.getElementById("loadingScreen");
      if (loadingScreen && document.body.contains(loadingScreen)) {
        showRecoveryPanel("A startup script error stopped TableFlow from loading.", event.error || event);
      }
    }, 50);
  });

  window.addEventListener("unhandledrejection", (event) => {
    saveError(event.reason || event);
    window.setTimeout(() => {
      const loadingScreen = document.getElementById("loadingScreen");
      if (loadingScreen && document.body.contains(loadingScreen)) {
        showRecoveryPanel("A startup promise failed while TableFlow was loading.", event.reason || event);
      }
    }, 50);
  });

  document.addEventListener("DOMContentLoaded", () => {
    window.setTimeout(() => {
      const loadingScreen = document.getElementById("loadingScreen");
      const appShell = document.getElementById("appShell");
      const authScreen = document.getElementById("authScreen");
      const appVisible = appShell && !appShell.classList.contains("hidden");
      const authVisible = authScreen && !authScreen.classList.contains("hidden");
      if (loadingScreen && document.body.contains(loadingScreen) && !appVisible && !authVisible) {
        showRecoveryPanel("The loading screen took too long. A saved data repair may fix it.");
      }
    }, 5000);
  });

  window.TableFlowTroubleshooter = {
    repairStorage,
    clearBrokenShiftOnly,
    handleFatal,
    showRecoveryPanel,
    estimateStorageSize
  };
}());
