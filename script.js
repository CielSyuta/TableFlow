// TableFlow local-first app
// State, Storage, Rendering, Navigation, Floor Layout, Menu, Orders, POS Queue,
// Guest Check, Alerts, Analytics, Settings, Import/Export.

const APP_VERSION = "0.3.0";
const STORAGE_KEYS = {
  users: "tableflow.users",
  activeSession: "tableflow.session",
  restaurants: "tableflow.restaurants",
  activeStore: "tableflow.activeStore",
  currentShift: "tableflow.currentShift",
  currentShiftId: "tableflow.currentShiftId",
  layoutConfig: "tableflow.layoutConfig",
  menuConfig: "tableflow.menuConfig",
  settings: "tableflow.settings",
  theme: "tableflow.theme",
  storageVersion: "tableflow.storageVersion",
  analytics: "tableflow.analytics",
  profile: "tableflow.profile",
  messages: "tableflow.messages",
  backup: "tableflow.backup"
};
const USER_DATA_PREFIX = "tableflow.userData.";
const IDB_NAME = "TableFlowDenny";
const IDB_VERSION = 1;
const IDB_STORES = ["users", "shifts", "activeTables", "orders", "posQueue", "alerts", "messages", "analyticsEvents", "shiftSummaries", "layoutOverrides", "menuOverrides", "restaurants", "activityFeed", "logoAssets"];
let idbReady = null;
let storageWarningShownAt = 0;

const THEME_PRESETS = {
  default: { name: "Default TableFlow", primary: "#ff6a21", secondary: "#1d67a8", accent: "#ffc59f", bg: "#050914", panel: "#0d172a", card: "#111d32", text: "#f5f7fb", muted: "#91a2bd" },
  dennys: { name: "Denny's", primary: "#d71920", secondary: "#f9c80e", accent: "#ff7a18", bg: "#170d09", panel: "#29150f", card: "#3a1f15", text: "#fff7e7", muted: "#f0c878" },
  sakura: { name: "Sakura", primary: "#e94c91", secondary: "#ff8fc7", accent: "#ffd1e5", bg: "#fff4f9", panel: "#fff9fc", card: "#ffe7f2", text: "#3b2030", muted: "#875169" },
  blue: { name: "Blue Preset", primary: "#1683ff", secondary: "#0d47a1", accent: "#6ec6ff", bg: "#06111f", panel: "#0b1d33", card: "#102945", text: "#f3f8ff", muted: "#9cb4d1" },
  crimson: { name: "Crimson Red", primary: "#c1121f", secondary: "#2b2d31", accent: "#ff6b6b", bg: "#111113", panel: "#1d1d21", card: "#292a2f", text: "#f7f7f7", muted: "#b7b7bd" },
  iosGlass: { name: "iOS Glass", primary: "#0a84ff", secondary: "#64d2ff", accent: "#ff9f0a", bg: "#0b1020", panel: "rgba(255,255,255,.11)", card: "rgba(255,255,255,.14)", text: "#f7fbff", muted: "#b8c7dc" }
};

const STATUS = [
  "Open", "Seated", "Greeted", "Drinks Ordered", "Drinks Served", "Apps Fired",
  "Order Taken", "Order Sent", "Waiting for Food", "Food Running", "Check Back", "Check Back Due",
  "Refill Check Due", "Check Back Overdue", "Check Back Done", "Check Dropped",
  "Paid", "Pre-Bus", "Bus Needed", "Reset"
];
const POS_STATUS_LABELS = {
  needs_rung_in: "Needs Ring In",
  added_to_main_pos: "Added to Main POS",
  waiting_for_food: "Waiting for Food",
  food_ready: "Food Ready",
  delivered: "Delivered",
  cancelled_removed: "Cancelled / Removed",
  app_fired: "App Fired",
  rung_in: "Added to Main POS",
  completed: "Delivered"
};
const POS_CATEGORIES = window.TableFlowMenuConfig.categories;
const GRID = 20;
const DEV_OWNER_EMAIL = "admin@tableflow.com";
const DEV_OWNER_PASSWORD = "1234";
const SERVICE_NAV_VIEWS = ["home", "floor", "orders", "pos", "stations", "sidework", "messages", "profile", "settings"];
const GM_ROLES = ["General Manager"];
const MANAGER_ROLES = ["General Manager", "Manager"];
const ROLE_HOME_VIEWS = {
  "General Manager": ["home", "floor", "menu", "pos", "orders", "stations", "sidework", "messages", "analytics", "gm", "settings", "profile"],
  Manager: ["home", "floor", "menu", "pos", "orders", "stations", "sidework", "messages", "analytics", "settings", "profile"],
  Supervisor: ["home", "floor", "menu", "pos", "orders", "stations", "sidework", "messages", "analytics", "settings", "profile"],
  PIC: ["home", "floor", "menu", "pos", "orders", "stations", "sidework", "messages", "settings", "profile"],
  Server: ["home", "floor", "menu", "pos", "orders", "stations", "sidework", "messages", "settings", "profile"],
  Host: ["home", "floor", "stations", "messages", "settings", "profile"],
  Dishwasher: ["home", "stations", "sidework", "messages", "settings", "profile"]
};

const els = {};
const state = {
  layoutConfig: null,
  menuConfig: null,
  settings: null,
  currentShift: null,
  analytics: null,
  selectedTableId: null,
  activeView: "floor",
  activeMenuCategory: "BEV",
  analyticsRange: "shift",
  editMode: false,
  dirty: false,
  drag: null,
  longPressTimer: null,
  editingOrderId: null,
  movingOrderId: null,
  pinUnlocked: false,
  recoveryMessage: ""
  , authMode: "welcome",
  activeUser: null,
  users: [],
  restaurantData: null,
  restaurants: [],
  messages: [],
  pendingVerification: null,
  pendingPasswordReset: null,
  menuSearch: "",
  menuSubcategory: "",
  menuEditorSearch: "",
  menuEditorCategory: ""
  , floorEditorSelectedId: null,
  floorEditorZoom: 1,
  layoutUndo: [],
  layoutRedo: [],
  devLogs: [],
  testerEnabled: false
  , startFlow: { tableId: null, partySize: null, showAllTables: false },
  seatSummaryMode: "seat",
  menuBuilder: null,
  mobileNavOpen: false,
  notificationCooldowns: {}
  , settingsPage: "main",
  storage: { idbAvailable: false, fallback: false, usageBytes: 0 },
  syncTimer: null,
  syncInFlight: false,
  syncQueued: false
};

document.addEventListener("DOMContentLoaded", boot);

function boot() {
  cacheElements();
  showLoading("Loading your floor plan...");
  window.setTimeout(async () => {
    try {
      await initLocalDatabase();
      loadAuthState();
      await loadStateSafely();
      bindEvents();
      setTheme(state.settings.theme);
      applyBranding();
      setupPinKeypad();
      renderAll();
      if (state.settings.pinEnabled && state.settings.pinRequireOpen && state.settings.pinHash) {
        showLockScreen();
        fadeInApp();
      } else if (!state.activeUser) {
        fadeInAuth();
      } else {
        state.pinUnlocked = !state.settings.pinEnabled || !state.settings.pinHash;
        fadeInApp();
        if (!state.restaurantData) {
          state.authMode = "restaurant";
          fadeInAuth();
        }
      }
      setInterval(updateTime, 30000);
      setInterval(runReminderTick, 30000);
      setupCloudSyncTimer();
      queueCloudSync("startup");
    } catch (error) {
      console.error("TableFlow startup failed", error);
      window.TableFlowTroubleshooter?.handleFatal?.(error);
    }
  }, 450);
}

function cacheElements() {
  [
    "authScreen", "authPanel", "authAppName", "authSubtitle", "authBrandLogo",
    "loadingScreen", "loadingMessage", "loadingBrandLogo", "appShell", "floorCanvas", "floorPlan", "detailPanel",
    "shellBrandLogo", "shellAppName", "shellRestaurantName",
    "lockScreen", "lockMessage", "pinEntryInput", "pinKeypad", "unlockButton", "clearLocalDataButton",
    "storageStatus", "settingsStorageStatus", "currentTime", "viewTitle", "viewSubtitle", "settingsPanel", "lockAppButton",
    "editModeButton", "alertsButton", "alertCount", "messagesTopButton", "snapToggle", "gridToggle", "quickSeatButton", "floorOverview",
    "openMenuButton", "sendDrinksButton", "guestCheckTopButton", "openFloorEditorButton",
    "backToFloorButton", "saveLayoutButton", "undoLayoutButton", "redoLayoutButton",
    "zoomOutButton", "resetZoomButton", "zoomInButton", "exportLayoutButton", "importLayoutButton",
    "layoutFileInput", "floorObjectPalette", "floorEditorCanvas", "floorEditorCanvasWrap",
    "floorPropertiesPanel", "floorEditorStatus", "selectedTableChip",
    "menuSeatButtons", "expandedOrderPanel", "homePanel", "tableDashboardPanel", "startTableButton",
    "mobileFloorList", "messagesPanel", "gmPanel", "mobileNavToggle", "mobileNavBackdrop", "mobileNavDrawer",
    "categoryTabs", "menuGrid", "noDrinkButton", "ordersList", "posQueueList",
    "copyPosQueueButton", "stationsList", "analyticsCards",
    "analyticsBars", "themeToggle", "notificationsToggle", "chimeToggle", "autosaveToggle",
    "chimeVolume", "testChimeButton", "testNotificationButton", "appVersionText", "saveNowButton",
    "inAppAlertsToggle", "pushNotificationsToggle", "voiceNotificationsToggle", "voiceModeInput",
    "notificationSupportText", "compactNavToggle",
    "exportAllButton", "importAllButton", "importAllInput", "clearShiftButton",
    "pinEnabledToggle", "pinRequireOpenToggle", "pinRequireAdminToggle", "pinCreateInput",
    "pinConfirmInput", "savePinButton", "removePinButton", "profilePanel", "profileSummary",
    "resetDemoButton", "exportAnalyticsJsonButton", "exportAnalyticsCsvButton",
    "clearAnalyticsButton", "recoveryBanner", "menuCategoryInput", "menuPosKeyInput",
    "menuNameInput", "menuShortNameInput", "menuSubcategoryInput", "menuPriceInput",
    "menuPrepCapabilityInput", "menuPrepStationInput", "menuModifiersInput",
    "addMenuItemButton", "exportMenuJsonButton", "importMenuJsonButton",
    "exportMenuCsvButton", "importMenuCsvButton", "templateMenuCsvButton",
    "menuFileInput", "menuEditorList", "menuSearchInput", "menuSubcategoryFilter",
    "menuQuickSections", "menuEditorSearchInput", "menuEditorCategoryFilter",
    "menuEditingIdInput", "menuTableShareInput", "menuPrepRequiredInput", "clearMenuFormButton",
    "accountSettingsSummary", "logoutSettingsButton", "developerCommandInput", "runDeveloperCommandButton", "brandingRestaurantNameInput",
    "brandingStoreNumberInput", "brandingAppNameInput", "brandingPrimaryInput",
    "brandingSecondaryInput", "brandingAccentInput", "brandingBgInput", "brandingCardInput",
    "brandingButtonStyleInput", "brandingGuestCheckLogoToggle", "brandingLoginLogoToggle",
    "logoPreview", "saveBrandingButton", "uploadLogoButton", "removeLogoButton", "logoFileInput",
    "themePresetGrid", "saveCustomThemeButton", "resetThemeButton", "exportRestaurantButton",
    "exportBrandingButton", "importBrandingButton", "importBrandingInput",
    "developerModeToggle", "testerToggleSetting", "debugLogsToggle", "openDevToolsButton",
    "exportDebugReportButton", "developerPanel", "testerToggleButton", "testerPanel"
    , "sideWorkPanel", "sideWorkTitleInput", "sideWorkStationIdInput",
    "sideWorkStationNameInput", "sideWorkRoleInput", "sideWorkTimingTypeInput",
    "sideWorkOffsetInput", "sideWorkWindowInput", "sideWorkPriorityInput",
    "sideWorkCategoryInput", "sideWorkEstimateInput", "sideWorkDescriptionInput",
    "addSideWorkTaskButton", "exportSideWorkJsonButton", "importSideWorkJsonButton",
    "exportSideWorkCsvButton", "importSideWorkCsvButton", "templateSideWorkCsvButton",
    "sideWorkFileInput", "sideWorkRemindersToggle", "sideWorkChimeToggle",
    "sideWorkReminderStyleInput", "sideWorkSnoozeInput", "sideWorkMaxFocusInput",
    "checkBackEnabledToggle", "checkBackSmartToggle", "checkBackChimeToggle",
    "checkBackPulseToggle", "firstCheckInput", "refillCheckInput", "secondCheckInput",
    "dessertSuggestInput", "quickDrinkDeliveryToggle", "skipDrinkDeliveryConfirmToggle",
    "orderReminderAfterDrinksToggle", "orderReminderAfterDrinksInput"
  ].forEach((id) => {
    els[id] = document.getElementById(id);
  });
}

function showLoading(message) {
  els.loadingMessage.textContent = message;
}

function fadeInApp() {
  els.authScreen.classList.add("hidden");
  els.appShell.classList.remove("hidden");
  els.loadingScreen.classList.add("fade-out");
  window.setTimeout(() => els.loadingScreen.remove(), 350);
}

function fadeInAuth() {
  els.appShell.classList.add("hidden");
  els.authScreen.classList.remove("hidden");
  renderAuth();
  els.loadingScreen.classList.add("fade-out");
  window.setTimeout(() => els.loadingScreen.remove(), 350);
}

// Storage
function initLocalDatabase() {
  if (!("indexedDB" in window)) {
    state.storage.idbAvailable = false;
    state.storage.fallback = true;
    return Promise.resolve(null);
  }
  idbReady = new Promise((resolve) => {
    const request = indexedDB.open(IDB_NAME, IDB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      IDB_STORES.forEach((store) => {
        if (!db.objectStoreNames.contains(store)) db.createObjectStore(store, { keyPath: "id" });
      });
    };
    request.onsuccess = () => {
      state.storage.idbAvailable = true;
      state.storage.fallback = false;
      resolve(request.result);
    };
    request.onerror = () => {
      state.storage.idbAvailable = false;
      state.storage.fallback = true;
      resolve(null);
    };
  });
  return idbReady;
}

async function idbPut(store, value) {
  const db = await idbReady;
  if (!db || !value?.id || !db.objectStoreNames.contains(store)) return false;
  return new Promise((resolve) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(value);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => resolve(false);
  });
}

async function idbGet(store, id) {
  const db = await idbReady;
  if (!db || !db.objectStoreNames.contains(store)) return null;
  return new Promise((resolve) => {
    const tx = db.transaction(store, "readonly");
    const request = tx.objectStore(store).get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => resolve(null);
  });
}

async function idbGetAll(store) {
  const db = await idbReady;
  if (!db || !db.objectStoreNames.contains(store)) return [];
  return new Promise((resolve) => {
    const tx = db.transaction(store, "readonly");
    const request = tx.objectStore(store).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => resolve([]);
  });
}

async function idbClear(store) {
  const db = await idbReady;
  if (!db || !db.objectStoreNames.contains(store)) return false;
  return new Promise((resolve) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).clear();
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => resolve(false);
  });
}

async function loadStateSafely() {
  const defaults = createDefaults();
  const userData = state.activeUser ? safeRead(`${USER_DATA_PREFIX}${state.activeUser.id}`, null, false) : null;
  const session = safeRead(STORAGE_KEYS.activeSession, null, false) || safeRead("tableflow.activeSession", null, false);
  const activeStore = safeRead(STORAGE_KEYS.activeStore, null, false);
  const idbSnapshot = session?.currentShiftId ? await idbGet("shifts", session.currentShiftId) : null;
  const idbRestaurant = activeStore?.id ? await idbGet("restaurants", activeStore.id) : null;
  const restaurantData = idbRestaurant?.restaurantData || userData?.restaurantData || null;
  const loaded = restaurantData ? restaurantDataToAppState(restaurantData, defaults) : {
    layoutConfig: safeRead(STORAGE_KEYS.layoutConfig, defaults.layoutConfig),
    menuConfig: safeRead(STORAGE_KEYS.menuConfig, defaults.menuConfig),
    settings: safeRead(STORAGE_KEYS.settings, defaults.settings),
    currentShift: idbSnapshot?.currentShift || safeRead(STORAGE_KEYS.currentShift, defaults.currentShift),
    analytics: { events: await idbGetAll("analyticsEvents") || safeRead(STORAGE_KEYS.analytics, defaults.analytics).events || [] },
    profile: safeRead(STORAGE_KEYS.profile, defaults.profile),
    messages: await idbGetAll("messages") || safeRead(STORAGE_KEYS.messages, defaults.messages)
  };
  state.restaurantData = restaurantData;

  if (state.recoveryMessage) {
    showLoading("Recovering saved shift...");
    const backup = safeRead(STORAGE_KEYS.backup, null, false);
    if (backup) {
      Object.assign(loaded, normalizeAll(backup, defaults));
      state.recoveryMessage = "Recovered from backup because saved data was damaged.";
    } else {
      state.recoveryMessage = "Saved data was damaged, so demo defaults were loaded.";
    }
  }

  Object.assign(state, normalizeAll(loaded, defaults));
  const storedLogo = await idbGet("logoAssets", "store-logo");
  if (storedLogo?.dataUrl) {
    state.settings.branding.logoDataUrl = storedLogo.dataUrl;
    state.settings.branding.logoKey = "store-logo";
  }
  if (state.activeUser) {
    state.profile.loggedIn = true;
    state.profile.name = state.activeUser.name;
    state.profile.employeeId = state.activeUser.employeeId || state.activeUser.email;
    state.profile.role = state.activeUser.role || state.profile.role;
  }
  saveAll(false);
}

function loadAuthState() {
  state.users = safeRead(STORAGE_KEYS.users, [], false) || [];
  ensureDeveloperOwnerAccount();
  state.restaurants = safeRead(STORAGE_KEYS.restaurants, [], false) || [];
  const session = safeRead(STORAGE_KEYS.activeSession, null, false) || safeRead("tableflow.activeSession", null, false);
  state.activeUser = session?.userId ? state.users.find((user) => user.id === session.userId) || null : null;
}

function ensureDeveloperOwnerAccount() {
  const now = Date.now();
  const existing = state.users.find((user) => String(user.email || "").toLowerCase() === DEV_OWNER_EMAIL);
  const owner = {
    id: existing?.id || "user-local-owner-iraz",
    name: existing?.name || "Iraz",
    email: DEV_OWNER_EMAIL,
    passwordHash: hashPin(DEV_OWNER_PASSWORD),
    role: "General Manager",
    employeeId: existing?.employeeId || "0506",
    verified: true,
    devSeed: true,
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };
  state.users = existing
    ? state.users.map((user) => user.id === existing.id ? { ...user, ...owner } : user)
    : [...state.users, owner];
  safeWrite(STORAGE_KEYS.users, state.users);
  safeWrite(`${USER_DATA_PREFIX}${owner.id}`, {
    userId: owner.id,
    profile: { name: owner.name, email: owner.email, role: owner.role, employeeId: owner.employeeId },
    updatedAt: now
  });
}

function safeRead(key, fallback, recordRecovery = true) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : clone(fallback);
  } catch (error) {
    if (recordRecovery) {
      state.recoveryMessage = `Could not read ${key}.`;
    }
    return clone(fallback);
  }
}

function safeWrite(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    const now = Date.now();
    if (now - storageWarningShownAt > 120000) {
      storageWarningShownAt = now;
      toast("Device storage is almost full. Open Settings > Data & Storage for cleanup.", "danger");
    }
    return false;
  }
}

function saveAll(markClean = true) {
  if (!state.settings.autosave && markClean !== true) return;
  persistLargeData();
  safeWrite(STORAGE_KEYS.settings, compactSettingsForLocalStorage());
  safeWrite(STORAGE_KEYS.theme, { mode: state.settings.theme, preset: state.settings.branding?.preset || "dennys" });
  safeWrite(STORAGE_KEYS.storageVersion, { version: APP_VERSION, schema: IDB_VERSION, updatedAt: Date.now() });
  safeWrite(STORAGE_KEYS.profile, compactProfileForLocalStorage());
  safeWrite(STORAGE_KEYS.activeStore, state.restaurantData ? { id: state.restaurantData.id, name: state.restaurantData.restaurantName, storeNumber: state.restaurantData.storeNumber || "" } : null);
  if (state.activeUser) {
    state.restaurantData = buildRestaurantData();
    safeWrite(STORAGE_KEYS.activeSession, { userId: state.activeUser.id, restaurantId: state.restaurantData.id, currentShiftId: state.currentShift.id, signedInAt: Date.now() });
  }
  if (markClean) state.dirty = false;
  updateStorageStatus();
  queueCloudSync("save");
}

function compactSettingsForLocalStorage() {
  const { branding = {}, developer = {}, navigation = {}, notificationSettings = {}, sideWork = {}, checkBack = {}, serviceWorkflow = {}, sync = {} } = state.settings || {};
  const { logoDataUrl, ...brandingWithoutLogo } = branding;
  return {
    theme: state.settings.theme,
    autosave: state.settings.autosave,
    notifications: state.settings.notifications,
    chime: state.settings.chime,
    chimeVolume: state.settings.chimeVolume,
    snap: state.settings.snap,
    showGrid: state.settings.showGrid,
    pinEnabled: state.settings.pinEnabled,
    pinRequireOpen: state.settings.pinRequireOpen,
    pinRequireAdmin: state.settings.pinRequireAdmin,
    pinHash: state.settings.pinHash,
    branding: { ...brandingWithoutLogo, logoKey: branding.logoKey || (logoDataUrl ? "store-logo" : "") },
    developer,
    navigation,
    notificationSettings,
    sideWork,
    checkBack,
    serviceWorkflow,
    sync
  };
}

function compactProfileForLocalStorage() {
  return {
    loggedIn: state.profile.loggedIn,
    name: state.profile.name,
    employeeId: state.profile.employeeId,
    role: state.profile.role,
    station: state.profile.station,
    assignedTableIds: state.profile.assignedTableIds,
    shiftStart: state.profile.shiftStart,
    workSchedule: state.profile.workSchedule
  };
}

function persistLargeData() {
  if (state.storage.idbAvailable) {
    idbPut("shifts", { id: state.currentShift.id, currentShift: state.currentShift, updatedAt: Date.now() });
    idbPut("restaurants", { id: state.restaurantData?.id || "local-store", restaurantData: buildRestaurantData(), updatedAt: Date.now() });
    if (state.settings.branding?.logoDataUrl) idbPut("logoAssets", { id: "store-logo", dataUrl: state.settings.branding.logoDataUrl, updatedAt: Date.now() });
    state.messages.forEach((message) => idbPut("messages", message));
    state.analytics.events.forEach((event) => idbPut("analyticsEvents", { id: event.id || makeId("event"), ...event }));
  } else {
    safeWrite(STORAGE_KEYS.currentShift, keepCurrentShiftOnly(state.currentShift));
    safeWrite(STORAGE_KEYS.messages, state.messages.slice(0, 40));
    safeWrite(STORAGE_KEYS.analytics, { events: state.analytics.events.slice(-150) });
  }
}

function queueSyncChange(type, detail = {}) {
  if (!state.currentShift?.syncState) return;
  state.currentShift.syncState.pendingChanges = state.currentShift.syncState.pendingChanges || [];
  state.currentShift.syncState.pendingChanges.push({
    id: makeId("change"),
    type,
    detail,
    deviceId: state.currentShift.syncState.deviceId,
    userId: state.activeUser?.id || state.currentShift.userId || "local-user",
    restaurantId: state.restaurantData?.id || state.currentShift.restaurantId || "local-store",
    createdAt: Date.now()
  });
  state.currentShift.syncState.pendingChanges = state.currentShift.syncState.pendingChanges.slice(-100);
}

function cloudSyncConfigured() {
  return Boolean(state.settings?.sync?.enabled && state.settings.sync.endpoint);
}

function setupCloudSyncTimer() {
  if (state.syncTimer) window.clearInterval(state.syncTimer);
  const seconds = Math.max(5, Number(state.settings?.sync?.intervalSeconds || 15));
  state.syncTimer = window.setInterval(() => queueCloudSync("timer"), seconds * 1000);
}

function queueCloudSync(reason = "manual") {
  if (!cloudSyncConfigured()) return;
  state.syncQueued = true;
  window.clearTimeout(state.cloudSyncDebounce);
  state.cloudSyncDebounce = window.setTimeout(() => runCloudSync(reason), 900);
}

async function runCloudSync(reason = "manual") {
  if (!cloudSyncConfigured() || state.syncInFlight) return;
  state.syncInFlight = true;
  state.syncQueued = false;
  state.settings.sync.status = "syncing";
  try {
    await pullCloudSync(false);
    await pushCloudSync(false);
    state.settings.sync.status = "online";
    state.settings.sync.lastSyncReason = reason;
    state.settings.sync.lastError = "";
  } catch (error) {
    state.settings.sync.status = "error";
    state.settings.sync.lastError = error.message || "Cloud sync failed.";
    toast("Cloud sync could not reach the online store.", "danger");
  } finally {
    state.syncInFlight = false;
    renderSettingsSurface();
  }
}

function cloudSyncHeaders() {
  const headers = { "Content-Type": "application/json" };
  if (state.settings.sync.apiKey) headers.Authorization = `Bearer ${state.settings.sync.apiKey}`;
  return headers;
}

function buildCloudSyncPayload() {
  return {
    version: APP_VERSION,
    syncVersion: Date.now(),
    storeId: state.restaurantData?.id || "local-store",
    deviceId: state.currentShift.syncState?.deviceId || "local-device",
    updatedAt: Date.now(),
    restaurantData: buildRestaurantData(),
    currentShift: state.currentShift,
    activeTables: state.currentShift.tables,
    messages: state.messages,
    alerts: state.currentShift.alerts,
    analyticsEvents: state.analytics.events.slice(-500),
    activityFeed: state.currentShift.activityFeed || []
  };
}

async function pushCloudSync(showToast = true) {
  if (!cloudSyncConfigured()) return false;
  const response = await fetch(state.settings.sync.endpoint, {
    method: state.settings.sync.method || "PUT",
    headers: cloudSyncHeaders(),
    body: JSON.stringify(buildCloudSyncPayload())
  });
  if (!response.ok) throw new Error(`Push failed (${response.status})`);
  state.currentShift.syncState.pendingChanges = [];
  state.currentShift.syncState.lastSync = Date.now();
  state.settings.sync.lastPush = Date.now();
  if (showToast) toast("Pushed service state online.");
  return true;
}

async function pullCloudSync(showToast = true) {
  if (!cloudSyncConfigured()) return false;
  const response = await fetch(state.settings.sync.endpoint, { method: "GET", headers: cloudSyncHeaders() });
  if (response.status === 404 || response.status === 204) return false;
  if (!response.ok) throw new Error(`Pull failed (${response.status})`);
  const payload = await response.json();
  applyCloudSyncPayload(payload);
  state.settings.sync.lastPull = Date.now();
  state.currentShift.syncState.lastSync = Date.now();
  if (showToast) toast("Pulled online service state.");
  return true;
}

function applyCloudSyncPayload(payload) {
  if (!payload || typeof payload !== "object") return;
  const incomingShift = payload.currentShift || payload.shift;
  if (incomingShift?.id && incomingShift.id !== state.currentShift.id) {
    state.currentShift = normalizeAll({ ...state, currentShift: incomingShift }, createDefaults()).currentShift;
  } else if (incomingShift) {
    state.currentShift = mergeCurrentShift(state.currentShift, incomingShift);
  } else if (payload.activeTables) {
    state.currentShift = mergeCurrentShift(state.currentShift, { ...state.currentShift, tables: payload.activeTables });
  }
  if (payload.messages) state.messages = mergeByUpdatedAt(state.messages, payload.messages);
  if (payload.analyticsEvents) state.analytics.events = mergeByUpdatedAt(state.analytics.events, payload.analyticsEvents).slice(-800);
  if (payload.restaurantData && !state.restaurantData) state.restaurantData = payload.restaurantData;
}

function mergeCurrentShift(localShift, remoteShift) {
  const merged = { ...localShift, ...remoteShift };
  merged.tables = { ...(localShift.tables || {}) };
  Object.entries(remoteShift.tables || {}).forEach(([tableId, remoteTable]) => {
    const localTable = merged.tables[tableId] || {};
    const localTime = Number(localTable.updatedAt || localTable.timestamps?.seated || 0);
    const remoteTime = Number(remoteTable.updatedAt || remoteTable.timestamps?.seated || 0);
    merged.tables[tableId] = remoteTime >= localTime ? { ...localTable, ...remoteTable } : localTable;
  });
  merged.alerts = mergeByUpdatedAt(localShift.alerts || [], remoteShift.alerts || []);
  merged.seatingRecords = mergeByUpdatedAt(localShift.seatingRecords || [], remoteShift.seatingRecords || []);
  merged.shiftSummaries = mergeByUpdatedAt(localShift.shiftSummaries || [], remoteShift.shiftSummaries || []);
  merged.activityFeed = mergeByUpdatedAt(localShift.activityFeed || [], remoteShift.activityFeed || []);
  merged.syncState = { ...(localShift.syncState || {}), ...(remoteShift.syncState || {}), pendingChanges: localShift.syncState?.pendingChanges || [] };
  return merged;
}

function mergeByUpdatedAt(localList = [], remoteList = []) {
  const map = new Map();
  [...localList, ...remoteList].forEach((item) => {
    if (!item) return;
    const id = item.id || `${item.type || "item"}-${item.createdAt || item.timestamp || Math.random()}`;
    const existing = map.get(id);
    const nextTime = Number(item.updatedAt || item.createdAt || item.timestamp || 0);
    const existingTime = Number(existing?.updatedAt || existing?.createdAt || existing?.timestamp || 0);
    if (!existing || nextTime >= existingTime) map.set(id, { ...item, id });
  });
  return Array.from(map.values()).sort((a, b) => Number(b.updatedAt || b.createdAt || b.timestamp || 0) - Number(a.updatedAt || a.createdAt || a.timestamp || 0));
}

function keepCurrentShiftOnly(shift) {
  return {
    ...shift,
    alerts: (shift.alerts || []).slice(0, 80),
    tables: Object.fromEntries(Object.entries(shift.tables || {}).filter(([, table]) => table.partySize || table.orders?.length || table.posQueue?.length))
  };
}

function markDirty() {
  state.dirty = true;
  queueSyncChange("state_changed");
  if (state.settings.autosave) saveAll(true);
}

window.addEventListener("beforeunload", (event) => {
  if (state.dirty) {
    event.preventDefault();
    event.returnValue = "You have unsaved TableFlow changes.";
  }
});

function createDefaults() {
  // Use exported layout config if available, otherwise fall back to legacy inline config
  const layoutConfig = window.TableFlowLayoutConfig?.layoutConfig || {
    restaurantName: "Denny's Store Default",
    objects: [
      obj("table-1", "Table 1", "table", 70, 60, 130, 82, "booth-4", 4, "server-1"),
      obj("table-2", "Table 2", "table", 230, 60, 130, 82, "booth-4", 4, "server-1"),
      obj("table-3", "Table 3", "table", 420, 60, 96, 96, "square-table", 4, "server-1"),
      obj("table-4", "Table 4", "table", 590, 50, 112, 112, "round-booth-5", 5, "server-1"),
      obj("table-5", "Table 5", "table", 70, 215, 126, 86, "half-booth", 4, "server-2"),
      obj("table-6", "Table 6", "table", 250, 210, 116, 104, "corner-booth", 4, "server-2"),
      obj("table-7", "Table 7", "table", 440, 225, 96, 96, "square-table", 4, "server-2"),
      obj("table-8", "Table 8", "table", 585, 225, 96, 96, "square-table", 4, "server-2"),
      obj("table-9", "Table 9", "table", 740, 225, 104, 76, "booth-2", 2, "server-2"),
      obj("table-10", "Table 10", "table", 110, 395, 96, 96, "square-table", 4, "server-1"),
      obj("table-11", "Table 11", "table", 260, 395, 96, 96, "square-table", 4, "server-1"),
      obj("bar-1", "Bar 1", "table", 780, 52, 54, 54, "bar-seat", 1, "server-2"),
      obj("dessert-station", "Dessert Station", "station", 48, 545, 150, 76, "dessert-station", 0, null, "dessert-station", ["milkshakes", "desserts"]),
      obj("sauce-station", "Sauce Station", "station", 230, 545, 128, 72, "sauce-station", 0, null, "sauce-station", ["sauces"]),
      obj("drink-station", "Drink Station", "station", 395, 545, 130, 72, "drink-station", 0, null, "drink-station", ["drinks"]),
      obj("server-alley", "Server Alley", "station", 570, 540, 190, 70, "server-alley", 0, null, "server-1", [])
    ],
    stations: [
      { id: "server-1", name: "Station 1", type: "server", assignedTables: ["table-1", "table-2", "table-3", "table-4", "table-10", "table-11"], capabilities: [] },
      { id: "server-2", name: "Station 2", type: "server", assignedTables: ["table-5", "table-6", "table-7", "table-8", "table-9", "bar-1"], capabilities: [] },
      { id: "dessert-station", name: "Dessert Station", type: "prep", assignedTables: [], capabilities: ["milkshakes", "desserts"] },
      { id: "sauce-station", name: "Sauce Station", type: "prep", assignedTables: [], capabilities: ["sauces"] },
      { id: "drink-station", name: "Drink Station", type: "prep", assignedTables: [], capabilities: ["drinks"] }
    ]
  };
  const menuConfig = clone(window.TableFlowMenuConfig);
  const currentShift = {
    id: makeId("shift"),
    startedAt: Date.now(),
    tables: Object.fromEntries(layoutConfig.objects.filter((o) => o.category === "table").map((table) => [table.id, defaultTableState(table)])),
    alerts: [],
    sideWork: {
      taskTemplates: defaultSideWorkTemplates(),
      taskInstances: [],
      scheduleSettings: {},
      reminderSettings: {}
    },
    shiftSummaries: [],
    seatingRecords: [],
    activityFeed: [],
    syncState: { pendingChanges: [], lastSync: null, deviceId: makeId("device"), userId: null, restaurantId: null },
    isClockedIn: false,
    clockInAt: null,
    clockOutAt: null,
    assignedTableIds: [],
    role: "Server",
    sectionId: "server-1",
    tipsEarned: 0,
    notes: ""
  };
  return {
    layoutConfig,
    menuConfig,
    settings: {
      theme: "dark",
      notifications: true,
      chime: true,
      chimeVolume: 0.35,
      autosave: true,
      snap: true,
      showGrid: true,
      notificationSettings: {
        inAppAlerts: true,
        pushNotifications: false,
        voiceNotifications: false,
        voiceMode: "brief",
        cooldownMs: 60000
      },
      pinEnabled: false,
      pinRequireOpen: false,
      pinRequireAdmin: false,
      pinHash: "",
      branding: defaultBranding(),
      sideWork: { remindersEnabled: true, chimeEnabled: true, reminderStyle: "gentle", snoozeDefaultMinutes: 15, maxFocusTasks: 3 },
      checkBack: { enabled: true, firstCheckMinutes: 2, refillCheckMinutes: 8, secondCheckMinutes: 15, dessertSuggestMinutes: 25, useSmartTiming: true, chimeEnabled: true, pulseTable: true },
      serviceWorkflow: { quickDrinkDelivery: true, skipDrinkDeliveryConfirm: false, orderReminderAfterDrinks: true, orderReminderAfterDrinksMinutes: 4 },
      sync: { enabled: false, endpoint: "", apiKey: "", intervalSeconds: 15, lastPush: null, lastPull: null, lastError: "", status: "offline" },
      developer: { enabled: false, showTesterToggle: false, debugLogs: false, preview: "full" },
      navigation: { compact: false }
    },
    currentShift,
    analytics: { events: [] },
    profile: {
      loggedIn: false,
      name: "",
      employeeId: "",
      role: "Server",
      station: "Station 1",
      serverRank: "Server",
      assignedTableIds: ["table-1", "table-2", "table-3", "table-4", "table-10", "table-11"],
      color: "#ff6a21",
      shiftStart: null,
      workSchedule: {
        userId: "local-user",
        days: ["Friday", "Saturday", "Sunday"],
        shiftStart: "22:00",
        shiftEnd: "07:00",
        role: "Server",
        defaultStationId: "server-1",
        reminderStyle: "gentle",
        remindersEnabled: true,
        breakTimes: []
      }
    },
    messages: []
  };
}

function defaultBranding() {
  return {
      restaurantName: "Denny's Store",
    storeNumber: "",
    appDisplayName: "TableFlow",
    logoDataUrl: "",
    primaryColor: THEME_PRESETS.default.primary,
    secondaryColor: THEME_PRESETS.default.secondary,
    accentColor: THEME_PRESETS.default.accent,
    backgroundColor: THEME_PRESETS.default.bg,
    cardColor: THEME_PRESETS.default.card,
    buttonStyle: "rounded",
    useLogoOnGuestCheck: true,
    useLogoOnLogin: true,
      preset: "dennys",
      logoKey: "dennys-repo-logo",
      logoAssetPath: "data/dennys_logo.png"
  };
}

function defaultSideWorkTemplates() {
  return [
    sideTask("task-ice-cream-level", "Check ice cream level", "Make sure the ice cream area has enough product for shakes and desserts.", "dessert-station", "Station 1 Dessert / Ice Cream", "Server", "relative", 45, 30, "medium", "once", 4, true, "Dessert / Ice Cream"),
    sideTask("task-dessert-sauces", "Restock dessert sauces", "Check chocolate, caramel, strawberry, and other dessert sauces.", "dessert-station", "Station 1 Dessert / Ice Cream", "Server", "relative", 60, 30, "medium", "once", 5, true, "Dessert / Ice Cream"),
    sideTask("task-whipped-cream", "Restock whipped cream", "Check whipped cream, cherries, and dessert toppings if used.", "dessert-station", "Station 1 Dessert / Ice Cream", "Server", "repeating", 120, 25, "low", "repeating", 4, false, "Dessert / Ice Cream"),
    sideTask("task-shake-area", "Check shake mixer area", "Wipe splash spots and make sure cups/lids are nearby.", "dessert-station", "Station 1 Dessert / Ice Cream", "Server", "repeating", 120, 25, "medium", "repeating", 5, false, "Dessert / Ice Cream"),
    sideTask("task-roll-silverware", "Roll silverware", "Do a small batch so closing is easier later.", "server-1", "Station 1", "Server", "shift_middle", 0, 45, "medium", "once", 10, true, "Silverware"),
    sideTask("task-restock-napkins", "Refill napkins in Station 1", "Top off napkins where servers grab them during a rush.", "server-1", "Station 1", "Server", "relative", 75, 30, "medium", "once", 5, true, "Station Restock"),
    sideTask("task-straws", "Refill straws", "Small restock reminder: straws and lids.", "server-1", "Station 1", "Server", "repeating", 120, 30, "low", "repeating", 4, false, "Beverage Area"),
    sideTask("task-coffee", "Check coffee station", "Coffee, sugars, sweeteners, and stirrers.", "drink-station", "Drink Station", "Server", "pre_rush", 0, 40, "medium", "once", 6, true, "Beverage Area"),
    sideTask("task-bus-tubs", "Check bus tubs", "Empty or swap bus tubs when there is a clear chance.", "server-alley", "Server Alley", "Server", "repeating", 90, 25, "medium", "repeating", 4, false, "Cleaning"),
    sideTask("task-prebus", "Pre-bus section when possible", "Clear safe items from tables when guests are done with them.", "server-1", "Station 1", "Server", "post_rush", 0, 45, "medium", "once", 8, false, "Running Side Work"),
    sideTask("task-closing-reset", "Restock section for next shift", "Final reset: napkins, straws, sauces, and station basics.", "server-1", "Station 1", "Server", "before_shift_end", 60, 45, "high", "once", 12, true, "Closing Side Work"),
    sideTask("task-closing-clean", "Wipe station", "Wipe counters, server alley touches, and assigned station surfaces.", "server-1", "Station 1", "Server", "before_shift_end", 30, 30, "high", "once", 10, true, "Closing Side Work")
  ];
}

function sideTask(id, title, description, stationId, stationName, role, timingType, timingOffsetMinutes, dueWindowMinutes, priority, repeat, estimatedMinutes, required, category) {
  return { id, title, description, stationId, stationName, role, timingType, timingOffsetMinutes, dueWindowMinutes, priority, repeat, estimatedMinutes, required, category, active: true };
}

function obj(id, name, category, x, y, width, height, type, seats, stationId, prepStationId = null, capabilities = []) {
  return { id, name, category, x, y, width, height, rotation: 0, type, seats, stationId, prepStationId, capabilities, locked: false, notes: "" };
}

function defaultTableState(table) {
  return {
    tableId: table.id,
    partySize: 0,
    selectedSeat: null,
    status: "Open",
    orders: [],
    posQueue: [],
    timestamps: {},
    checkBack: { deliveredAt: null, reminders: [] },
    checkNumber: table.id.replace(/\D/g, "").padStart(3, "0") || "001"
  };
}

function normalizeAll(data, defaults) {
  const layoutConfig = normalizeLayoutConfig(data.layoutConfig || defaults.layoutConfig);
  const menuConfig = normalizeMenuConfig(mergeMenuConfigs(defaults.menuConfig, data.menuConfig));
  const settings = {
    ...defaults.settings,
    ...(data.settings || {}),
    branding: { ...defaults.settings.branding, ...(data.settings?.branding || {}) },
    sideWork: { ...defaults.settings.sideWork, ...(data.settings?.sideWork || {}) },
    checkBack: { ...defaults.settings.checkBack, ...(data.settings?.checkBack || {}) },
    serviceWorkflow: { ...defaults.settings.serviceWorkflow, ...(data.settings?.serviceWorkflow || {}) },
    developer: { ...defaults.settings.developer, ...(data.settings?.developer || {}) },
    notificationSettings: { ...defaults.settings.notificationSettings, ...(data.settings?.notificationSettings || {}) },
    sync: { ...defaults.settings.sync, ...(data.settings?.sync || {}) },
    navigation: { ...defaults.settings.navigation, ...(data.settings?.navigation || {}) }
  };
  const profile = {
    ...defaults.profile,
    ...(data.profile || {}),
    workSchedule: { ...defaults.profile.workSchedule, ...(data.profile?.workSchedule || {}) },
    assignedTableIds: Array.isArray(data.profile?.assignedTableIds) ? data.profile.assignedTableIds : defaults.profile.assignedTableIds,
    serverRank: data.profile?.serverRank || defaults.profile.serverRank || "Server"
  };
  const currentShift = data.currentShift || defaults.currentShift;
  currentShift.tables = currentShift.tables || {};
  layoutConfig.objects.filter((o) => o.category === "table").forEach((table) => {
    currentShift.tables[table.id] = normalizeTableState(currentShift.tables[table.id], table);
  });
  currentShift.alerts = Array.isArray(currentShift.alerts) ? currentShift.alerts : [];
  currentShift.shiftSummaries = Array.isArray(currentShift.shiftSummaries) ? currentShift.shiftSummaries : [];
  currentShift.seatingRecords = Array.isArray(currentShift.seatingRecords) ? currentShift.seatingRecords : [];
  currentShift.activityFeed = Array.isArray(currentShift.activityFeed) ? currentShift.activityFeed : [];
  currentShift.syncState = currentShift.syncState || { pendingChanges: [], lastSync: null, deviceId: makeId("device"), userId: state.activeUser?.id || null, restaurantId: state.restaurantData?.id || null };
  currentShift.isClockedIn = Boolean(currentShift.isClockedIn);
  currentShift.assignedTableIds = Array.isArray(currentShift.assignedTableIds) ? currentShift.assignedTableIds : [];
  currentShift.role = currentShift.role || profile.role || "Server";
  currentShift.sectionId = currentShift.sectionId || profile.workSchedule?.defaultStationId || "server-1";
  currentShift.sideWork = normalizeSideWork(currentShift.sideWork, defaults.currentShift.sideWork);
  ensureSideWorkInstances(currentShift.sideWork, profile.workSchedule || defaults.profile.workSchedule);
  const analytics = { events: Array.isArray(data.analytics?.events) ? data.analytics.events : [] };
  const messages = Array.isArray(data.messages) ? data.messages : [];
  return { layoutConfig, menuConfig, settings, currentShift, analytics, profile, messages };
}

function normalizeLayoutConfig(layoutConfig) {
  layoutConfig.floorSize = layoutConfig.floorSize || { width: 1100, height: 760 };
  layoutConfig.gridSize = layoutConfig.gridSize || GRID;
  layoutConfig.snapEnabled = layoutConfig.snapEnabled ?? true;
  layoutConfig.objects = (layoutConfig.objects || []).map((object) => ({
    restaurantId: state.restaurantData?.id || "local-restaurant",
    number: object.number || String(object.name || "").match(/\d+/)?.[0] || "",
    shape: object.shape || inferObjectShape(object),
    maxTempSeats: object.maxTempSeats ?? object.seats ?? 0,
    color: object.color || "",
    createdAt: object.createdAt || Date.now(),
    updatedAt: object.updatedAt || Date.now(),
    createdBy: object.createdBy || state.activeUser?.id || "local",
    ...object
  }));
  layoutConfig.stations = Array.isArray(layoutConfig.stations) ? layoutConfig.stations : [];
  layoutConfig.labels = Array.isArray(layoutConfig.labels) ? layoutConfig.labels : [];
  return layoutConfig;
}

function inferObjectShape(object) {
  if (object.type?.includes("round") || object.type?.includes("circle") || object.type === "bar-seat") return "circle";
  if (object.type?.includes("booth")) return "booth";
  if (object.type?.includes("bar")) return "bar";
  if (object.category === "label") return "label";
  return object.width === object.height ? "square" : "rectangle";
}

function normalizeTableState(existing, table) {
  const base = defaultTableState(table);
  const merged = { ...base, ...(existing || {}) };
  merged.selectedSeat = merged.selectedSeat ? Math.max(1, Number(merged.selectedSeat) || 1) : null;
  merged.orders = Array.isArray(merged.orders) ? merged.orders.map(normalizeSeatTrackedItem) : [];
  merged.posQueue = Array.isArray(merged.posQueue) ? merged.posQueue.map(normalizeSeatTrackedItem) : [];
  merged.timestamps = merged.timestamps || {};
  merged.checkBack = normalizeCheckBack(merged.checkBack);
  merged.reminders = Array.isArray(merged.reminders) ? merged.reminders.map(normalizeTableReminder).filter(Boolean) : [];
  return merged;
}

function normalizeSeatTrackedItem(item) {
  return {
    ...item,
    seatNumber: Math.max(1, Number(item.seatNumber) || 1)
  };
}

function normalizeTableReminder(reminder) {
  if (!reminder?.id) return null;
  return {
    id: reminder.id,
    type: reminder.type || "table_reminder",
    message: reminder.message || "Table reminder",
    dueAt: Number(reminder.dueAt) || Date.now(),
    status: reminder.status || "scheduled",
    createdAt: Number(reminder.createdAt) || Date.now(),
    alertedAt: Number(reminder.alertedAt) || null,
    completedAt: Number(reminder.completedAt) || null,
    snoozedUntil: Number(reminder.snoozedUntil) || null
  };
}

function normalizeCheckBack(checkBack) {
  return {
    deliveredAt: Number(checkBack?.deliveredAt) || null,
    reminders: Array.isArray(checkBack?.reminders) ? checkBack.reminders.map((reminder) => ({
      id: reminder.id || makeId("checkback"),
      type: reminder.type || "first_check_back",
      dueAt: Number(reminder.dueAt) || Date.now(),
      status: reminder.status || "scheduled",
      alertedAt: Number(reminder.alertedAt) || null,
      completedAt: Number(reminder.completedAt) || null,
      snoozedUntil: Number(reminder.snoozedUntil) || null
    })) : []
  };
}

function normalizeSideWork(sideWork, defaults) {
  return {
    taskTemplates: Array.isArray(sideWork?.taskTemplates) ? sideWork.taskTemplates.map(normalizeSideWorkTemplate).filter(Boolean) : clone(defaults.taskTemplates),
    taskInstances: Array.isArray(sideWork?.taskInstances) ? sideWork.taskInstances.map(normalizeSideWorkInstance).filter(Boolean) : [],
    scheduleSettings: sideWork?.scheduleSettings || {},
    reminderSettings: sideWork?.reminderSettings || {}
  };
}

function normalizeSideWorkTemplate(task) {
  if (!task?.id || !task?.title) return null;
  return {
    id: task.id,
    title: task.title,
    description: task.description || "",
    stationId: task.stationId || "",
    stationName: task.stationName || "Any station",
    role: task.role || "Server",
    timingType: task.timingType || "relative",
    timingOffsetMinutes: Number(task.timingOffsetMinutes) || 0,
    dueWindowMinutes: Number(task.dueWindowMinutes) || 30,
    priority: task.priority || "medium",
    repeat: task.repeat || "once",
    estimatedMinutes: Number(task.estimatedMinutes) || 5,
    required: task.required !== false,
    category: task.category || "Running Side Work",
    active: task.active !== false
  };
}

function normalizeSideWorkInstance(instance) {
  if (!instance?.id || !instance?.templateId) return null;
  return {
    id: instance.id,
    templateId: instance.templateId,
    dueAt: Number(instance.dueAt) || Date.now(),
    dueEndAt: Number(instance.dueEndAt) || Date.now() + 1800000,
    status: instance.status || "Not Started",
    startedAt: Number(instance.startedAt) || null,
    completedAt: Number(instance.completedAt) || null,
    snoozedUntil: Number(instance.snoozedUntil) || null,
    reminderShownAt: Number(instance.reminderShownAt) || null,
    note: instance.note || ""
  };
}

function normalizeMenuConfig(menuConfig) {
  const categories = mergeCategories(POS_CATEGORIES, menuConfig.categories || []);
  const items = (Array.isArray(menuConfig.items) ? menuConfig.items : []).map((item, index) => ({
    id: item.id || makeId("menu"),
    restaurantId: item.restaurantId || state.restaurantData?.id || "local-restaurant",
    createdAt: item.createdAt || Date.now(),
    updatedAt: item.updatedAt || Date.now(),
    createdBy: item.createdBy || state.activeUser?.id || "local",
    posKey: item.posKey || item.shortName || item.name || "ITEM",
    name: item.name || "Menu Item",
    shortName: item.shortName || item.name || "Item",
    category: normalizeMenuCategory(item, categories),
    subcategory: item.subcategory || "",
    price: item.price ?? null,
    requiresSeat: item.requiresSeat !== false,
    canBeTableShare: false,
    requiresPrepStation: Boolean(item.requiresPrepStation),
    prepCapability: item.prepCapability || "",
    prepStationId: item.prepStationId || "",
    modifiers: Array.isArray(item.modifiers) ? item.modifiers : String(item.modifiers || "").split("|").filter(Boolean),
    active: item.active !== false,
    orderable: item.orderable !== false && item.category !== "MODS",
    sortOrder: Number(item.sortOrder) || index + 1
  }));
  return {
    categories,
    items: dedupeMenuItems(items)
  };
}

function mergeMenuConfigs(defaultMenu, savedMenu) {
  const baseItems = Array.isArray(defaultMenu?.items) ? defaultMenu.items : [];
  const savedItems = Array.isArray(savedMenu?.items) ? savedMenu.items : [];
  const byId = new Map();
  baseItems.forEach((item) => byId.set(item.id, clone(item)));
  savedItems.forEach((item) => {
    if (!item?.id) return;
    byId.set(item.id, { ...(byId.get(item.id) || {}), ...item });
  });
  return {
    ...clone(defaultMenu || {}),
    ...(savedMenu || {}),
    version: defaultMenu?.version || savedMenu?.version || "menu",
    label: defaultMenu?.label || savedMenu?.label || "Diner-style demo menu.",
    categories: mergeCategories(defaultMenu?.categories || POS_CATEGORIES, savedMenu?.categories || []),
    items: Array.from(byId.values())
  };
}

function mergeCategories(primary = [], secondary = []) {
  const preferredOrder = [
    "STARTER", "BEV", "APPT", "SIDES", "SOUP/SAL", "ENTREE", "BREAKFAST", "SLAMS",
    "OMELETTES", "SKILLETS", "PANCAKES", "BURGERS", "SANDWICHES", "DINNERS",
    "VEG/POT", "DESSERT", "KIDS", "MODS"
  ];
  const set = new Set([...primary, ...secondary].filter(Boolean));
  return [
    ...preferredOrder.filter((category) => set.has(category)),
    ...Array.from(set).filter((category) => !preferredOrder.includes(category))
  ];
}

function normalizeMenuCategory(item, categories = POS_CATEGORIES) {
  const current = String(item.category || "").toUpperCase();
  const subcategory = String(item.subcategory || "").toLowerCase();
  const name = String(item.name || item.shortName || "").toLowerCase();
  if (name.includes("skillet") || /^skillets?$/.test(subcategory.trim())) return "SKILLETS";
  if (categories.includes(current) && current !== "ENTREE") return current;
  if (subcategory.includes("dinner")) return "DINNERS";
  if (subcategory.includes("burger")) return "BURGERS";
  if (subcategory.includes("sandwich") || subcategory.includes("melt") || subcategory.includes("handheld")) return "SANDWICHES";
  if (subcategory.includes("omelette")) return "OMELETTES";
  if (subcategory.includes("pancake") || subcategory.includes("waffle") || subcategory.includes("crepe")) return "PANCAKES";
  if (subcategory.includes("slam")) return "SLAMS";
  if (subcategory.includes("breakfast") || subcategory.includes("55+")) return "BREAKFAST";
  return categories.includes(current) ? current : "ENTREE";
}

function dedupeMenuItems(items) {
  const seenIds = new Set();
  const seenFingerprints = new Set();
  return items.filter((item) => {
    if (seenIds.has(item.id)) return false;
    const fingerprint = menuItemFingerprint(item);
    if (seenFingerprints.has(fingerprint)) return false;
    seenIds.add(item.id);
    seenFingerprints.add(fingerprint);
    return true;
  });
}

function menuItemFingerprint(item) {
  return [
    normalizeWords(item.category || ""),
    normalizeWords(item.name || item.shortName || "")
  ].join("|");
}

function normalizeWords(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

// Rendering
function renderAll() {
  const renderStart = performance.now();
  updateTime();
  applyBranding();
  renderNavigation();
  renderHome();
  renderFloor();
  renderFloorEditor();
  renderDetailPanel();
  renderMenu();
  renderMenuEditor();
  renderExpandedOrder();
  renderTableDashboard();
  renderOrders();
  renderPosQueue();
  renderStations();
  renderSideWork();
  renderMessages();
  renderAnalytics();
  renderSettings();
  renderGeneralManager();
  renderProfile();
  renderAuth();
  renderDeveloperTools();
  renderTesterPanel();
  updateStorageStatus();
  if (state.recoveryMessage) showRecovery(state.recoveryMessage);
  state.lastRenderMs = Math.round(performance.now() - renderStart);
}

// Auth and local account flow
function renderAuth() {
  if (!els.authPanel || els.authScreen.classList.contains("hidden")) return;
  applyBranding();
  const mode = state.authMode || "welcome";
  const panels = {
    welcome: `
      <h2>Welcome</h2>
      <p>Run a Denny's floor, menu, POS queue, side work, and shift data on this device.</p>
      <div class="button-row auth-actions">
        <button class="primary" data-auth-mode="signin" type="button">Sign In</button>
        <button data-auth-mode="signup" type="button">Sign Up</button>
      </div>
    `,
    signin: `
      <h2>Sign In</h2>
      <label class="field"><span>Email</span><input id="signinEmailInput" type="email" /></label>
      <label class="field"><span>Password</span><input id="signinPasswordInput" type="password" /></label>
      <button class="primary" id="signinButton" type="button">Sign In</button>
      <div class="button-row auth-actions"><button data-auth-mode="forgot" type="button">Forgot Password</button><button data-auth-mode="signup" type="button">Create Account</button></div>
    `,
    signup: `
      <h2>Create Account</h2>
      <label class="field"><span>Full Name</span><input id="signupNameInput" /></label>
      <label class="field"><span>Username</span><input id="signupUsernameInput" /></label>
      <label class="field"><span>Email</span><input id="signupEmailInput" type="email" /></label>
      <label class="field"><span>Password</span><input id="signupPasswordInput" type="password" /></label>
      <label class="field"><span>Confirm Password</span><input id="signupConfirmPasswordInput" type="password" /></label>
      <label class="field"><span>Position / Role</span><select id="signupRoleInput">${getRoleOptions("Server")}</select></label>
      <label class="field"><span>Employee ID optional</span><input id="signupEmployeeIdInput" /></label>
      <label class="field"><span>Profile picture optional</span><input id="signupProfileImageInput" type="file" accept="image/*" /></label>
      <button class="primary" id="signupButton" type="button">Create Account</button>
      <button data-auth-mode="signin" type="button">I already have an account</button>
    `,
    verify: `
      <h2>Mock Email Verification</h2>
      <p>Enter this local demo code: <strong>${escapeHtml(state.pendingVerification?.code || "")}</strong></p>
      <label class="field"><span>Verification code</span><input id="verifyCodeInput" /></label>
      <button class="primary" id="verifyButton" type="button">Verify Account</button>
    `,
    forgot: `
      <h2>Reset Password</h2>
      <label class="field"><span>Email</span><input id="resetEmailInput" type="email" /></label>
      <button class="primary" id="sendResetButton" type="button">Get Mock Reset Code</button>
      ${state.pendingPasswordReset ? `<p>Reset code: <strong>${escapeHtml(state.pendingPasswordReset.code)}</strong></p><label class="field"><span>Code</span><input id="resetCodeInput" /></label><label class="field"><span>New password</span><input id="resetPasswordInput" type="password" /></label><button id="resetPasswordButton" type="button">Save New Password</button>` : ""}
      <button data-auth-mode="signin" type="button">Back to Sign In</button>
    `,
    restaurant: `
      <h2>Denny's Store Setup</h2>
      <p>Create or join a local Denny's store team workspace. Cloud sync can plug into this data later.</p>
      <div class="button-row auth-actions"><button class="primary" data-auth-mode="createStore" type="button">Create Store</button><button data-auth-mode="joinStore" type="button">Join Store</button></div>
    `,
    createStore: `
      <h2>Create Store</h2>
      <label class="field"><span>Denny's store name</span><input id="createRestaurantNameInput" value="Denny's Store" /></label>
      <label class="field"><span>Store number</span><input id="createStoreNumberInput" /></label>
      <label class="field"><span>Address optional</span><input id="createRestaurantAddressInput" /></label>
      <label class="field"><span>Brand preset</span><select id="createRestaurantPresetInput">${Object.entries(THEME_PRESETS).map(([key, preset]) => `<option value="${key}" ${key === "dennys" ? "selected" : ""}>${escapeHtml(preset.name)}</option>`).join("")}</select></label>
      <button class="primary" id="createRestaurantButton" type="button">Create Store</button>
      <button data-auth-mode="restaurant" type="button">Back</button>
    `,
    joinStore: `
      <h2>Join Store</h2>
      <label class="field"><span>Invite code</span><input id="joinInviteCodeInput" placeholder="TF-DENNYS-2048" /></label>
      <button class="primary" id="joinStoreButton" type="button">Request Access</button>
      <button data-auth-mode="restaurant" type="button">Back</button>
    `
  };
  els.authPanel.innerHTML = panels[mode] || panels.welcome;
  els.authPanel.querySelectorAll("[data-auth-mode]").forEach((button) => button.addEventListener("click", () => { state.authMode = button.dataset.authMode; renderAuth(); }));
  document.getElementById("signinButton")?.addEventListener("click", signInLocal);
  document.getElementById("signupButton")?.addEventListener("click", signUpLocal);
  document.getElementById("verifyButton")?.addEventListener("click", verifyLocalAccount);
  document.getElementById("sendResetButton")?.addEventListener("click", startPasswordReset);
  document.getElementById("resetPasswordButton")?.addEventListener("click", finishPasswordReset);
  document.getElementById("createRestaurantButton")?.addEventListener("click", createRestaurantWorkspace);
  document.getElementById("joinStoreButton")?.addEventListener("click", joinStoreWorkspace);
}

function getRoleOptions(selected = "Server") {
  return ["General Manager", "Manager", "Supervisor", "PIC", "Server", "Host", "Dishwasher"]
    .map((role) => `<option ${role === selected ? "selected" : ""}>${role}</option>`)
    .join("");
}

function signUpLocal() {
  const name = document.getElementById("signupNameInput").value.trim();
  const username = document.getElementById("signupUsernameInput").value.trim();
  const email = document.getElementById("signupEmailInput").value.trim().toLowerCase();
  const password = document.getElementById("signupPasswordInput").value;
  const confirmPassword = document.getElementById("signupConfirmPasswordInput").value;
  const employeeId = document.getElementById("signupEmployeeIdInput").value.trim();
  if (!name || !username || !email || password.length < 4) return toast("Enter name, username, email, and a 4+ character password.", "danger");
  if (password !== confirmPassword) return toast("Passwords do not match.", "danger");
  if (state.users.some((user) => user.email === email)) return toast("That local account already exists.", "danger");
  state.pendingVerification = { id: makeId("user"), fullName: name, name, username, email, passwordHash: hashPin(password), role: document.getElementById("signupRoleInput").value, employeeId, profileImage: "", pinEnabled: false, restaurantId: null, preferences: {}, code: String(Math.floor(100000 + Math.random() * 900000)) };
  state.authMode = "verify";
  renderAuth();
}

function verifyLocalAccount() {
  if (document.getElementById("verifyCodeInput").value.trim() !== state.pendingVerification?.code) return toast("Verification code does not match.", "danger");
  const user = { ...state.pendingVerification, verified: true, createdAt: Date.now(), updatedAt: Date.now() };
  delete user.code;
  state.users.push(user);
  safeWrite(STORAGE_KEYS.users, state.users);
  safeWrite(`${USER_DATA_PREFIX}${user.id}`, {
    userId: user.id,
    profile: { name: user.name, email: user.email, role: user.role, employeeId: user.employeeId || "" },
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  });
  startSession(user);
  state.pendingVerification = null;
  state.authMode = "restaurant";
  renderAuth();
}

async function signInLocal() {
  const email = document.getElementById("signinEmailInput").value.trim().toLowerCase();
  const password = document.getElementById("signinPasswordInput").value;
  const user = state.users.find((entry) => entry.email === email && entry.passwordHash === hashPin(password));
  if (!user) return toast("Sign in failed. Check the local email and password.", "danger");
  startSession(user);
  await loadStateSafely();
  if (state.restaurantData) fadeInApp();
  else { state.authMode = "restaurant"; renderAuth(); }
}

function startSession(user) {
  user.lastLogin = Date.now();
  state.activeUser = user;
  state.users = state.users.map((entry) => entry.id === user.id ? { ...entry, lastLogin: user.lastLogin } : entry);
  safeWrite(STORAGE_KEYS.users, state.users);
  safeWrite(STORAGE_KEYS.activeSession, { userId: user.id, restaurantId: user.restaurantId || state.restaurantData?.id || null, currentShiftId: state.currentShift?.id || null, signedInAt: Date.now() });
}

function startPasswordReset() {
  const email = document.getElementById("resetEmailInput").value.trim().toLowerCase();
  const user = state.users.find((entry) => entry.email === email);
  if (!user) return toast("No local account found for that email.", "danger");
  state.pendingPasswordReset = { userId: user.id, code: String(Math.floor(100000 + Math.random() * 900000)) };
  renderAuth();
}

function finishPasswordReset() {
  if (document.getElementById("resetCodeInput").value.trim() !== state.pendingPasswordReset?.code) return toast("Reset code does not match.", "danger");
  const password = document.getElementById("resetPasswordInput").value;
  if (password.length < 4) return toast("Use at least 4 characters.", "danger");
  state.users = state.users.map((user) => user.id === state.pendingPasswordReset.userId ? { ...user, passwordHash: hashPin(password), updatedAt: Date.now() } : user);
  safeWrite(STORAGE_KEYS.users, state.users);
  state.pendingPasswordReset = null;
  state.authMode = "signin";
  renderAuth();
  toast("Password reset locally.");
}

function createRestaurantWorkspace() {
  const name = document.getElementById("createRestaurantNameInput").value.trim() || "Denny's Store";
  const storeNumber = document.getElementById("createStoreNumberInput").value.trim();
  const address = document.getElementById("createRestaurantAddressInput")?.value.trim() || "";
  const preset = document.getElementById("createRestaurantPresetInput")?.value || "default";
  if (state.activeUser && state.activeUser.role !== "General Manager") {
    state.activeUser.role = "General Manager";
    state.profile.role = "General Manager";
    state.users = state.users.map((user) => user.id === state.activeUser.id ? { ...user, role: "General Manager", updatedAt: Date.now() } : user);
    safeWrite(STORAGE_KEYS.users, state.users);
  }
  applyThemePreset(preset, false);
  state.settings.branding.restaurantName = name;
  state.settings.branding.storeNumber = storeNumber;
  state.settings.branding.address = address;
  state.restaurantData = buildRestaurantData();
  if (state.activeUser) {
    state.activeUser.restaurantId = state.restaurantData.id;
    state.users = state.users.map((user) => user.id === state.activeUser.id ? { ...user, restaurantId: state.restaurantData.id, updatedAt: Date.now() } : user);
    safeWrite(STORAGE_KEYS.users, state.users);
  }
  state.restaurants = upsertById(state.restaurants, {
    id: state.restaurantData.id,
    name,
    storeNumber,
    address,
    createdBy: state.activeUser?.id || "local",
    createdAt: state.restaurantData.createdAt,
    updatedAt: Date.now(),
    inviteCode: state.restaurantData.inviteCode,
    joiningEnabled: true,
    requireApproval: true,
    members: buildRestaurantMembers(),
    settings: compactSettingsForLocalStorage()
  });
  saveAll(true);
  fadeInApp();
  setView("home");
}

function joinStoreWorkspace() {
  const code = document.getElementById("joinInviteCodeInput").value.trim().toUpperCase();
  const restaurant = state.restaurants.find((entry) => String(entry.inviteCode || "").toUpperCase() === code);
  if (!code) return toast("Enter a Denny's store invite code.", "danger");
  if (!restaurant) {
    const pending = {
      id: makeId("restaurant"),
      name: "Pending Denny's Store",
      inviteCode: code,
      joiningEnabled: true,
      requireApproval: true,
      joinRequests: [{ userId: state.activeUser?.id || "local-user", requestedAt: Date.now(), status: "pending" }],
      members: []
    };
    state.restaurants = upsertById(state.restaurants, pending);
    safeWrite(STORAGE_KEYS.restaurants, state.restaurants);
    toast("Join request saved locally for GM approval.");
    return;
  }
  restaurant.joinRequests = restaurant.joinRequests || [];
  restaurant.joinRequests.push({ userId: state.activeUser?.id || "local-user", requestedAt: Date.now(), status: restaurant.requireApproval ? "pending" : "approved" });
  if (!restaurant.requireApproval && state.activeUser) {
    state.activeUser.restaurantId = restaurant.id;
    restaurant.members = upsertById(restaurant.members || [], { id: state.activeUser.id, userId: state.activeUser.id, role: state.activeUser.role || "Server", joinedAt: Date.now(), permissions: permissionsForRole(state.activeUser.role || "Server") });
  }
  state.restaurants = upsertById(state.restaurants, restaurant);
  safeWrite(STORAGE_KEYS.restaurants, state.restaurants);
  toast(restaurant.requireApproval ? "Join request sent for GM approval." : "Joined store.");
}

function renderNavigation() {
  if (!canAccessView(state.activeView)) state.activeView = getDefaultViewForRole();
  document.querySelectorAll("[data-panel]").forEach((panel) => panel.classList.toggle("active", panel.dataset.panel === state.activeView));
  document.querySelectorAll("[data-view]").forEach((button) => {
    const view = button.dataset.view;
    const visible = shouldShowNavView(view);
    button.classList.toggle("hidden", !visible);
    button.classList.toggle("active", visible && view === state.activeView);
  });
  const titles = {
    home: ["Home", "Service Mode dashboard for the current shift."],
    floor: ["Floor", "Tap an active table to open it, or start a ready table."],
    flooreditor: ["Floor Editor", "Setup Mode: customize the restaurant floor plan."],
    menu: ["Menu", "Seat-first ordering for drinks, apps, and entrees."],
    menueditor: ["Menu Editor", "Search, edit, import, and export store POS menu data."],
    orders: ["Orders", "Active table orders grouped by seat."],
    pos: ["POS Queue", "Items to ring into the physical POS."],
    stations: ["Window", "Prep stations and server sections."],
    sidework: ["Side Work", "What should I do right now?"],
    messages: ["Messages", "Local notes for roles, stations, and table help."],
    tabledashboard: ["Table Dashboard", "Seat-first ordering and table actions."],
    orderworkspace: ["Expanded Order", "Full ticket view for the selected table."],
    analytics: ["Analytics", "Shift performance from local events."],
    gm: ["General Manager", "Setup tools separated from active floor service."],
    settings: ["Settings", "Local storage, recovery, menu imports, theme, and PIN."],
    profile: ["User Profile", "Mock local shift login and preferences."],
    developer: ["Developer Tools", "Test layouts, mock data, storage, and performance."]
  };
  const title = titles[state.activeView] || titles.floor;
  els.viewTitle.textContent = title[0];
  els.viewSubtitle.textContent = title[1];
  els.editModeButton.classList.toggle("hidden", state.activeView !== "floor");
  updateNotificationBubble();
  document.body.classList.toggle("mobile-nav-open", state.mobileNavOpen);
  document.body.classList.toggle("nav-compact", Boolean(state.settings.navigation?.compact));
  els.mobileNavDrawer?.classList.toggle("hidden", !state.mobileNavOpen);
  els.mobileNavBackdrop?.classList.toggle("hidden", !state.mobileNavOpen);
}

function currentRole() {
  return state.activeUser?.role || state.profile.role || "Server";
}

function canAccessView(view) {
  if (["tabledashboard", "orderworkspace"].includes(view)) return true;
  if (view === "alerts") return false;
  if (["flooreditor", "menueditor", "developer"].includes(view)) return canUseAdminTools();
  if (view === "analytics") return hasAnyRole(["General Manager", "Manager", "Supervisor"]);
  if (view === "gm") return hasAnyRole(GM_ROLES);
  return (ROLE_HOME_VIEWS[currentRole()] || ROLE_HOME_VIEWS.Server).includes(view);
}

function shouldShowNavView(view) {
  if (["menu", "menueditor", "flooreditor", "developer"].includes(view)) return canAccessView(view) && hasAnyRole(MANAGER_ROLES);
  return canAccessView(view);
}

function getDefaultViewForRole() {
  return (ROLE_HOME_VIEWS[currentRole()] || ROLE_HOME_VIEWS.Server)[0] || "home";
}

function hasAnyRole(roles) {
  return roles.includes(currentRole());
}

function canUseAdminTools() {
  return hasAnyRole(MANAGER_ROLES);
}

function showLockedRoleMessage(view = "this page") {
  showModal(`
    <h3>Manager Access Needed</h3>
    <p>Your current role is ${escapeHtml(currentRole())}. ${escapeHtml(String(view))} is limited to manager roles on this device.</p>
    <div class="modal-actions"><button class="primary" id="closeModalButton" type="button">OK</button></div>
  `);
  document.getElementById("closeModalButton").addEventListener("click", closeModal);
}

function renderHome() {
  if (!els.homePanel) return;
  const activeTables = getActiveTables().sort(sortActiveTablesForHome);
  const metrics = getHomeMetrics(activeTables);
  els.homePanel.innerHTML = `
    <div class="home-hero">
      <div>
        <h2>${escapeHtml(greetingName())}</h2>
        <p>${escapeHtml(state.settings.branding?.restaurantName || "Denny's Store")} - ${isClockedIn() ? "Clocked In" : "Clocked Out"}</p>
      </div>
      <div class="button-row">
        <button class="primary" id="homeStartTableButton" type="button">${isClockedIn() ? "Start Table" : "Clock In"}</button>
        <button id="homePosButton" type="button">POS Queue</button>
        <button id="homeSideWorkButton" type="button">Side Work</button>
        <button id="homeMessagesButton" type="button">Messages</button>
        <button id="homeFloorButton" type="button">Floor View</button>
      </div>
    </div>
    <div class="dashboard-stats home-stats">
      ${[
        ["Active Tables", metrics.active],
        ["Guests Seated", metrics.guests],
        ["Avg Table Time", `${metrics.avgTime}m`],
        ["POS Queue Items", metrics.queue],
        ["Check Backs Due", metrics.checkBackDue],
        ["Side Work Due", metrics.sideWorkDue],
        ["Unread Messages", metrics.messages]
      ].map(([label, value]) => `<div class="stat-card"><p>${label}</p><h3>${value}</h3></div>`).join("")}
    </div>
    ${!isClockedIn() ? `<section class="section-card clock-required-card"><h3>Clock in before starting tables.</h3><p>Select your Denny's section and tables to unlock service actions.</p><button class="primary" id="homeClockInCardButton" type="button">Clock In</button></section>` : ""}
    <section class="settings-card">
      <div class="section-header"><h3>Active Tables</h3><p>Assigned tables appear first, then oldest active tables.</p></div>
      <div class="cards-grid">
        ${activeTables.length ? activeTables.map(renderHomeActiveTableCard).join("") : `<div class="empty-soft">No active tables yet. Start one when guests sit down.</div>`}
      </div>
    </section>
  `;
  document.getElementById("homeStartTableButton").addEventListener("click", openStartTableFlow);
  document.getElementById("homeClockInCardButton")?.addEventListener("click", () => openClockInFlow());
  document.getElementById("homePosButton").addEventListener("click", () => setView("pos"));
  document.getElementById("homeSideWorkButton").addEventListener("click", () => setView("sidework"));
  document.getElementById("homeMessagesButton").addEventListener("click", () => setView("messages"));
  document.getElementById("homeFloorButton").addEventListener("click", () => setView("floor"));
  els.homePanel.querySelectorAll("[data-open-dashboard]").forEach((button) => button.addEventListener("click", () => openTableDashboard(button.dataset.openDashboard)));
}

function renderHomeActiveTableCard(table) {
  const tableState = getTableState(table.id);
  const alerts = state.currentShift.alerts.filter((alert) => alert.tableId === table.id && alert.status !== "done").length;
  const checkBack = getCheckBackDisplayState(table.id);
  const next = getNextAction(table.id);
  return `
    <article class="order-card home-table-card ${checkBack ? "needs-attention" : ""}">
      <h4>${escapeHtml(table.name)}</h4>
      <p>Party ${tableState.partySize || 0} - ${escapeHtml(tableState.status)}</p>
      <p>Active: ${getActiveMinutes(tableState)}m</p>
      <p>Next: ${escapeHtml(next.label)}</p>
      <p>Server: ${escapeHtml(tableState.ownerName || state.profile.name || state.activeUser?.name || "Server")}</p>
      <p>Items: ${tableState.orders.filter((order) => order.status !== "cancelled_removed").length}</p>
      <p>Alerts: ${alerts}${checkBack ? " - Check Back Due" : ""}</p>
      <button class="primary" data-open-dashboard="${table.id}" type="button">Open</button>
    </article>
  `;
}

function getHomeMetrics(activeTables) {
  const activeStates = activeTables.map((table) => getTableState(table.id));
  const totalMinutes = activeStates.reduce((sum, tableState) => sum + getActiveMinutes(tableState), 0);
  return {
    active: activeTables.length,
    guests: activeStates.reduce((sum, tableState) => sum + Number(tableState.partySize || 0), 0),
    avgTime: activeStates.length ? Math.round(totalMinutes / activeStates.length) : 0,
    queue: getPosQueueRows().filter((row) => !isDeliveredQueueStatus(row.queueStatus) && row.queueStatus !== "cancelled_removed").length,
    checkBackDue: activeTables.filter((table) => getCheckBackDisplayState(table.id)).length,
    sideWorkDue: getSideWorkRows().filter((row) => row.bucket === "focus" && !["Done", "Skipped"].includes(row.instance.status)).length,
    messages: getUnreadMessages().length
  };
}

function sortActiveTablesForHome(a, b) {
  const aState = getTableState(a.id);
  const bState = getTableState(b.id);
  const aAssigned = a.stationId === getCurrentStationId() ? 1 : 0;
  const bAssigned = b.stationId === getCurrentStationId() ? 1 : 0;
  const aCheck = getCheckBackDisplayState(a.id) ? 1 : 0;
  const bCheck = getCheckBackDisplayState(b.id) ? 1 : 0;
  return bAssigned - aAssigned || bCheck - aCheck || (aState.timestamps.seated || 0) - (bState.timestamps.seated || 0);
}

function greetingName() {
  return state.profile.name || state.activeUser?.name ? `Hi, ${state.profile.name || state.activeUser.name}` : "Ready for service";
}

function renderFloor() {
  renderFloorOverview();
  els.floorCanvas.innerHTML = "";
  renderMobileFloorList();
  els.floorPlan.classList.toggle("snap-off", !state.settings.snap);
  state.layoutConfig.objects.forEach((object) => {
    const tableState = state.currentShift.tables[object.id];
    const status = tableState?.status || "Reset";
    const el = document.createElement("button");
    el.type = "button";
    const checkBackState = object.category === "table" ? getCheckBackDisplayState(object.id) : null;
    const mine = object.category === "table" && getCurrentAssignedTableIds().includes(object.id);
    el.className = `layout-object object-${object.category} ${object.type} status-${cssStatus(status)} ${checkBackState?.pulse ? "checkback-pulse" : ""} ${mine ? "mine-table" : ""} ${object.id === state.selectedTableId ? "selected" : ""}`;
    el.style.left = `${object.x}px`;
    el.style.top = `${object.y}px`;
    el.style.width = `${object.width}px`;
    el.style.height = `${object.height}px`;
    el.style.transform = `rotate(${object.rotation || 0}deg)`;
    if (object.color) el.style.background = object.color;
    el.dataset.id = object.id;
    el.innerHTML = `
      <span class="object-inner">
        <span class="object-name">${escapeHtml(object.name)}</span>
        ${mine ? `<span class="object-badge mine-badge">Mine</span>` : ""}
        <span class="object-status">${escapeHtml(object.category === "table" ? status : object.type)}</span>
        ${checkBackState?.label ? `<span class="object-badge">${escapeHtml(checkBackState.label)}</span>` : ""}
        <span class="object-meta">${object.category === "table" ? `${tableState?.partySize || 0}/${object.seats} guests` : object.category}</span>
      </span>
    `;
    el.addEventListener("click", (event) => selectObject(event, object));
    el.addEventListener("contextmenu", (event) => openTableContextMenu(event, object));
    els.floorCanvas.appendChild(el);
  });
}

function renderFloorOverview() {
  if (!els.floorOverview) return;
  const tables = state.layoutConfig.objects.filter((object) => object.category === "table");
  const active = tables.filter((table) => !isTableReadyForStart(table.id));
  const ready = tables.length - active.length;
  const mine = getCurrentAssignedTableIds().length;
  const attention = active.filter((table) => getCheckBackDisplayState(table.id) || state.currentShift.alerts.some((alert) => alert.tableId === table.id && alert.status !== "done")).length;
  els.floorOverview.innerHTML = `
    <section class="floor-status-strip">
      <div><span>Ready Tables</span><strong>${ready}</strong></div>
      <div><span>Active</span><strong>${active.length}</strong></div>
      <div><span>Mine</span><strong>${mine}</strong></div>
      <div><span>Needs Attention</span><strong>${attention}</strong></div>
    </section>
    <section class="floor-legend">
      <span><i class="legend-dot ready"></i> Ready</span>
      <span><i class="legend-dot seated"></i> Seated</span>
      <span><i class="legend-dot waiting"></i> Waiting Food</span>
      <span><i class="legend-dot mine"></i> Mine</span>
    </section>
  `;
}

function renderMobileFloorList() {
  if (!els.mobileFloorList) return;
  const tables = state.layoutConfig.objects.filter((object) => object.category === "table");
  const ready = tables.filter((table) => isTableReadyForStart(table.id));
  const active = tables.filter((table) => !isTableReadyForStart(table.id));
  const attention = active.filter((table) => getCheckBackDisplayState(table.id) || state.currentShift.alerts.some((alert) => alert.tableId === table.id && alert.status !== "done"));
  els.mobileFloorList.innerHTML = `
    ${renderMobileFloorSection("Needs Attention", attention)}
    ${renderMobileFloorSection("Active Tables", active)}
    ${renderMobileFloorSection("Ready Tables", ready)}
  `;
  els.mobileFloorList.querySelectorAll("[data-mobile-floor-table]").forEach((button) => button.addEventListener("click", () => {
    const tableId = button.dataset.mobileFloorTable;
    if (isTableReadyForStart(tableId)) {
      requireClockedIn(() => {
        state.startFlow.tableId = tableId;
        renderPartySizePicker();
      });
    } else {
      openTableDashboard(tableId);
    }
  }));
  els.mobileFloorList.querySelectorAll("[data-mobile-floor-table]").forEach((button) => {
    button.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      const table = getTable(button.dataset.mobileFloorTable);
      if (table) openTableContextMenu(event, table);
    });
    button.addEventListener("pointerdown", (event) => {
      const table = getTable(button.dataset.mobileFloorTable);
      clearLongPress();
      state.longPressTimer = window.setTimeout(() => table && openTableContextMenu(event, table), 600);
    });
    button.addEventListener("pointerup", clearLongPress);
    button.addEventListener("pointercancel", clearLongPress);
  });
}

function renderMobileFloorSection(title, tables) {
  return `
    <section class="mobile-floor-section">
      <h4>${escapeHtml(title)}</h4>
      <div class="mobile-floor-cards">
        ${tables.length ? tables.map(renderMobileFloorCard).join("") : `<div class="empty-soft">Nothing here right now.</div>`}
      </div>
    </section>
  `;
}

function renderMobileFloorCard(table) {
  const tableState = getTableState(table.id);
  const checkBack = getCheckBackDisplayState(table.id);
  const mine = getCurrentAssignedTableIds().includes(table.id);
  const owner = tableState.ownerName || getStationName(table.stationId);
  return `
    <button class="mobile-table-card status-${cssStatus(tableState.status)} ${checkBack ? "needs-attention" : ""} ${mine ? "mine-table" : ""}" data-mobile-floor-table="${table.id}" type="button">
      <strong>${escapeHtml(table.name)}${mine ? " - Mine" : ""}</strong>
      <span>${escapeHtml(table.type)} - ${table.seats} seats</span>
      <span>${escapeHtml(tableState.status || "Open")}${tableState.partySize ? ` - Party ${tableState.partySize}` : ""}</span>
      <span>${escapeHtml(owner)}</span>
      <small>${tableState.partySize ? `Active ${getActiveMinutes(tableState)}m` : "Ready to seat"}</small>
    </button>
  `;
}

function renderFloorEditor() {
  if (!els.floorEditorCanvas) return;
  renderFloorPalette();
  els.floorEditorCanvas.innerHTML = "";
  els.floorEditorCanvas.style.transform = `scale(${state.floorEditorZoom})`;
  els.floorEditorCanvas.style.transformOrigin = "0 0";
  els.floorEditorCanvasWrap.classList.toggle("grid-hidden", !state.settings.showGrid);
  state.layoutConfig.objects.forEach((object) => {
    const el = document.createElement("button");
    el.type = "button";
    el.className = `layout-object object-${object.category} ${object.type} editor-object ${object.id === state.floorEditorSelectedId ? "selected" : ""}`;
    el.style.left = `${object.x}px`;
    el.style.top = `${object.y}px`;
    el.style.width = `${object.width}px`;
    el.style.height = `${object.height}px`;
    el.style.transform = `rotate(${object.rotation || 0}deg)`;
    if (object.color) el.style.background = object.color;
    el.dataset.id = object.id;
    el.innerHTML = `<span class="object-inner"><span class="object-name">${escapeHtml(object.name)}</span><span class="object-status">${escapeHtml(object.type)}</span><span class="object-meta">${object.seats || ""}${object.seats ? " seats" : object.category}</span></span>`;
    el.addEventListener("click", (event) => { event.stopPropagation(); state.floorEditorSelectedId = object.id; renderFloorEditor(); });
    el.addEventListener("pointerdown", (event) => startEditorDrag(event, object));
    els.floorEditorCanvas.appendChild(el);
  });
  renderFloorProperties();
}

function renderFloorPalette() {
  const groups = [
    ["Tables", [["booth-4", "4 Seater Booth", 130, 82, 4, "booth"], ["booth-2", "2 Seater Booth", 104, 76, 2, "booth"], ["round-booth-5", "Round Booth 5", 112, 112, 5, "circle"], ["square-table-2", "Square Table 2", 78, 78, 2, "square"], ["square-table", "Square Table 4", 96, 96, 4, "square"], ["half-booth", "Half Booth 4", 126, 86, 4, "booth"], ["corner-booth", "Corner Booth", 116, 104, 4, "booth"]]],
    ["Bar", [["bar-seat", "Bar Seat", 54, 54, 1, "bar"], ["bar-counter", "Bar Counter", 210, 58, 0, "rectangle"]]],
    ["Stations", [["cashier-spot", "Cashier Spot", 120, 72, 0, "rectangle"], ["host-stand", "Host Stand", 130, 72, 0, "rectangle"], ["server-station", "Server Station", 150, 76, 0, "rectangle"], ["dessert-station", "Dessert/Ice Cream", 150, 76, 0, "rectangle"], ["drink-station", "Drink Station", 130, 72, 0, "rectangle"], ["sauce-station", "Sauce Station", 128, 72, 0, "rectangle"], ["bus-station", "Bus Station", 130, 72, 0, "rectangle"]]],
    ["Labels", [["kitchen-door", "Kitchen Door", 120, 44, 0, "label"], ["restroom-label", "Restroom Label", 120, 44, 0, "label"], ["entrance-label", "Entrance Label", 120, 44, 0, "label"], ["custom-label", "Custom Label", 120, 44, 0, "label"]]],
    ["Custom", [["custom-rectangle", "Custom Rectangle", 120, 80, 0, "rectangle"], ["custom-circle", "Custom Circle", 92, 92, 0, "circle"]]]
  ];
  els.floorObjectPalette.innerHTML = groups.map(([name, items]) => `
    <details open><summary>${name}</summary>
      ${items.map(([type, label, width, height, seats, shape]) => `<button data-add-floor-object="${type}|${label}|${width}|${height}|${seats}|${shape}" type="button">${label}</button>`).join("")}
    </details>
  `).join("");
  els.floorObjectPalette.querySelectorAll("[data-add-floor-object]").forEach((button) => button.addEventListener("click", () => addFloorObject(button.dataset.addFloorObject)));
}

function renderFloorProperties() {
  const object = state.layoutConfig.objects.find((item) => item.id === state.floorEditorSelectedId);
  if (!object) {
    els.floorPropertiesPanel.innerHTML = `<div class="empty-panel"><h3>Select Object</h3><p>Tap an object to edit its setup details.</p></div>`;
    return;
  }
  els.floorPropertiesPanel.innerHTML = `
    <h3>Properties</h3>
    <label class="field"><span>Name</span><input id="propNameInput" value="${escapeHtml(object.name)}" /></label>
    <label class="field"><span>Number</span><input id="propNumberInput" value="${escapeHtml(object.number || "")}" /></label>
    <label class="field"><span>Type</span><input id="propTypeInput" value="${escapeHtml(object.type)}" /></label>
    <label class="field"><span>Seats</span><input id="propSeatsInput" type="number" value="${Number(object.seats) || 0}" /></label>
    <label class="field"><span>Max temp seats</span><input id="propMaxSeatsInput" type="number" value="${Number(object.maxTempSeats) || Number(object.seats) || 0}" /></label>
    <label class="field"><span>Station assignment</span><select id="propStationInput"><option value="">None</option>${state.layoutConfig.stations.map((station) => `<option value="${station.id}" ${object.stationId === station.id ? "selected" : ""}>${escapeHtml(station.name)}</option>`).join("")}</select></label>
    <div class="form-grid">
      <label class="field"><span>X</span><input id="propXInput" type="number" value="${object.x}" /></label>
      <label class="field"><span>Y</span><input id="propYInput" type="number" value="${object.y}" /></label>
      <label class="field"><span>Width</span><input id="propWidthInput" type="number" value="${object.width}" /></label>
      <label class="field"><span>Height</span><input id="propHeightInput" type="number" value="${object.height}" /></label>
      <label class="field"><span>Rotation</span><input id="propRotationInput" type="number" value="${object.rotation || 0}" /></label>
      <label class="field"><span>Color override</span><input id="propColorInput" type="color" value="${object.color || "#23435f"}" /></label>
    </div>
    <label class="switch-row"><input id="propLockedInput" type="checkbox" ${object.locked ? "checked" : ""} /> Locked</label>
    <label class="field"><span>Notes</span><textarea id="propNotesInput" rows="3">${escapeHtml(object.notes || "")}</textarea></label>
    <div class="button-row">
      <button class="primary" id="applyObjectPropsButton" type="button">Apply</button>
      <button id="duplicateObjectButton" type="button">Duplicate</button>
      <button id="deleteObjectButton" type="button">Delete</button>
    </div>
  `;
  document.getElementById("applyObjectPropsButton").addEventListener("click", () => applyObjectProperties(object.id));
  document.getElementById("duplicateObjectButton").addEventListener("click", () => duplicateFloorObject(object.id));
  document.getElementById("deleteObjectButton").addEventListener("click", () => deleteFloorObject(object.id));
}

function renderDetailPanel() {
  if (!els.detailPanel) return;
  const table = getSelectedTable();
  els.detailPanel.classList.toggle("is-empty", !table);
  if (!table) {
    els.detailPanel.innerHTML = "";
    return;
  }
  const tableState = getTableState(table.id);
  const seats = Array.from({ length: Math.max(table.seats, tableState.partySize, 1) }, (_, index) => index + 1);
  const checkBackState = getCheckBackDisplayState(table.id);
  const showDrinkDelivery = canDeliverAllDrinks(table.id);
  els.detailPanel.innerHTML = `
    <div class="panel-header">
      <div>
        <h2>${escapeHtml(table.name)}</h2>
        <p>${tableState.status} - ${tableState.partySize || 0} guests</p>
      </div>
      <button id="closePanelButton" type="button">Close</button>
    </div>
    <label class="field">
      <span>Party size</span>
      <input id="partySizeInput" type="number" min="0" max="24" value="${tableState.partySize || 0}" />
    </label>
    <div class="seat-picker">
      ${seats.map((seat) => `
        <button class="${tableState.selectedSeat === seat ? "active" : ""}" data-seat="${seat}" type="button">
          Seat ${seat}<span>${tableState.orders.filter((o) => o.seatNumber === seat).length} items</span>
        </button>
      `).join("")}
    </div>
    <div class="panel-actions three">
      <button class="primary" id="panelAddItemButton" type="button">Add Item</button>
      <button id="panelGuestCheckButton" type="button">Guest Check Preview</button>
      <button id="panelMarkRungButton" type="button">Mark Rung In</button>
    </div>
    ${showDrinkDelivery ? `<div class="panel-actions"><button class="primary" id="deliverAllDrinksButton" type="button">Deliver All Drinks</button></div>` : ""}
    <div class="panel-actions three">
      <button id="expandOrderButton" type="button">Expand Order</button>
      <button id="statusNextButton" type="button">Next Status</button>
      <button id="panelPosButton" type="button">POS View</button>
    </div>
    <div class="panel-actions"><button id="clearTableButton" type="button">Reset Table</button></div>
    ${checkBackState ? renderCheckBackPanel(table.id, checkBackState) : ""}
    <h3 class="panel-section-title">Order Summary</h3>
    ${renderSeatOrderSummary(tableState.orders)}
  `;
  bindDetailPanel(table, tableState);
}

function bindDetailPanel(table, tableState) {
  document.getElementById("closePanelButton").addEventListener("click", () => {
    state.selectedTableId = null;
    renderAll();
  });
  document.getElementById("partySizeInput").addEventListener("change", (event) => seatParty(table.id, Number(event.target.value)));
  document.querySelectorAll("[data-seat]").forEach((button) => {
    button.addEventListener("click", () => selectSeat(table.id, Number(button.dataset.seat)));
  });
  document.getElementById("panelAddItemButton").addEventListener("click", () => setView("menu"));
  document.getElementById("panelGuestCheckButton").addEventListener("click", () => showGuestCheck(table.id));
  document.getElementById("panelMarkRungButton").addEventListener("click", () => markTableRungIn(table.id));
  document.getElementById("deliverAllDrinksButton")?.addEventListener("click", () => confirmDeliverAllDrinks(table.id));
  document.getElementById("panelPosButton").addEventListener("click", () => showPosModal(table.id));
  document.getElementById("expandOrderButton").addEventListener("click", () => { state.selectedTableId = table.id; setView("orderworkspace"); });
  document.getElementById("statusNextButton").addEventListener("click", () => setTableStatus(table.id, nextStatus(tableState.status)));
  document.getElementById("clearTableButton").addEventListener("click", () => resetTableWithConfirm(table.id));
  els.detailPanel.querySelectorAll("[data-checkback-action]").forEach((button) => button.addEventListener("click", () => handleCheckBackAction(table.id, button.dataset.checkbackAction)));
  bindOrderLineControls(els.detailPanel, table.id, renderDetailPanel);
}

function renderSeatOrderSummary(orders) {
  if (!orders.length) return `<div class="order-item"><h4>No items yet</h4><p>Select a seat and use the Menu tab.</p></div>`;
  const grouped = groupBy(orders, "seatNumber");
  return Object.keys(grouped).sort((a, b) => Number(a) - Number(b)).map((seat) => `
    <div class="seat-order-group">
      <h4>Seat ${Math.max(1, Number(seat) || 1)}</h4>
      ${grouped[seat].map((order) => renderOrderLine(order)).join("")}
    </div>
  `).join("");
}

function renderOrderLine(order) {
  const item = getMenuItem(order.itemId) || { modifiers: [] };
  const isEditing = state.editingOrderId === order.id;
  const isMoving = state.movingOrderId === order.id;
  const delivered = isDeliveredQueueStatus(order.status);
  const cancelled = order.status === "cancelled_removed";
  return `
    <div class="order-line ${delivered ? "delivered" : ""} ${cancelled ? "cancelled" : ""}">
      <div class="order-line-main">
        <div>
          <strong>${delivered ? "Done - " : ""}${escapeHtml(order.shortName)}</strong>
          <small>${escapeHtml(order.category)} / <span class="status-chip mini ${delivered ? "delivered-chip" : ""}">${escapeHtml(getPosStatusLabel(order.status))}</span></small>
          <small>${order.modifiers.length ? escapeHtml(order.modifiers.join(", ")) : "No modifiers"}${order.notes ? ` - ${escapeHtml(order.notes)}` : ""}</small>
          ${order.deliveredAt ? `<small>Delivered ${new Date(order.deliveredAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</small>` : ""}
        </div>
      </div>
      <div class="order-line-actions">
        <button data-modify-order="${order.id}" type="button">Modify</button>
        <button data-move-order="${order.id}" type="button">Move</button>
        <button data-ready-order="${order.id}" type="button">Mark Food Ready</button>
        <button data-deliver-order="${order.id}" type="button">Mark Delivered</button>
        <button data-remove-order="${order.id}" type="button">Remove</button>
      </div>
      ${isEditing ? renderModifierEditor(order, item) : ""}
      ${isMoving ? renderMoveEditor(order) : ""}
    </div>
  `;
}

function renderModifierEditor(order, item) {
  return `
    <div class="inline-editor" data-order-editor="${order.id}">
      <strong>Modify ${escapeHtml(order.shortName)}</strong>
      <div class="modifier-pills">
        ${(item.modifiers || []).map((modifier) => `
          <label><input type="checkbox" data-edit-mod="${escapeHtml(modifier)}" ${order.modifiers.includes(modifier) ? "checked" : ""} /> ${escapeHtml(modifier)}</label>
        `).join("") || "<span>No modifiers for this item.</span>"}
      </div>
      <label class="field"><span>Notes</span><textarea id="editOrderNotes" rows="2">${escapeHtml(order.notes || "")}</textarea></label>
      <div class="button-row">
        <button class="primary" data-save-mods="${order.id}" type="button">Save</button>
        <button data-cancel-inline type="button">Cancel</button>
      </div>
    </div>
  `;
}

function bindOrderLineControls(container, tableId, rerender = renderAll) {
  if (!container) return;
  container.querySelectorAll("[data-modify-order]").forEach((button) => button.addEventListener("click", () => {
    state.editingOrderId = button.dataset.modifyOrder;
    state.movingOrderId = null;
    rerender();
  }));
  container.querySelectorAll("[data-move-order]").forEach((button) => button.addEventListener("click", () => {
    state.movingOrderId = button.dataset.moveOrder;
    state.editingOrderId = null;
    rerender();
  }));
  container.querySelectorAll("[data-remove-order]").forEach((button) => button.addEventListener("click", () => confirmRemoveOrder(tableId, button.dataset.removeOrder)));
  container.querySelectorAll("[data-ready-order]").forEach((button) => button.addEventListener("click", () => updateQueueItem(`${tableId}|${button.dataset.readyOrder}`, "food_ready")));
  container.querySelectorAll("[data-deliver-order]").forEach((button) => button.addEventListener("click", () => updateQueueItem(`${tableId}|${button.dataset.deliverOrder}`, "delivered")));
  container.querySelectorAll("[data-save-mods]").forEach((button) => button.addEventListener("click", () => saveOrderModifiers(tableId, button.dataset.saveMods, container)));
  container.querySelectorAll("[data-move-to-seat]").forEach((button) => button.addEventListener("click", () => {
    const [orderId, seat] = button.dataset.moveToSeat.split("|");
    moveOrderItem(tableId, orderId, Number(seat));
  }));
  container.querySelectorAll("[data-cancel-inline]").forEach((button) => button.addEventListener("click", () => {
    state.editingOrderId = null;
    state.movingOrderId = null;
    rerender();
  }));
}

function renderMoveEditor(order) {
  const table = getTable(order.tableId);
  const tableState = getTableState(order.tableId);
  const seatCount = Math.max(table.seats, tableState.partySize, 1);
  return `
    <div class="inline-editor">
      <strong>Move ${escapeHtml(order.shortName)}</strong>
      <div class="move-pills">
        ${Array.from({ length: seatCount }, (_, index) => `<button data-move-to-seat="${order.id}|${index + 1}" type="button">Seat ${index + 1}</button>`).join("")}
      </div>
      <button data-cancel-inline type="button">Cancel</button>
    </div>
  `;
}

function renderExpandedOrder() {
  if (!els.expandedOrderPanel) return;
  const table = getSelectedTable();
  if (!table) {
    els.expandedOrderPanel.innerHTML = `<div class="settings-card"><h3>No table open</h3><p>Start a table or open an active table from Home.</p><button id="expandedStartTableButton" type="button">Start Table</button></div>`;
    document.getElementById("expandedStartTableButton")?.addEventListener("click", openStartTableFlow);
    return;
  }
  const tableState = getTableState(table.id);
  const timeline = STATUS.filter((status) => tableState.timestamps[status.toLowerCase().replaceAll(" ", "_").replace("-", "_")]).slice(-8);
  const showDrinkDelivery = canDeliverAllDrinks(table.id);
  els.expandedOrderPanel.innerHTML = `
    <section class="order-ticket">
      <div class="order-ticket-header">
        <div><h2>${escapeHtml(table.name)}</h2><p>Party ${tableState.partySize || 0} - Seat ${tableState.selectedSeat || 1} - ${escapeHtml(tableState.status)}</p></div>
        <div class="button-row">
          <button id="collapseOrderButton" type="button">Collapse</button>
          <button id="expandedPosButton" type="button">POS Queue</button>
          <button id="expandedGuestCheckButton" type="button">Guest Check</button>
          <button id="expandedCopyButton" type="button">Copy</button>
          <button id="expandedPrintButton" type="button">Print</button>
          <button class="primary" id="expandedRungButton" type="button">Mark Rung In</button>
          ${showDrinkDelivery ? `<button class="primary" id="expandedDeliverDrinksButton" type="button">Deliver All Drinks</button>` : ""}
          <button id="expandedDeliveredButton" type="button">Mark Delivered</button>
        </div>
      </div>
      <div class="status-timeline">${timeline.map((status) => `<span class="status-chip">${escapeHtml(status)}</span>`).join("") || `<span class="status-chip">No timeline yet</span>`}</div>
      ${renderSeatOrderSummary(tableState.orders)}
    </section>
  `;
  document.getElementById("collapseOrderButton").addEventListener("click", () => setView("floor"));
  document.getElementById("expandedPosButton").addEventListener("click", () => setView("pos"));
  document.getElementById("expandedGuestCheckButton").addEventListener("click", () => showGuestCheck(table.id));
  document.getElementById("expandedCopyButton").addEventListener("click", () => copyText(buildPosText(table.id)));
  document.getElementById("expandedPrintButton").addEventListener("click", () => window.print());
  document.getElementById("expandedRungButton").addEventListener("click", () => markTableRungIn(table.id));
  document.getElementById("expandedDeliverDrinksButton")?.addEventListener("click", () => confirmDeliverAllDrinks(table.id));
  document.getElementById("expandedDeliveredButton").addEventListener("click", () => markAllTableDelivered(table.id));
  bindOrderLineControls(els.expandedOrderPanel, table.id, renderExpandedOrder);
}

function renderTableDashboard() {
  if (!els.tableDashboardPanel) return;
  ensureActiveServiceMenuCategory();
  const table = getSelectedTable();
  if (!table) {
    els.tableDashboardPanel.innerHTML = `
      <div class="empty-panel dashboard-empty">
        <h2>No table open</h2>
        <p>Start a table or open an active one from Home.</p>
        <button class="primary" id="dashboardStartTableButton" type="button">Start Table</button>
      </div>
    `;
    document.getElementById("dashboardStartTableButton")?.addEventListener("click", openStartTableFlow);
    return;
  }
  const tableState = getTableState(table.id);
  const seats = Array.from({ length: Math.max(table.seats, tableState.partySize, 1) }, (_, index) => index + 1);
  if (!tableState.selectedSeat && tableState.partySize) tableState.selectedSeat = 1;
  const selectedSeat = Math.max(1, Number(tableState.selectedSeat) || 1);
  const visibleOrders = state.seatSummaryMode === "all"
    ? tableState.orders.filter((order) => order.status !== "cancelled_removed")
    : tableState.orders.filter((order) => order.seatNumber === selectedSeat && order.status !== "cancelled_removed");
  const activeMinutes = getActiveMinutes(tableState);
  els.tableDashboardPanel.innerHTML = `
    <section class="table-dashboard">
      <header class="table-dashboard-header">
        <button id="dashboardBackButton" type="button">Home</button>
        <div>
          <p class="breadcrumb">Home &gt; ${escapeHtml(table.name)}</p>
          <h2>${escapeHtml(table.name)}</h2>
          <p>${escapeHtml(tableState.status)} - Party ${tableState.partySize || 0} - Active ${activeMinutes}m</p>
        </div>
        <button id="dashboardNextButton" type="button">Floor</button>
      </header>
      ${renderTableMiniDash(table.id)}
      <div class="dashboard-seat-strip">
        ${seats.map((seat) => `<button class="${selectedSeat === seat ? "active" : ""}" data-dashboard-seat="${seat}" type="button">Seat ${seat}<span>${tableState.orders.filter((order) => order.seatNumber === seat).length}</span></button>`).join("")}
      </div>
      <div class="dashboard-actions">
        <button id="dashboardAddSeatButton" type="button">Add Seat</button>
        ${canDeliverAllDrinks(table.id) ? `<button class="primary" id="dashboardDeliverDrinksButton" type="button">Deliver All Drinks</button>` : ""}
        <button id="dashboardPosViewButton" type="button">POS View</button>
        <button id="dashboardPosQueueButton" type="button">POS Queue</button>
        <button id="dashboardGuestCheckButton" type="button">Guest Check</button>
        <button id="dashboardMoreTimeButton" type="button">Need More Time</button>
        <button id="dashboardStatusButton" type="button">Change Status</button>
        <button id="dashboardMoreButton" type="button">More</button>
      </div>
      <section class="dashboard-service-grid">
        <div class="settings-card selected-seat-summary">
          <h3>${state.seatSummaryMode === "all" ? "All Seats" : `Seat ${selectedSeat}`}</h3>
          <p>${visibleOrders.length} items</p>
          <div class="selected-seat-toolbar">
            <button class="${state.seatSummaryMode !== "all" ? "active" : ""}" data-summary-mode="seat" type="button">Seat Only</button>
            <button class="${state.seatSummaryMode === "all" ? "active" : ""}" data-summary-mode="all" type="button">All Seats</button>
          </div>
          ${visibleOrders.length ? visibleOrders.map(renderOrderLine).join("") : `<p class="empty-soft">Tap menu items to add them to Seat ${selectedSeat}.</p>`}
          <button id="dashboardFullOrderButton" type="button">View Full Order</button>
        </div>
        <div class="settings-card dashboard-menu-card">
          ${renderDashboardMenuArea(table.id)}
        </div>
      </section>
    </section>
  `;
  bindTableDashboard(table);
}

function renderDashboardMenuArea(tableId) {
  if (state.menuBuilder?.tableId === tableId) return renderMenuItemBuilder(tableId);
  const categories = getServiceMenuCategories();
  const items = getServiceMenuItems()
    .filter((item) => item.category === state.activeMenuCategory)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  return `
    <div class="category-tabs dashboard-tabs">${categories.map((category) => `<button class="filter ${category === state.activeMenuCategory ? "active" : ""}" data-dashboard-category="${category}" type="button">${category}</button>`).join("")}</div>
    <div class="menu-grid dashboard-menu-grid">
      ${items.map((item) => `
        <button class="menu-item-card" data-dashboard-menu-item="${item.id}" type="button">
          <strong>${escapeHtml(item.shortName)}</strong>
          <span>${escapeHtml(item.posKey)}</span>
          ${formatPrice(item.price) ? `<small>${formatPrice(item.price)}</small>` : ""}
        </button>
      `).join("") || `<div class="settings-card">No priced Holyoke Denny's items in ${escapeHtml(state.activeMenuCategory)}.</div>`}
    </div>
  `;
}

function renderMenuItemBuilder(tableId) {
  const builder = state.menuBuilder;
  const item = getMenuItem(builder.itemId);
  const tableState = getTableState(tableId);
  const seatNumber = Math.max(1, Number(tableState.selectedSeat) || 1);
  if (!item) return `<div class="item-builder"><p>Item is no longer available.</p><button data-builder-cancel type="button">Back to Menu</button></div>`;
  const groups = getMenuBuilderGroups(item, builder);
  const selectedMods = getBuilderSelectedModifiers(builder, item);
  const needsSideChoice = groups.some((group) => group.key === "side") && !builder.selected.side;
  return `
    <div class="item-builder">
      <div class="builder-header">
        <button data-builder-cancel type="button">Back to Menu</button>
        <div>
          <h3>${escapeHtml(item.name)}</h3>
          <p>Seat ${seatNumber} - ${escapeHtml(item.category)} ${formatPrice(item.price) ? `- ${formatPrice(item.price)}` : ""}</p>
        </div>
      </div>
      ${isAppCategory(item.category) ? `
        <section class="builder-section">
          <h4>Send As</h4>
          <div class="builder-option-grid compact">
            ${["APP", "ENTREE"].map((course) => `<button class="${builder.course === course ? "active" : ""}" data-builder-course="${course}" type="button">${course === "APP" ? "App" : "Entree + Side"}</button>`).join("")}
          </div>
        </section>
      ` : ""}
      ${groups.map((group) => `
        <section class="builder-section">
          <h4>${escapeHtml(group.title)}</h4>
          <div class="builder-option-grid">
            ${group.options.map((option, index) => {
              const active = group.type === "multi"
                ? (builder.multi[group.key] || []).includes(option)
                : builder.selected[group.key] === option;
              const attr = group.type === "multi" ? "data-builder-toggle" : "data-builder-select";
              return `<button class="${active ? "active" : ""}" ${attr}="${group.key}|${index}" type="button">${escapeHtml(option)}</button>`;
            }).join("")}
          </div>
        </section>
      `).join("") || `<p class="empty-soft">No required choices. Add it straight to the selected seat.</p>`}
      <label class="field"><span>Notes</span><textarea id="builderNotesInput" rows="2" placeholder="Anything special?">${escapeHtml(builder.notes || "")}</textarea></label>
      <div class="builder-review">
        <strong>Review</strong>
        <p>${selectedMods.length ? escapeHtml(selectedMods.join(", ")) : "No modifiers selected yet."}</p>
      </div>
      <div class="button-row">
        <button data-builder-cancel type="button">Cancel</button>
        <button class="primary" id="builderAddToSeatButton" type="button" ${needsSideChoice ? "disabled" : ""}>${needsSideChoice ? "Pick a Side First" : "Add to Seat"}</button>
      </div>
    </div>
  `;
}

function getBuilderSelectedModifiers(builder, item) {
  const groups = getMenuBuilderGroups(item, builder);
  const selected = [];
  groups.forEach((group) => {
    if (group.type === "multi") {
      selected.push(...(builder.multi[group.key] || []));
    } else if (builder.selected[group.key]) {
      selected.push(builder.selected[group.key]);
    }
  });
  return getUniqueList(selected);
}

function bindMenuItemBuilder(table) {
  const builder = state.menuBuilder;
  if (!builder || builder.tableId !== table.id) return;
  const item = getMenuItem(builder.itemId);
  if (!item) return;
  els.tableDashboardPanel.querySelectorAll("[data-builder-cancel]").forEach((button) => button.addEventListener("click", () => {
    state.menuBuilder = null;
    renderTableDashboard();
  }));
  els.tableDashboardPanel.querySelectorAll("[data-builder-course]").forEach((button) => button.addEventListener("click", () => {
    builder.course = button.dataset.builderCourse;
    if (builder.course !== "ENTREE") delete builder.selected.side;
    renderTableDashboard();
  }));
  els.tableDashboardPanel.querySelectorAll("[data-builder-select]").forEach((button) => button.addEventListener("click", () => {
    const [key, optionIndex] = button.dataset.builderSelect.split("|");
    const group = getMenuBuilderGroups(item, builder).find((entry) => entry.key === key);
    const option = group?.options[Number(optionIndex)];
    if (!option) return;
    builder.selected[key] = builder.selected[key] === option ? "" : option;
    renderTableDashboard();
  }));
  els.tableDashboardPanel.querySelectorAll("[data-builder-toggle]").forEach((button) => button.addEventListener("click", () => {
    const [key, optionIndex] = button.dataset.builderToggle.split("|");
    const group = getMenuBuilderGroups(item, builder).find((entry) => entry.key === key);
    const option = group?.options[Number(optionIndex)];
    if (!option) return;
    const list = builder.multi[key] || [];
    builder.multi[key] = list.includes(option) ? list.filter((entry) => entry !== option) : [...list, option];
    renderTableDashboard();
  }));
  document.getElementById("builderNotesInput")?.addEventListener("input", (event) => {
    builder.notes = event.target.value;
  });
  document.getElementById("builderAddToSeatButton")?.addEventListener("click", () => {
    const notes = document.getElementById("builderNotesInput")?.value.trim() || "";
    const modifiers = getBuilderSelectedModifiers(builder, item);
    const categoryOverride = isAppCategory(item.category) && builder.course === "ENTREE" ? "ENTREE" : item.category;
    addConfiguredMenuItemToSelectedSeat(item.id, modifiers, notes, { categoryOverride });
  });
}

function bindTableDashboard(table) {
  document.getElementById("dashboardBackButton").addEventListener("click", () => setView("home"));
  document.getElementById("dashboardNextButton").addEventListener("click", () => setView("floor"));
  document.querySelectorAll("[data-dashboard-seat]").forEach((button) => button.addEventListener("click", () => selectSeat(table.id, Number(button.dataset.dashboardSeat))));
  document.getElementById("dashboardAddSeatButton").addEventListener("click", () => { table.seats += 1; getTableState(table.id).partySize = Math.max(getTableState(table.id).partySize, table.seats); logEvent("seat_added", table.id, null, null, {}); markDirty(); renderAll(); });
  document.getElementById("dashboardDeliverDrinksButton")?.addEventListener("click", () => confirmDeliverAllDrinks(table.id));
  document.getElementById("dashboardPosViewButton").addEventListener("click", () => showPosModal(table.id));
  document.getElementById("dashboardPosQueueButton").addEventListener("click", () => setView("pos"));
  document.getElementById("dashboardGuestCheckButton").addEventListener("click", () => showGuestCheck(table.id));
  document.getElementById("dashboardMoreTimeButton").addEventListener("click", () => showMoreTimeReminder(table.id));
  document.getElementById("dashboardStatusButton").addEventListener("click", () => showStatusChooser(table.id));
  document.getElementById("dashboardMoreButton").addEventListener("click", () => showTableMoreMenu(table.id));
  document.getElementById("dashboardFullOrderButton").addEventListener("click", () => setView("orderworkspace"));
  document.querySelectorAll("[data-summary-mode]").forEach((button) => button.addEventListener("click", () => { state.seatSummaryMode = button.dataset.summaryMode; renderTableDashboard(); }));
  document.querySelectorAll("[data-dashboard-category]").forEach((button) => button.addEventListener("click", () => { state.activeMenuCategory = button.dataset.dashboardCategory; renderTableDashboard(); }));
  document.querySelectorAll("[data-dashboard-menu-item]").forEach((button) => button.addEventListener("click", () => addMenuItemToSelectedSeat(button.dataset.dashboardMenuItem)));
  bindMenuItemBuilder(table);
  bindOrderLineControls(els.tableDashboardPanel, table.id, renderTableDashboard);
  els.tableDashboardPanel.querySelectorAll("[data-mini-checkback]").forEach((button) => button.addEventListener("click", () => handleCheckBackAction(table.id, button.dataset.miniCheckback)));
  els.tableDashboardPanel.querySelectorAll("[data-complete-table-reminder]").forEach((button) => button.addEventListener("click", () => completeTableReminder(table.id, button.dataset.completeTableReminder)));
}

function renderTableMiniDash(tableId) {
  const table = getTable(tableId);
  const tableState = getTableState(tableId);
  const next = getNextAction(tableId);
  const progress = getTableProgress(tableId);
  const reminder = getActiveOrNextTableReminder(tableId);
  const checkBack = getCheckBackDisplayState(tableId);
  const upcomingCheckBack = !checkBack ? getNextScheduledCheckBack(tableId) : null;
  return `
    <section class="table-mini-dash ${next.overdue ? "overdue" : ""}">
      <div class="mini-dash-main">
        <div>
          <p class="mini-label">Status</p>
          <h3>${escapeHtml(tableState.status)}</h3>
        </div>
        <div>
          <p class="mini-label">Next Action</p>
          <h3>${escapeHtml(next.label)}</h3>
          <p>${escapeHtml(next.detail)}</p>
        </div>
        <div>
          <p class="mini-label">POS</p>
          <h3>${getPendingQueueCount(tableId)} pending</h3>
          <p>Drinks: ${allDrinkItemsDelivered(tableId) ? "Delivered" : getDrinkOrders(tableId).length ? "Open" : "None"} / Food: ${getFoodStatusLabel(tableId)}</p>
        </div>
      </div>
      <div class="mini-progress">
        ${progress.map((step) => `<span class="${step.state}">${escapeHtml(step.label)}</span>`).join("")}
      </div>
      ${reminder ? `<div class="mini-reminder"><strong>${escapeHtml(reminder.status === "due" || reminder.status === "overdue" ? "Reminder due" : `Reminder in ${formatCountdown(reminder.dueAt)}`)}</strong><span>${escapeHtml(reminder.message)}</span><button data-complete-table-reminder="${reminder.id}" type="button">Done</button></div>` : ""}
      ${checkBack ? `<div class="mini-checkback"><strong>${escapeHtml(checkBack.label)}</strong><span>${escapeHtml(checkBack.message)}</span><button class="primary" data-mini-checkback="checked" type="button">Checked Back</button><button data-mini-checkback="snooze2" type="button">Snooze</button><button data-mini-checkback="needs" type="button">Needs Something</button></div>` : ""}
      ${upcomingCheckBack ? `<div class="mini-checkback"><strong>Next check back in ${escapeHtml(formatCountdown(upcomingCheckBack.snoozedUntil || upcomingCheckBack.dueAt))}</strong><span>${escapeHtml(checkBackMessage(table, upcomingCheckBack.type))}</span></div>` : ""}
    </section>
  `;
}

function showTableMoreMenu(tableId) {
  showModal(`
    <h3>More Table Actions</h3>
    <div class="modal-actions">
      <button id="moreEditButton" type="button">Edit Table Info</button>
      <button id="moreMoveButton" type="button">Move Table</button>
      <button id="moreCombineButton" type="button">Combine Table</button>
      <button id="moreResetButton" type="button">Close / Reset Table</button>
    </div>
  `);
  document.getElementById("moreEditButton").addEventListener("click", () => { closeModal(); runAdminAction(() => setView("flooreditor")); });
  document.getElementById("moreMoveButton").addEventListener("click", () => toast("Move Table uses the floor editor for now."));
  document.getElementById("moreCombineButton").addEventListener("click", () => toast("Combine Table is available from setup tools soon."));
  document.getElementById("moreResetButton").addEventListener("click", () => { closeModal(); resetTableWithConfirm(tableId); });
}

function markAllTableDelivered(tableId) {
  const tableState = getTableState(tableId);
  tableState.posQueue.filter(isFoodQueueItem).forEach((item) => updateQueueItem(`${tableId}|${item.id}`, "delivered"));
  renderAll();
}

function showMoreTimeReminder(tableId) {
  const table = getTable(tableId);
  showModal(`
    <h3>${escapeHtml(table.name)} needs more time?</h3>
    <p>Set a gentle order check reminder so the table does not fall out of your head during a rush.</p>
    <div class="party-size-grid compact-grid">
      ${[2, 5, 10, 15].map((minutes) => `<button data-more-time="${minutes}" type="button">${minutes}m</button>`).join("")}
    </div>
    <label class="field"><span>Custom minutes</span><input id="customMoreTimeInput" type="number" min="1" max="60" value="5" /></label>
    <div class="modal-actions">
      <button id="customMoreTimeButton" class="primary" type="button">Set Reminder</button>
      <button id="closeModalButton" type="button">Cancel</button>
    </div>
  `);
  document.querySelectorAll("[data-more-time]").forEach((button) => button.addEventListener("click", () => {
    createTableReminder(tableId, "order_check", Number(button.dataset.moreTime), `${table.name}: check if guests are ready to order.`);
    closeModal();
  }));
  document.getElementById("customMoreTimeButton").addEventListener("click", () => {
    const minutes = clamp(document.getElementById("customMoreTimeInput").value, 1, 60);
    createTableReminder(tableId, "order_check", minutes, `${table.name}: check if guests are ready to order.`);
    closeModal();
  });
  document.getElementById("closeModalButton").addEventListener("click", closeModal);
}

function createTableReminder(tableId, type, minutes, message) {
  const tableState = getTableState(tableId);
  const reminder = {
    id: makeId("table-reminder"),
    type,
    message,
    dueAt: Date.now() + Number(minutes) * 60000,
    status: "scheduled",
    createdAt: Date.now(),
    alertedAt: null,
    completedAt: null,
    snoozedUntil: null
  };
  tableState.reminders = tableState.reminders || [];
  tableState.reminders.push(reminder);
  logEvent("table_reminder_scheduled", tableId, null, null, { type, minutes });
  markDirty();
  renderAll();
  toast(`Reminder set for ${minutes} minutes.`);
}

function processTableReminders() {
  const now = Date.now();
  Object.values(state.currentShift.tables).forEach((tableState) => {
    const table = getTable(tableState.tableId);
    if (!table || !Array.isArray(tableState.reminders)) return;
    tableState.reminders.forEach((reminder) => {
      if (["completed", "dismissed"].includes(reminder.status)) return;
      const dueAt = reminder.snoozedUntil || reminder.dueAt;
      if (dueAt <= now && reminder.status === "scheduled") {
        reminder.status = "due";
        reminder.alertedAt = now;
        createSystemAlert({ type: reminder.type, tableId: table.id, message: reminder.message });
        logEvent("table_reminder_due", table.id, null, null, { reminderId: reminder.id, type: reminder.type });
        markDirty();
      }
      if (reminder.status === "due" && now - (reminder.alertedAt || dueAt) > 5 * 60000) {
        reminder.status = "overdue";
        logEvent("table_reminder_overdue", table.id, null, null, { reminderId: reminder.id, type: reminder.type });
        markDirty();
      }
    });
  });
}

function completeTableReminder(tableId, reminderId) {
  const reminder = getTableState(tableId).reminders?.find((item) => item.id === reminderId);
  if (!reminder) return;
  reminder.status = "completed";
  reminder.completedAt = Date.now();
  logEvent("table_reminder_completed", tableId, null, null, { reminderId, type: reminder.type });
  markDirty();
  renderAll();
}

function getActiveOrNextTableReminder(tableId) {
  const reminders = (getTableState(tableId).reminders || []).filter((reminder) => !["completed", "dismissed"].includes(reminder.status));
  return reminders.sort((a, b) => {
    const aDue = ["due", "overdue"].includes(a.status) ? 0 : (a.snoozedUntil || a.dueAt);
    const bDue = ["due", "overdue"].includes(b.status) ? 0 : (b.snoozedUntil || b.dueAt);
    return aDue - bDue;
  })[0] || null;
}

function getNextAction(tableId) {
  const tableState = getTableState(tableId);
  const reminder = getActiveOrNextTableReminder(tableId);
  if (reminder && ["due", "overdue"].includes(reminder.status)) return { label: "Reminder timer up", detail: reminder.message, overdue: reminder.status === "overdue" };
  const checkBack = getCheckBackDisplayState(tableId);
  if (checkBack) return { label: checkBack.overdue ? "Check back overdue" : "Check back now", detail: checkBack.message, overdue: checkBack.overdue };
  const scheduledCheckBack = getNextScheduledCheckBack(tableId);
  if (scheduledCheckBack) return { label: `Check back in ${formatCountdown(scheduledCheckBack.snoozedUntil || scheduledCheckBack.dueAt)}`, detail: checkBackMessage(getTable(tableId), scheduledCheckBack.type), overdue: false };
  if (!getDrinkOrders(tableId).length && tableState.partySize) return { label: "Take drink order", detail: "Select a seat and add drinks or No Drink.", overdue: false };
  if (getUndeliveredDrinkOrders(tableId).length) return { label: "Deliver drinks", detail: `${getUndeliveredDrinkOrders(tableId).length} drinks are not delivered yet.`, overdue: false };
  if (getPendingQueueCount(tableId)) return { label: "Ring in POS queue", detail: `${getPendingQueueCount(tableId)} items still need attention.`, overdue: false };
  if (tableState.status === "Paid") return { label: "Reset table", detail: "Guests paid. Mark bus needed or reset when ready.", overdue: false };
  if (tableState.status === "Bus Needed") return { label: "Table needs reset", detail: "Clean and reset for the next party.", overdue: true };
  if (reminder) return { label: `Reminder in ${formatCountdown(reminder.dueAt)}`, detail: reminder.message, overdue: false };
  return { label: "Keep an eye on table", detail: "No urgent action right now.", overdue: false };
}

function getTableProgress(tableId) {
  const status = getTableState(tableId).status;
  const steps = [
    ["Seated", ["Seated", "Greeted"]],
    ["Drinks", ["Drinks Ordered", "Drinks Served"]],
    ["Order Sent", ["Order Taken", "Order Sent", "Waiting for Food", "Apps Fired"]],
    ["Food", ["Food Running", "Check Back", "Check Back Due", "Refill Check Due", "Check Back Overdue", "Check Back Done"]],
    ["Check Back", ["Check Back", "Check Back Due", "Refill Check Due", "Check Back Overdue", "Check Back Done"]],
    ["Paid", ["Check Dropped", "Paid"]],
    ["Reset", ["Bus Needed", "Reset", "Open"]]
  ];
  const currentIndex = Math.max(0, steps.findIndex(([, statuses]) => statuses.includes(status)));
  return steps.map(([label], index) => ({ label, state: index < currentIndex ? "done" : index === currentIndex ? (["Check Back Overdue", "Bus Needed"].includes(status) ? "overdue" : "current") : "upcoming" }));
}

function getPendingQueueCount(tableId) {
  return getTableState(tableId).posQueue.filter((item) => !isDeliveredQueueStatus(item.queueStatus) && item.queueStatus !== "cancelled_removed").length;
}

function getFoodStatusLabel(tableId) {
  const foodItems = getTableState(tableId).posQueue.filter(isFoodQueueItem);
  if (!foodItems.length) return "None";
  if (foodItems.every((item) => isDeliveredQueueStatus(item.queueStatus))) return "Delivered";
  if (foodItems.some((item) => item.queueStatus === "food_ready")) return "Ready";
  if (foodItems.some((item) => ["added_to_main_pos", "waiting_for_food"].includes(item.queueStatus))) return "Waiting";
  return "Not rung in";
}

// Navigation
function setView(view) {
  if (!canAccessView(view)) {
    showLockedRoleMessage(view);
    return;
  }
  state.mobileNavOpen = false;
  state.activeView = view;
  renderAll();
}

// Floor Layout
function selectObject(event, object) {
  event.stopPropagation();
  if (object.category !== "table") return;
  if (isTableReadyForStart(object.id)) {
    showReadyTableOptions(object.id);
  } else {
    openTableDashboard(object.id);
  }
}

function showReadyTableOptions(tableId) {
  const table = getTable(tableId);
  showModal(`
    <h3>${escapeHtml(table.name)}</h3>
    <p>This table is ready.</p>
    <div class="modal-actions">
      <button id="readyInfoButton" type="button">View Table Info</button>
      <button class="primary" id="readyStartButton" type="button">Start Table</button>
      <button id="closeModalButton" type="button">Cancel</button>
    </div>
  `);
  document.getElementById("readyStartButton").addEventListener("click", () => requireClockedIn(() => { state.startFlow.tableId = tableId; renderPartySizePicker(); }));
  document.getElementById("readyInfoButton").addEventListener("click", () => { closeModal(); state.selectedTableId = tableId; renderAll(); });
  document.getElementById("closeModalButton").addEventListener("click", closeModal);
}

function openTableDashboard(tableId) {
  state.selectedTableId = tableId;
  state.currentShift.activeTableId = tableId;
  const tableState = getTableState(tableId);
  if (!tableState.selectedSeat && tableState.partySize) tableState.selectedSeat = 1;
  setView("tabledashboard");
}

function startDrag(event, object) {
  clearLongPress();
  if (object.category === "table" && !state.editMode) {
    state.longPressTimer = window.setTimeout(() => openTableContextMenu(event, object), 650);
  }
  if (!state.editMode || object.locked) return;
  event.preventDefault();
  state.drag = { id: object.id, x: object.x, y: object.y, startX: event.clientX, startY: event.clientY };
  event.currentTarget.setPointerCapture(event.pointerId);
}

function startEditorDrag(event, object) {
  if (object.locked) return;
  event.preventDefault();
  event.stopPropagation();
  pushLayoutUndo();
  state.floorEditorSelectedId = object.id;
  state.drag = { id: object.id, x: object.x, y: object.y, startX: event.clientX, startY: event.clientY, editor: true };
  event.currentTarget.setPointerCapture(event.pointerId);
}

function clearLongPress() {
  if (state.longPressTimer) {
    window.clearTimeout(state.longPressTimer);
    state.longPressTimer = null;
  }
}

function moveDrag(event) {
  if (!state.drag) return;
  const object = state.layoutConfig.objects.find((item) => item.id === state.drag.id);
  if (!object) return;
  object.x = snap(state.drag.x + (event.clientX - state.drag.startX) / (state.drag.editor ? state.floorEditorZoom : 1));
  object.y = snap(state.drag.y + (event.clientY - state.drag.startY) / (state.drag.editor ? state.floorEditorZoom : 1));
  if (state.drag.editor) renderFloorEditor();
  else renderFloor();
}

function endDrag() {
  if (state.drag) {
    state.drag = null;
    logEvent("layout_moved", null, null, null, {});
    markDirty();
  }
}

function pushLayoutUndo() {
  state.layoutUndo.push(clone(state.layoutConfig));
  if (state.layoutUndo.length > 25) state.layoutUndo.shift();
  state.layoutRedo = [];
}

function undoLayout() {
  if (!state.layoutUndo.length) return toast("Nothing to undo.");
  state.layoutRedo.push(clone(state.layoutConfig));
  state.layoutConfig = state.layoutUndo.pop();
  normalizeLayoutObjects();
  markDirty();
  renderAll();
}

function redoLayout() {
  if (!state.layoutRedo.length) return toast("Nothing to redo.");
  state.layoutUndo.push(clone(state.layoutConfig));
  state.layoutConfig = state.layoutRedo.pop();
  normalizeLayoutObjects();
  markDirty();
  renderAll();
}

function addFloorObject(data) {
  pushLayoutUndo();
  const [type, label, width, height, seats, shape] = data.split("|");
  const id = makeId(type.includes("table") || type.includes("booth") || type.includes("bar-seat") ? "table" : "object");
  const number = nextObjectNumber(label);
  const category = Number(seats) > 0 || type === "bar-seat" ? "table" : type.includes("label") || type.includes("door") ? "label" : "station";
  const object = {
    id,
    restaurantId: state.restaurantData?.id || "local-restaurant",
    name: Number(seats) > 0 || type === "bar-seat" ? `${label.replace(/\d+\s*Seats?/i, "").trim()} ${number}` : label,
    number,
    type,
    category,
    shape,
    seats: Number(seats) || 0,
    maxTempSeats: Number(seats) || 0,
    stationId: "",
    x: 80 + state.layoutConfig.objects.length * 12,
    y: 80 + state.layoutConfig.objects.length * 8,
    width: Number(width),
    height: Number(height),
    rotation: 0,
    color: "",
    locked: false,
    notes: "",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    createdBy: state.activeUser?.id || "local"
  };
  state.layoutConfig.objects.push(object);
  if (category === "table") state.currentShift.tables[id] = defaultTableState(object);
  if (category === "station") {
    state.layoutConfig.stations.push({
      id,
      name: label,
      type: type.includes("cashier") ? "cashier" : type.includes("dessert") || type.includes("drink") || type.includes("sauce") ? "prep" : "server",
      color: object.color || "",
      assignedTables: [],
      capabilities: stationCapabilities(type),
      notes: ""
    });
  }
  state.floorEditorSelectedId = id;
  markDirty();
  renderAll();
}

function stationCapabilities(type) {
  if (type.includes("dessert")) return ["milkshakes", "desserts"];
  if (type.includes("drink")) return ["drinks"];
  if (type.includes("sauce")) return ["sauces"];
  if (type.includes("bus")) return ["cleaning", "bus"];
  if (type.includes("cashier")) return ["cashier"];
  return [];
}

function applyObjectProperties(id) {
  const object = state.layoutConfig.objects.find((item) => item.id === id);
  if (!object) return;
  pushLayoutUndo();
  Object.assign(object, {
    name: document.getElementById("propNameInput").value.trim() || object.name,
    number: document.getElementById("propNumberInput").value.trim(),
    type: document.getElementById("propTypeInput").value.trim() || object.type,
    seats: Number(document.getElementById("propSeatsInput").value) || 0,
    maxTempSeats: Number(document.getElementById("propMaxSeatsInput").value) || 0,
    stationId: document.getElementById("propStationInput").value,
    x: snap(Number(document.getElementById("propXInput").value) || 0),
    y: snap(Number(document.getElementById("propYInput").value) || 0),
    width: Math.max(30, Number(document.getElementById("propWidthInput").value) || object.width),
    height: Math.max(30, Number(document.getElementById("propHeightInput").value) || object.height),
    rotation: Number(document.getElementById("propRotationInput").value) || 0,
    color: document.getElementById("propColorInput").value,
    locked: document.getElementById("propLockedInput").checked,
    notes: document.getElementById("propNotesInput").value.trim(),
    updatedAt: Date.now()
  });
  if (object.category === "table" && !state.currentShift.tables[id]) state.currentShift.tables[id] = defaultTableState(object);
  logEvent("layout_object_updated", null, null, null, { id });
  markDirty();
  renderAll();
}

function duplicateFloorObject(id) {
  const object = state.layoutConfig.objects.find((item) => item.id === id);
  if (!object) return;
  pushLayoutUndo();
  const copy = { ...clone(object), id: makeId(object.category === "table" ? "table" : "object"), x: object.x + 24, y: object.y + 24, number: nextObjectNumber(object.name), name: nextDuplicateName(object.name), createdAt: Date.now(), updatedAt: Date.now() };
  state.layoutConfig.objects.push(copy);
  if (copy.category === "table") state.currentShift.tables[copy.id] = defaultTableState(copy);
  state.floorEditorSelectedId = copy.id;
  markDirty();
  renderAll();
}

function deleteFloorObject(id) {
  const object = state.layoutConfig.objects.find((item) => item.id === id);
  if (!object) return;
  showConfirm(`Delete ${object.name} from the floor layout?`, "Delete", () => {
    pushLayoutUndo();
    state.layoutConfig.objects = state.layoutConfig.objects.filter((item) => item.id !== id);
    state.layoutConfig.stations = state.layoutConfig.stations.filter((station) => station.id !== id);
    delete state.currentShift.tables[id];
    state.floorEditorSelectedId = null;
    markDirty();
    renderAll();
  });
}

function nextObjectNumber(label) {
  const nums = state.layoutConfig.objects.map((object) => Number(object.number || String(object.name).match(/\d+/)?.[0])).filter(Boolean);
  return String((nums.length ? Math.max(...nums) : 0) + 1);
}

function nextDuplicateName(name) {
  const number = nextObjectNumber(name);
  return String(name).replace(/\d+$/, "").trim() + ` ${number}`;
}

function normalizeLayoutObjects() {
  state.layoutConfig.objects.forEach((object) => {
    if (object.category === "table" && !state.currentShift.tables[object.id]) state.currentShift.tables[object.id] = defaultTableState(object);
  });
}

function exportFloorLayout() {
  downloadJson("tableflow-floor-layout.json", { version: APP_VERSION, exportedAt: new Date().toISOString(), layoutConfig: state.layoutConfig });
}

function importFloorLayout(text) {
  try {
    const parsed = JSON.parse(text);
    if (!parsed.layoutConfig?.objects) throw new Error("Missing layoutConfig.objects");
    pushLayoutUndo();
    state.layoutConfig = parsed.layoutConfig;
    normalizeLayoutObjects();
    markDirty();
    renderAll();
    toast("Floor layout imported.");
  } catch {
    toast("Floor layout import failed.", "danger");
  }
}

// Menu
function renderMenu() {
  ensureActiveServiceMenuCategory();
  renderMenuSelectors();
  renderMenuSearchControls();
  renderMenuQuickSections();
  renderCategoryTabs();
  renderMenuGrid();
}

function isDennyLocationMenuItem(item) {
  const restaurantId = String(item?.restaurantId || "");
  const id = String(item?.id || "");
  const createdBy = String(item?.createdBy || "");
  return restaurantId === "dennys-7614" || id.startsWith("dennys-7614-") || createdBy === "official-public-menu-import";
}

function hasMenuPrice(item) {
  const value = Number(item?.price);
  return Number.isFinite(value) && value > 0;
}

function isServiceMenuItem(item) {
  return Boolean(item && item.active !== false && item.orderable !== false && item.category !== "MODS" && isDennyLocationMenuItem(item) && (hasMenuPrice(item) || item.category === "BEV"));
}

function isAppCategory(category) {
  return ["APPT", "STARTER"].includes(String(category || "").toUpperCase());
}

function getServiceMenuItems() {
  return state.menuConfig.items.filter(isServiceMenuItem);
}

function getServiceMenuCategories() {
  const visibleItems = getServiceMenuItems();
  const set = new Set(visibleItems.map((item) => item.category).filter(Boolean));
  return mergeCategories(state.menuConfig.categories, []).filter((category) => set.has(category));
}

function ensureActiveServiceMenuCategory() {
  const categories = getServiceMenuCategories();
  if (!categories.length) return;
  if (!categories.includes(state.activeMenuCategory)) state.activeMenuCategory = categories[0];
}

function renderMenuSearchControls() {
  if (!els.menuSearchInput) return;
  els.menuSearchInput.value = state.menuSearch || "";
  const subcategories = [...new Set(getServiceMenuItems().filter((item) => item.category === state.activeMenuCategory).map((item) => item.subcategory).filter(Boolean))].sort();
  if (state.menuSubcategory && !subcategories.includes(state.menuSubcategory)) state.menuSubcategory = "";
  els.menuSubcategoryFilter.innerHTML = `<option value="">All subcategories</option>` + subcategories.map((sub) => `<option value="${escapeHtml(sub)}" ${state.menuSubcategory === sub ? "selected" : ""}>${escapeHtml(sub)}</option>`).join("");
}

function renderMenuQuickSections() {
  if (!els.menuQuickSections) return;
  const recent = getServiceMenuItems().slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 6);
  const counts = countBy(state.analytics.events.filter((event) => event.type === "item_added"), "itemId");
  const most = getServiceMenuItems().filter((item) => counts[item.id]).sort((a, b) => counts[b.id] - counts[a.id]).slice(0, 6);
  els.menuQuickSections.innerHTML = `
    <details class="quick-menu-section" ${most.length ? "open" : ""}><summary>Most Used</summary><div class="quick-menu-row">${most.map(renderQuickMenuButton).join("") || "<span>No use data yet.</span>"}</div></details>
    <details class="quick-menu-section"><summary>Recently Added</summary><div class="quick-menu-row">${recent.map(renderQuickMenuButton).join("")}</div></details>
  `;
  els.menuQuickSections.querySelectorAll("[data-menu-item]").forEach((button) => button.addEventListener("click", () => addMenuItemToSelectedSeat(button.dataset.menuItem)));
}

function renderQuickMenuButton(item) {
  return `<button data-menu-item="${item.id}" type="button">${escapeHtml(item.shortName)}</button>`;
}

function renderMenuSelectors() {
  const table = getSelectedTable();
  const tableState = table ? getTableState(table.id) : null;
  const seatCount = Math.max(table?.seats || 1, tableState?.partySize || 1);
  els.selectedTableChip.textContent = table ? `${table.name} - ${tableState?.partySize || 0} guests` : "Open a Table Dashboard to order by seat.";
  els.noDrinkButton.disabled = !table;
  els.noDrinkButton.classList.toggle("hidden", !isServiceMenuItem(getMenuItem("no-drink")));
  if (!table) {
    els.menuSeatButtons.innerHTML = "";
    return;
  }
  if (!tableState.selectedSeat && tableState.partySize) tableState.selectedSeat = 1;
  els.menuSeatButtons.innerHTML = Array.from({ length: Math.min(10, seatCount) }, (_, index) => {
    const seat = index + 1;
    return `<button class="${tableState?.selectedSeat === seat ? "active" : ""}" data-menu-seat="${seat}" type="button">Seat ${seat}</button>`;
  }).join("");
  els.menuSeatButtons.querySelectorAll("[data-menu-seat]").forEach((button) => button.addEventListener("click", () => selectSeat(state.selectedTableId, Number(button.dataset.menuSeat))));
}

function renderCategoryTabs() {
  const categories = getServiceMenuCategories();
  els.categoryTabs.innerHTML = categories.map((category) => `<button class="filter ${category === state.activeMenuCategory ? "active" : ""}" data-menu-category="${category}" type="button">${category}</button>`).join("");
  els.categoryTabs.querySelectorAll("[data-menu-category]").forEach((button) => button.addEventListener("click", () => {
    state.activeMenuCategory = button.dataset.menuCategory;
    state.menuSubcategory = "";
    renderMenu();
  }));
}

function renderMenuGrid() {
  const query = (state.menuSearch || "").toLowerCase();
  const items = getServiceMenuItems().filter((item) => {
    const haystack = [item.name, item.shortName, item.posKey, item.subcategory, item.modifiers?.join(" ")].join(" ").toLowerCase();
    return item.category === state.activeMenuCategory && (!state.menuSubcategory || item.subcategory === state.menuSubcategory) && (!query || haystack.includes(query));
  }).sort((a, b) => a.sortOrder - b.sortOrder);
  els.menuGrid.innerHTML = items.map((item) => `
    <button class="menu-item-card" data-menu-item="${item.id}" type="button">
      <strong>${escapeHtml(item.shortName)}</strong>
      <span>${escapeHtml(item.posKey)}</span>
      ${formatPrice(item.price) ? `<small>${formatPrice(item.price)}</small>` : ""}
      ${item.requiresPrepStation ? `<small>Prep: ${escapeHtml(item.prepCapability)}</small>` : ""}
    </button>
  `).join("") || `<div class="settings-card">No priced Holyoke Denny's items in this category. Import updated menu/prices if something is missing.</div>`;
  els.menuGrid.querySelectorAll("[data-menu-item]").forEach((button) => button.addEventListener("click", () => addMenuItemToSelectedSeat(button.dataset.menuItem)));
}

function addMenuItemToSelectedSeat(itemId) {
  startMenuItemBuilderOrAdd(itemId);
}

function startMenuItemBuilderOrAdd(itemId) {
  const table = getSelectedTable();
  if (!table) {
    toast("Select a table first", "danger");
    shake(els.menuGrid);
    return;
  }
  const tableState = getTableState(table.id);
  const item = getMenuItem(itemId);
  if (!item || !isServiceMenuItem(item)) {
    toast("That item is not available in the priced Holyoke menu.", "danger");
    return;
  }
  const seatNumber = Number(tableState.selectedSeat) || 1;
  if (item.requiresSeat && !seatNumber) {
    toast("Select a seat first", "danger");
    shake(els.menuGrid);
    return;
  }
  if (tableState.selectedSeat !== seatNumber) tableState.selectedSeat = seatNumber;
  if (shouldOpenMenuItemBuilder(item)) {
    state.menuBuilder = createMenuBuilderState(table.id, item.id);
    state.seatSummaryMode = "seat";
    state.activeView = "tabledashboard";
    renderAll();
    return;
  }
  addConfiguredMenuItemToSelectedSeat(itemId, [], "");
}

function addConfiguredMenuItemToSelectedSeat(itemId, modifiers = [], notes = "", options = {}) {
  const table = getSelectedTable();
  if (!table) {
    toast("Select a table first", "danger");
    shake(els.menuGrid || els.tableDashboardPanel);
    return;
  }
  const tableState = getTableState(table.id);
  const item = getMenuItem(itemId);
  if (!item || !isServiceMenuItem(item)) {
    toast("That item is not available in the priced Holyoke menu.", "danger");
    return;
  }
  let seatNumber = Number(tableState.selectedSeat) || 1;
  if (item.requiresSeat && !seatNumber) {
    toast("Select a seat first", "danger");
    shake(els.menuGrid || els.tableDashboardPanel);
    return;
  }
  seatNumber = Math.max(1, seatNumber);
  tableState.selectedSeat = seatNumber;
  const category = options.categoryOverride || item.category;
  const order = {
    id: makeId("order"),
    tableId: table.id,
    tableName: table.name,
    seatNumber,
    category,
    itemId: item.id,
    itemName: item.name,
    shortName: item.shortName,
    posKey: item.posKey,
    modifiers,
    notes,
    status: "not_rung_in",
    createdAt: Date.now()
  };
  tableState.orders.push(order);
  tableState.posQueue.push({ ...order, queueStatus: "needs_rung_in", priority: isAppCategory(category) ? 1 : 2 });
  autoStatusAfterItem(table.id, { ...item, category });
  logEvent("item_added", table.id, order.seatNumber, item.id, { category, modifiers, notes });
  if (isAppCategory(category)) logEvent("app_added", table.id, order.seatNumber, item.id, {});
  if (item.requiresPrepStation) createPrepAlert(table, order, item);
  state.menuBuilder = null;
  markDirty();
  renderAll();
  toast(`${item.shortName} added to ${table.name} Seat ${order.seatNumber}`);
}

function shouldOpenMenuItemBuilder(item) {
  if (!Array.isArray(item.modifiers) || !item.modifiers.length) return isAppCategory(item.category);
  return getMenuBuilderGroups(item, { course: isAppCategory(item.category) ? "APP" : "" }).length > 0 || isAppCategory(item.category);
}

function createMenuBuilderState(tableId, itemId) {
  const item = getMenuItem(itemId);
  return {
    tableId,
    itemId,
    course: isAppCategory(item?.category) ? "APP" : "",
    selected: {},
    multi: {},
    notes: ""
  };
}

function getMenuBuilderGroups(item, builder = {}) {
  const modifiers = getUniqueList(item.modifiers || []);
  const used = new Set();
  const groups = [];
  const eggOptions = modifiers.filter(isEggOption);
  const proteinOptions = modifiers.filter((option) => isProteinOption(option) && !isAddOnOption(option));
  const sideOptions = modifiers.filter(isSideOption);
  const drinkOptions = modifiers.filter(isDrinkOption);
  if (eggOptions.length) groups.push(builderGroup("egg", "Egg Style", "single", eggOptions, used));
  if (proteinOptions.length) groups.push(builderGroup("protein", "Protein", "single", proteinOptions, used));
  if (sideOptions.length && (!isAppCategory(item.category) || builder.course === "ENTREE")) groups.push(builderGroup("side", "Side Choice", "single", sideOptions, used));
  if (isAppCategory(item.category) && builder.course === "ENTREE" && !sideOptions.length) groups.push(builderGroup("side", "Side Choice", "single", getDefaultPricedSideOptions(), used));
  if (drinkOptions.length) groups.push(builderGroup("drink", "Drink", "single", drinkOptions, used));
  const addOns = modifiers.filter((option) => !used.has(option) && (isAddOnOption(option) || isSauceOption(option) || isDressingOption(option)));
  if (addOns.length) groups.push(builderGroup("addons", "Add Ons / Mods", "multi", addOns.slice(0, 18), used));
  return groups.filter((group) => group.options.length);
}

function builderGroup(key, title, type, options, used) {
  const unique = getUniqueList(options);
  unique.forEach((option) => used.add(option));
  return { key, title, type, options: unique };
}

function getUniqueList(list) {
  return [...new Set(list.map((value) => String(value || "").trim()).filter(Boolean))];
}

function isEggOption(option) {
  const value = option.toLowerCase();
  return /\b(scrambled|sunny|over easy|over medium|over hard|egg white|no eggs?|2 eggs?)\b/.test(value);
}

function isProteinOption(option) {
  const value = option.toLowerCase();
  return /\b(bacon|sausage|ham|turkey bacon|no meat)\b/.test(value);
}

function isSideOption(option) {
  const value = option.toLowerCase();
  return /(hash brown|french fries|seasoned fries|red[- ]?skinned|potato|seasonal fruit|fresh seasonal fruit|no side|pancake|french toast|toast|english muffin|tortilla|onion ring|broccoli|whole grain rice|mac|corn|cup of soup|side salad)/.test(value);
}

function isDrinkOption(option) {
  const value = option.toLowerCase();
  return /(coke|sprite|dr pepper|root beer|coffee|decaf|orange juice|apple juice|lemonade|fruit punch|tea|milk|water)/.test(value);
}

function isAddOnOption(option) {
  const value = option.toLowerCase();
  return /^(add|extra|sub|no |side of|2 |4 )/.test(value) || value.includes("available");
}

function isSauceOption(option) {
  return /(sauce|ranch|bbq|buffalo|honey mustard|queso|salsa|sour cream|gravy)/i.test(option);
}

function isDressingOption(option) {
  return /(dressing|italian|balsamic|blue cheese)/i.test(option);
}

function getDefaultPricedSideOptions() {
  return getServiceMenuItems()
    .filter((item) => item.category === "SIDES")
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .slice(0, 14)
    .map((item) => item.shortName || item.name);
}

function autoStatusAfterItem(tableId, item) {
  const tableState = getTableState(tableId);
  if (item.category === "BEV" && allSeatsHaveDrink(tableState)) {
    setTableStatus(tableId, "Drinks Ordered", false);
    return;
  }
  if (isAppCategory(item.category)) {
    setTableStatus(tableId, "Order Taken", false);
    return;
  }
  if (isMealCategory(item.category)) {
    setTableStatus(tableId, "Order Taken", false);
    return;
  }
  if (tableState.status === "Open" || tableState.status === "Reset") setTableStatus(tableId, "Order Taken", false);
}

function syncTableStatusFromQueue(tableId) {
  const tableState = getTableState(tableId);
  const queue = tableState.posQueue.filter((item) => item.queueStatus !== "cancelled_removed");
  const foodItems = queue.filter(isFoodQueueItem);
  const appItems = queue.filter((item) => isAppCategory(item.category));
  const entreeItems = queue.filter((item) => isMealCategory(item.category));

  if (!queue.length && tableState.partySize === 0) {
    setTableStatus(tableId, "Open", false);
    return;
  }
  if (foodItems.length && foodItems.every((item) => isDeliveredQueueStatus(item.queueStatus))) {
    setTableStatus(tableId, "Check Back", false);
    scheduleCheckBackReminders(tableId);
    return;
  }
  if (foodItems.some((item) => isDeliveredQueueStatus(item.queueStatus) || item.queueStatus === "food_ready")) {
    setTableStatus(tableId, "Food Running", false);
    return;
  }
  if (entreeItems.some((item) => ["added_to_main_pos", "waiting_for_food"].includes(item.queueStatus))) {
    setTableStatus(tableId, "Waiting for Food", false);
    return;
  }
  if (entreeItems.some((item) => item.queueStatus === "needs_rung_in")) {
    setTableStatus(tableId, "Order Taken", false);
    return;
  }
  if (appItems.some((item) => ["added_to_main_pos", "waiting_for_food", "app_fired"].includes(item.queueStatus))) {
    setTableStatus(tableId, "Apps Fired", false);
    return;
  }
  if (queue.some((item) => item.category === "BEV" && ["added_to_main_pos", "rung_in"].includes(item.queueStatus))) {
    setTableStatus(tableId, "Drinks Ordered", false);
  }
}

function isFoodQueueItem(item) {
  return ["APPT", "DESSERT", "SIDES", "VEG/POT"].includes(item.category) || isMealCategory(item.category);
}

function isMealCategory(category) {
  return ["ENTREE", "BREAKFAST", "SLAMS", "OMELETTES", "SKILLETS", "PANCAKES", "BURGERS", "SANDWICHES", "DINNERS", "KIDS"].includes(category);
}

function isDrinkItem(item) {
  if (!item) return false;
  const menuItem = getMenuItem(item.itemId);
  const category = String(item.category || menuItem?.category || "").toUpperCase();
  const subcategory = String(menuItem?.subcategory || item.subcategory || "").toLowerCase();
  const name = `${item.itemName || ""} ${item.shortName || ""} ${menuItem?.name || ""}`.toLowerCase();
  return category === "BEV" || ["soft drinks", "coffee", "tea", "juice", "milkshakes", "specialty drinks", "water", "refills", "milk"].some((term) => subcategory.includes(term) || name.includes(term.slice(0, -1)));
}

function getDrinkOrders(tableId) {
  return getTableState(tableId).orders.filter(isDrinkItem).filter((order) => order.status !== "cancelled_removed");
}

function getUndeliveredDrinkOrders(tableId) {
  return getDrinkOrders(tableId).filter((order) => !isDeliveredQueueStatus(order.status));
}

function allDrinkItemsDelivered(tableId) {
  const drinks = getDrinkOrders(tableId);
  return drinks.length > 0 && drinks.every((order) => isDeliveredQueueStatus(order.status));
}

function canDeliverAllDrinks(tableId) {
  return state.settings.serviceWorkflow?.quickDrinkDelivery !== false && getDrinkOrders(tableId).length > 0 && getUndeliveredDrinkOrders(tableId).length > 0 && getTableState(tableId).partySize > 0;
}

function getTablesWithUndeliveredDrinks() {
  return state.layoutConfig.objects.filter((object) => object.category === "table" && canDeliverAllDrinks(object.id));
}

function isDeliveredQueueStatus(status) {
  return status === "delivered" || status === "completed";
}

function getQueueEventType(status) {
  const events = {
    added_to_main_pos: "item_added_to_main_pos",
    waiting_for_food: "item_waiting_for_food",
    food_ready: "food_ready",
    delivered: "item_delivered",
    cancelled_removed: "item_cancelled_removed",
    app_fired: "app_fired"
  };
  return events[status] || "pos_queue_status_changed";
}

function getPosStatusLabel(status) {
  return POS_STATUS_LABELS[status] || status.replaceAll("_", " ");
}

function cssQueueStatus(status) {
  return String(status || "needs_rung_in").replaceAll("_", "-");
}

function allSeatsHaveDrink(tableState) {
  if (!tableState.partySize) return false;
  return Array.from({ length: tableState.partySize }, (_, index) => index + 1).every((seat) => {
    return tableState.orders.some((order) => order.seatNumber === seat && order.category === "BEV");
  });
}

function renderMenuEditor() {
  if (!els.menuEditorList) return;
  els.menuCategoryInput.innerHTML = POS_CATEGORIES.map((category) => `<option value="${category}">${category}</option>`).join("");
  els.menuEditorCategoryFilter.innerHTML = `<option value="">All categories</option>` + POS_CATEGORIES.map((category) => `<option value="${category}" ${state.menuEditorCategory === category ? "selected" : ""}>${category}</option>`).join("");
  els.menuEditorSearchInput.value = state.menuEditorSearch || "";
  const query = (state.menuEditorSearch || "").toLowerCase();
  const items = getServiceMenuItems().filter((item) => {
    const haystack = [item.name, item.shortName, item.posKey, item.category, item.subcategory].join(" ").toLowerCase();
    return (!state.menuEditorCategory || item.category === state.menuEditorCategory) && (!query || haystack.includes(query));
  }).slice().sort((a, b) => a.sortOrder - b.sortOrder);
  els.menuEditorList.innerHTML = items.map((item) => `
    <div class="menu-editor-row">
      <strong>${escapeHtml(item.posKey)}</strong>
      <span>${escapeHtml(item.name)} (${item.category}${item.subcategory ? ` / ${escapeHtml(item.subcategory)}` : ""})</span>
      <div class="button-row compact">
        <button data-edit-menu="${item.id}" type="button">Edit</button>
        <button data-toggle-menu="${item.id}" type="button">${item.active ? "Disable" : "Enable"}</button>
        <button data-delete-menu="${item.id}" type="button">Delete</button>
      </div>
    </div>
  `).join("");
  els.menuEditorList.querySelectorAll("[data-edit-menu]").forEach((button) => button.addEventListener("click", () => loadMenuItemIntoForm(button.dataset.editMenu)));
  els.menuEditorList.querySelectorAll("[data-toggle-menu]").forEach((button) => button.addEventListener("click", () => {
    runAdminAction(() => {
      const item = state.menuConfig.items.find((entry) => entry.id === button.dataset.toggleMenu);
      item.active = !item.active;
      item.updatedAt = Date.now();
      logEvent("menu_item_toggled", null, null, item.id, { active: item.active });
      markDirty();
      renderAll();
    });
  }));
  els.menuEditorList.querySelectorAll("[data-delete-menu]").forEach((button) => button.addEventListener("click", () => runAdminAction(() => {
    const item = state.menuConfig.items.find((entry) => entry.id === button.dataset.deleteMenu);
    if (!item) return;
    showConfirm(`Delete ${item.name}?`, "Delete Item", () => {
      state.menuConfig.items = state.menuConfig.items.filter((entry) => entry.id !== item.id);
      logEvent("menu_item_deleted", null, null, item.id, {});
      markDirty();
      renderAll();
    });
  })));
}

// Orders
function renderOrders() {
  const active = getActiveTables();
  els.ordersList.innerHTML = active.length ? active.map((table) => {
    const tableState = getTableState(table.id);
    const activeMinutes = getActiveMinutes(tableState);
    const alertsCount = state.currentShift.alerts.filter((alert) => alert.tableId === table.id && alert.status !== "done").length;
    const itemCount = tableState.orders.filter((order) => order.status !== "cancelled_removed").length;
    return `
      <div class="order-card">
        <h4>${escapeHtml(table.name)}</h4>
        <p>Party of ${tableState.partySize || 0}</p>
        <p>Status: ${escapeHtml(tableState.status)}</p>
        <p>Active: ${activeMinutes}m</p>
        <p>Items: ${itemCount}</p>
        <p>Alerts: ${alertsCount}</p>
        <button class="primary" data-view-order="${table.id}" type="button">View Order</button>
      </div>
    `;
  }).join("") : `<div class="settings-card">No active tables yet. Seat a party from the floor.</div>`;
  els.ordersList.querySelectorAll("[data-view-order]").forEach((button) => button.addEventListener("click", () => showOrderDetail(button.dataset.viewOrder)));
}

function showOrderDetail(tableId) {
  const table = getTable(tableId);
  const tableState = getTableState(tableId);
  showModal(`
    <div class="panel-header">
      <div>
        <h2>${escapeHtml(table.name)}</h2>
        <p>Party of ${tableState.partySize || 0} - ${escapeHtml(tableState.status)}</p>
      </div>
      <button id="closeModalButton" type="button">Close</button>
    </div>
    ${renderSeatOrderSummary(tableState.orders)}
    <div class="modal-actions">
      <button class="primary" id="modalGuestCheckButton" type="button">Guest Check</button>
      <button id="modalOpenTableButton" type="button">Open Table</button>
      <button id="modalOpenPosButton" type="button">Open POS Queue</button>
      <button id="closeModalButton2" type="button">Close</button>
    </div>
  `);
  document.getElementById("modalGuestCheckButton").addEventListener("click", () => showGuestCheck(tableId));
  document.getElementById("modalOpenTableButton").addEventListener("click", () => { closeModal(); state.selectedTableId = tableId; setView("floor"); });
  document.getElementById("modalOpenPosButton").addEventListener("click", () => { closeModal(); state.selectedTableId = tableId; setView("pos"); });
  document.getElementById("closeModalButton").addEventListener("click", closeModal);
  document.getElementById("closeModalButton2").addEventListener("click", closeModal);
}

// POS Queue
function renderPosQueue() {
  const rows = getPosQueueRows();
  const pendingRows = rows.filter((row) => !isDeliveredQueueStatus(row.queueStatus) && row.queueStatus !== "cancelled_removed");
  const readyRows = rows.filter((row) => row.queueStatus === "food_ready");
  const waitingRows = rows.filter((row) => row.queueStatus === "waiting_for_food");
  const drinkActions = getTablesWithUndeliveredDrinks().map((table) => `
    <div class="pos-queue-card drink-round-card pos-feature-card">
      <div class="pos-card-top"><span class="pos-status-dot drink"></span><h4>${escapeHtml(table.name)} Drink Round</h4></div>
      <p>${getUndeliveredDrinkOrders(table.id).length} drinks not delivered</p>
      <button class="primary" data-deliver-drinks-table="${table.id}" type="button">Deliver Drinks</button>
    </div>
  `).join("");
  els.posQueueList.innerHTML = `
    <section class="pos-queue-summary">
      <div><span>Needs POS</span><strong>${pendingRows.filter((row) => row.queueStatus === "needs_rung_in").length}</strong></div>
      <div><span>Waiting Food</span><strong>${waitingRows.length}</strong></div>
      <div><span>Food Ready</span><strong>${readyRows.length}</strong></div>
      <div><span>Total Open</span><strong>${pendingRows.length}</strong></div>
    </section>
    ${rows.length || drinkActions ? `<section class="pos-queue-board">${drinkActions}${rows.map(renderPosQueueCard).join("")}</section>` : `<div class="empty-state">POS queue is clear.</div>`}
  `;
  bindPosQueueButtons();
}

function renderPosQueueCard(row) {
  const statusLabel = getPosStatusLabel(row.queueStatus);
  return `
    <article class="pos-queue-card priority-${row.priority} pos-status-${cssQueueStatus(row.queueStatus)} ${isDeliveredQueueStatus(row.queueStatus) ? "delivered" : ""}">
      <div class="pos-card-top">
        <span class="pos-status-dot ${cssQueueStatus(row.queueStatus)}"></span>
        <div><h4>${escapeHtml(row.tableName)} <small>Seat ${row.seatNumber || 1}</small></h4><p>${escapeHtml(getTableState(row.tableId).status)}</p></div>
      </div>
      <div class="pos-item-name">${escapeHtml(row.shortName || row.itemName || row.posKey)}</div>
      <div class="pos-meta-row"><span>${escapeHtml(row.category)}</span><strong>${escapeHtml(statusLabel)}</strong></div>
      ${row.modifiers.length ? `<p class="pos-mods">${escapeHtml(row.modifiers.join(", "))}</p>` : ""}
      <div class="pos-action-grid">
        <button data-added-main="${row.tableId}|${row.id}" type="button">In POS</button>
        <button data-waiting-food="${row.tableId}|${row.id}" type="button">Waiting</button>
        <button data-food-ready="${row.tableId}|${row.id}" type="button">Ready</button>
        <button class="primary" data-delivered="${row.tableId}|${row.id}" type="button">Delivered</button>
        <button data-check="${row.tableId}" type="button">Check</button>
      </div>
    </article>
  `;
}

function getPosQueueRows() {
  return Object.values(state.currentShift.tables).flatMap((tableState) => tableState.posQueue.map((item) => ({ ...item, tableName: getTable(item.tableId)?.name || item.tableName })))
    .sort((a, b) => a.priority - b.priority || a.tableName.localeCompare(b.tableName) || a.seatNumber - b.seatNumber);
}

function bindPosQueueButtons() {
  els.posQueueList.querySelectorAll("[data-deliver-drinks-table]").forEach((button) => button.addEventListener("click", () => confirmDeliverAllDrinks(button.dataset.deliverDrinksTable)));
  els.posQueueList.querySelectorAll("[data-added-main]").forEach((button) => button.addEventListener("click", () => updateQueueItem(button.dataset.addedMain, "added_to_main_pos")));
  els.posQueueList.querySelectorAll("[data-waiting-food]").forEach((button) => button.addEventListener("click", () => updateQueueItem(button.dataset.waitingFood, "waiting_for_food")));
  els.posQueueList.querySelectorAll("[data-food-ready]").forEach((button) => button.addEventListener("click", () => updateQueueItem(button.dataset.foodReady, "food_ready")));
  els.posQueueList.querySelectorAll("[data-delivered]").forEach((button) => button.addEventListener("click", () => updateQueueItem(button.dataset.delivered, "delivered")));
  els.posQueueList.querySelectorAll("[data-check]").forEach((button) => button.addEventListener("click", () => showGuestCheck(button.dataset.check)));
}

function updateQueueItem(key, status) {
  const [tableId, itemId] = key.split("|");
  const tableState = getTableState(tableId);
  const updatedAt = Date.now();
  const deliveredAtPatch = status === "delivered" || status === "completed" ? { deliveredAt: updatedAt } : {};
  tableState.posQueue = tableState.posQueue.map((item) => item.id === itemId ? { ...item, queueStatus: status, updatedAt, ...deliveredAtPatch } : item);
  tableState.orders = tableState.orders.map((item) => item.id === itemId ? { ...item, status, updatedAt, ...deliveredAtPatch } : item);
  const order = tableState.orders.find((item) => item.id === itemId);
  const eventType = getQueueEventType(status);
  logEvent(eventType, tableId, order?.seatNumber || null, itemId, { status });
  if (status === "delivered") logEvent(isDrinkItem(order) ? "drink_delivered" : "food_delivered", tableId, order?.seatNumber || null, itemId, {});
  syncTableStatusFromQueue(tableId);
  markDirty();
  renderAll();
}

function confirmDeliverAllDrinks(tableId) {
  if (!canDeliverAllDrinks(tableId)) return;
  if (state.settings.serviceWorkflow?.skipDrinkDeliveryConfirm) {
    deliverAllDrinks(tableId);
    return;
  }
  const table = getTable(tableId);
  showConfirm(`Deliver all drinks for ${table?.name || "this table"}?`, "Deliver Drinks", () => deliverAllDrinks(tableId));
}

function deliverAllDrinks(tableId) {
  const tableState = getTableState(tableId);
  const updatedAt = Date.now();
  const drinkIds = new Set(getUndeliveredDrinkOrders(tableId).map((order) => order.id));
  if (!drinkIds.size) return;
  tableState.orders = tableState.orders.map((order) => drinkIds.has(order.id) ? { ...order, status: "delivered", updatedAt, deliveredAt: updatedAt } : order);
  tableState.posQueue = tableState.posQueue.map((item) => drinkIds.has(item.id) ? { ...item, queueStatus: "delivered", updatedAt, deliveredAt: updatedAt } : item);
  drinkIds.forEach((id) => {
    const order = tableState.orders.find((item) => item.id === id);
    logEvent("drink_delivered", tableId, order?.seatNumber || null, id, { batch: true });
  });
  logEvent("drink_round_delivered", tableId, null, null, { count: drinkIds.size });
  if (allDrinkItemsDelivered(tableId)) setTableStatus(tableId, "Drinks Served", false);
  if (state.settings.serviceWorkflow?.orderReminderAfterDrinks !== false) {
    const minutes = clamp(state.settings.serviceWorkflow?.orderReminderAfterDrinksMinutes || 4, 1, 20);
    createTableReminder(tableId, "order_after_drinks", minutes, `${getTable(tableId)?.name || "Table"}: drinks are down. Check if guests are ready to order.`);
  }
  markDirty();
  renderAll();
  toast("Drink round delivered.");
}

function allMealItemsRungIn(tableId) {
  const tableState = getTableState(tableId);
  const mealItems = tableState.orders.filter((order) => isAppCategory(order.category) || ["ENTREE", "KIDS"].includes(order.category));
  return mealItems.length > 0 && mealItems.every((order) => ["added_to_main_pos", "waiting_for_food", "food_ready", "delivered", "completed"].includes(order.status));
}

// Guest Check
function showGuestCheck(tableId) {
  const table = getTable(tableId);
  const tableState = getTableState(tableId);
  if (!["Check Dropped", "Paid", "Bus Needed", "Reset", "Open"].includes(tableState.status)) {
    setTableStatus(tableId, "Check Dropped", false);
  }
  const subtotal = tableState.orders.reduce((sum, order) => sum + Number(getMenuItem(order.itemId)?.price || 0), 0);
  const tax = subtotal * 0.0825;
  const total = subtotal + tax;
  showModal(`
    <div class="guest-check">
      <div class="guest-check-title">GUEST CHECK</div>
      ${state.settings.branding?.useLogoOnGuestCheck && (state.settings.branding.logoDataUrl || state.settings.branding.logoAssetPath) ? `<div class="guest-check-logo"><img src="${state.settings.branding.logoDataUrl || state.settings.branding.logoAssetPath}" alt="" /></div>` : ""}
      <div class="guest-check-fields">
        <span>Date: ${new Date().toLocaleDateString()}</span>
        <span>Table: ${escapeHtml(table.name)}</span>
        <span>Guests: ${tableState.partySize || table.seats}</span>
        <span>Server: ${escapeHtml(state.profile.loggedIn ? state.profile.name : "Server")}</span>
        <span>Check #: ${tableState.checkNumber}</span>
      </div>
      <div class="guest-check-categories">${POS_CATEGORIES.join(" - ")}</div>
      ${tableState.orders.length ? tableState.orders.map((order) => `
        <div class="guest-check-row">
          <span>Seat ${order.seatNumber || 1}</span>
          <span>${escapeHtml(order.category)}</span>
          <span>${escapeHtml(order.shortName)}</span>
          <span>${escapeHtml([order.modifiers.join(", "), order.notes].filter(Boolean).join(" | "))}</span>
        </div>
      `).join("") : `<div class="guest-check-row"><span>No items</span></div>`}
      <div class="guest-check-totals"><span>Tax: ${subtotal ? `$${tax.toFixed(2)}` : "TBD"}</span><strong>Total: ${subtotal ? `$${total.toFixed(2)}` : "TBD"}</strong></div>
      <p class="guest-check-thanks">Thank you. Please come again</p>
    </div>
    <div class="modal-actions">
      <button class="primary" id="printGuestCheckButton" type="button">Print</button>
      <button id="copyGuestCheckButton" type="button">Copy</button>
      <button id="markGuestCheckRungButton" type="button">Mark Rung In</button>
      <button id="closeModalButton" type="button">Close</button>
    </div>
  `);
  document.getElementById("printGuestCheckButton").addEventListener("click", () => window.print());
  document.getElementById("copyGuestCheckButton").addEventListener("click", () => copyText(buildPosText(tableId)));
  document.getElementById("markGuestCheckRungButton").addEventListener("click", () => markTableRungIn(tableId));
  document.getElementById("closeModalButton").addEventListener("click", closeModal);
}

function showPosModal(tableId) {
  const table = getTable(tableId);
  const tableState = getTableState(tableId);
  const counts = countBy(tableState.posQueue, "queueStatus");
  const apps = tableState.posQueue.filter((item) => item.category === "APPT").length;
  showModal(`
    <div class="pos-summary">
      <h3>${escapeHtml(table.name)} POS Summary</h3>
      <p>Party size: ${tableState.partySize || 0}</p>
      <p>Status: ${escapeHtml(tableState.status)}</p>
      <p>Selected seat: ${tableState.selectedSeat || 1}</p>
      <div class="dashboard-stats">
        <div class="stat-card"><p>Not Rung In</p><h3>${counts.needs_rung_in || 0}</h3></div>
        <div class="stat-card"><p>Added to Main POS</p><h3>${counts.added_to_main_pos || counts.rung_in || 0}</h3></div>
        <div class="stat-card"><p>Waiting for Food</p><h3>${counts.waiting_for_food || 0}</h3></div>
        <div class="stat-card"><p>Delivered</p><h3>${(counts.delivered || 0) + (counts.completed || 0)}</h3></div>
        <div class="stat-card"><p>Priority Apps</p><h3>${apps}</h3></div>
      </div>
    </div>
    <div class="modal-actions">
      <button id="closeModalButton" type="button">Back</button>
      <button class="primary" id="goPosQueueButton" type="button">Go to POS Queue</button>
      <button id="expandTicketButton" type="button">Expand Full Ticket</button>
      <button id="copyModalPosButton" type="button">Copy POS Text</button>
    </div>
  `);
  document.getElementById("copyModalPosButton").addEventListener("click", () => copyText(buildPosText(tableId)));
  document.getElementById("goPosQueueButton").addEventListener("click", () => { closeModal(); setView("pos"); });
  document.getElementById("expandTicketButton").addEventListener("click", () => { closeModal(); state.selectedTableId = tableId; setView("orderworkspace"); });
  document.getElementById("closeModalButton").addEventListener("click", closeModal);
}

function buildPosText(tableId = null) {
  const tableIds = tableId ? [tableId] : Object.keys(state.currentShift.tables);
  return tableIds.map((id) => {
    const table = getTable(id);
    const tableState = getTableState(id);
    if (!tableState.orders.length) return "";
    const grouped = groupBy(tableState.orders, "seatNumber");
    return [`${table.name.toUpperCase()}`, ...Object.keys(grouped).sort((a, b) => Number(a) - Number(b)).flatMap((seat) => {
      const byCat = groupBy(grouped[seat], "category");
      return [``, `SEAT ${seat}`, ...Object.keys(byCat).map((category) => `${category}\n${byCat[category].map((order) => `- ${order.itemName}${order.modifiers.length ? `\n  Mods: ${order.modifiers.join(", ")}` : ""}`).join("\n")}`)];
    })].join("\n");
  }).filter(Boolean).join("\n\n");
}

function markTableRungIn(tableId) {
  const tableState = getTableState(tableId);
  tableState.orders = tableState.orders.map((order) => ({ ...order, status: "added_to_main_pos", updatedAt: Date.now() }));
  tableState.posQueue = tableState.posQueue.map((item) => ({ ...item, queueStatus: "added_to_main_pos", updatedAt: Date.now() }));
  logEvent("order_sent", tableId, null, null, {});
  syncTableStatusFromQueue(tableId);
  markDirty();
  renderAll();
  toast("Marked as rung in.");
}

function saveOrderModifiers(tableId, orderId, source = document) {
  const tableState = getTableState(tableId);
  const editor = source.querySelector(`[data-order-editor="${cssEscape(orderId)}"]`) || source;
  const modifiers = Array.from(editor.querySelectorAll("[data-edit-mod]:checked")).map((input) => input.dataset.editMod);
  const notes = editor.querySelector("#editOrderNotes")?.value.trim() || "";
  tableState.orders = tableState.orders.map((order) => order.id === orderId ? { ...order, modifiers, notes } : order);
  tableState.posQueue = tableState.posQueue.map((item) => item.id === orderId ? { ...item, modifiers, notes } : item);
  state.editingOrderId = null;
  logEvent("item_modified", tableId, null, orderId, { modifiers, notes });
  markDirty();
  renderAll();
}

function moveOrderItem(tableId, orderId, seatNumber) {
  const tableState = getTableState(tableId);
  tableState.orders = tableState.orders.map((order) => order.id === orderId ? { ...order, seatNumber } : order);
  tableState.posQueue = tableState.posQueue.map((item) => item.id === orderId ? { ...item, seatNumber } : item);
  state.movingOrderId = null;
  logEvent("item_moved", tableId, seatNumber, orderId, {});
  markDirty();
  renderAll();
}

function confirmRemoveOrder(tableId, orderId) {
  const order = getTableState(tableId).orders.find((item) => item.id === orderId);
  if (!order) return;
  showConfirm(`Remove ${order.shortName} from Seat ${order.seatNumber || 1}?`, "Remove", () => removeOrderItem(tableId, orderId));
}

function removeOrderItem(tableId, orderId) {
  const tableState = getTableState(tableId);
  const queueItem = tableState.posQueue.find((item) => item.id === orderId);
  const canRemoveCompletely = !queueItem || queueItem.queueStatus === "needs_rung_in";
  if (canRemoveCompletely) {
    tableState.orders = tableState.orders.filter((order) => order.id !== orderId);
    tableState.posQueue = tableState.posQueue.filter((item) => item.id !== orderId);
  } else {
    tableState.orders = tableState.orders.map((order) => order.id === orderId ? { ...order, status: "cancelled_removed" } : order);
    tableState.posQueue = tableState.posQueue.map((item) => item.id === orderId ? { ...item, queueStatus: "cancelled_removed" } : item);
  }
  logEvent("item_removed", tableId, null, orderId, {});
  syncTableStatusFromQueue(tableId);
  markDirty();
  renderAll();
}

// Alerts
function createPrepAlert(table, order, item) {
  const station = findPrepStation(item);
  const alert = {
    id: makeId("alert"),
    tableId: table.id,
    seatNumber: order.seatNumber,
    itemId: item.id,
    stationId: station?.id || item.prepStationId || "",
    message: `${table.name} Seat ${order.seatNumber} needs ${order.shortName}`,
    status: "unclaimed",
    claimedBy: null,
    createdAt: Date.now()
  };
  state.currentShift.alerts.unshift(alert);
  logEvent("alert_created", table.id, order.seatNumber, item.id, { stationId: alert.stationId });
  playChime();
  notifyUser({ type: "prep_alert", title: "Prep Alert", message: alert.message, tableId: table.id });
}

function createSystemAlert({ type, message, tableId = null, seatNumber = null, itemId = null }) {
  const alert = {
    id: makeId("alert"),
    type,
    tableId,
    seatNumber,
    itemId,
    stationId: "",
    message,
    status: "unclaimed",
    claimedBy: null,
    createdAt: Date.now()
  };
  state.currentShift.alerts.unshift(alert);
  notifyUser({ type, title: "TableFlow Reminder", message, tableId });
  return alert;
}

function scheduleCheckBackReminders(tableId) {
  const settings = getCheckBackSettings();
  if (!settings.enabled) return;
  const tableState = getTableState(tableId);
  if (tableState.checkBack?.deliveredAt && tableState.checkBack.reminders?.length) return;
  const deliveredAt = Date.now();
  const times = getCheckBackTimings();
  tableState.checkBack = {
    deliveredAt,
    reminders: [
      checkBackReminder("first_check_back", deliveredAt + times.firstCheckMinutes * 60000),
      checkBackReminder("refill_check", deliveredAt + times.refillCheckMinutes * 60000),
      checkBackReminder("second_check_back", deliveredAt + times.secondCheckMinutes * 60000),
      checkBackReminder("dessert_check_drop_suggestion", deliveredAt + times.dessertSuggestMinutes * 60000)
    ]
  };
  logEvent("check_back_scheduled", tableId, null, null, times);
}

function checkBackReminder(type, dueAt) {
  return { id: makeId("checkback"), type, dueAt, status: "scheduled", alertedAt: null, completedAt: null, snoozedUntil: null };
}

function processCheckBackReminders() {
  const settings = getCheckBackSettings();
  if (!settings.enabled) return;
  const now = Date.now();
  Object.values(state.currentShift.tables).forEach((tableState) => {
    const table = getTable(tableState.tableId);
    if (!table || !tableState.checkBack?.reminders?.length) return;
    tableState.checkBack.reminders.forEach((reminder) => {
      if (["completed", "dismissed"].includes(reminder.status)) return;
      const dueAt = reminder.snoozedUntil || reminder.dueAt;
      if (dueAt <= now && reminder.status === "scheduled") {
        reminder.status = "due";
        reminder.alertedAt = now;
        createSystemAlert({ type: reminder.type, tableId: table.id, message: checkBackMessage(table, reminder.type) });
        logEvent(checkBackDueEvent(reminder.type), table.id, null, null, { reminderId: reminder.id });
        setTableStatus(table.id, reminder.type === "refill_check" ? "Refill Check Due" : "Check Back Due", false);
        if (settings.chimeEnabled) playChime();
        markDirty();
      }
      if (reminder.status === "due" && now - (reminder.alertedAt || dueAt) >= 5 * 60000) {
        reminder.status = "overdue";
        setTableStatus(table.id, "Check Back Overdue", false);
        logEvent("check_back_overdue", table.id, null, null, { reminderId: reminder.id, type: reminder.type });
        markDirty();
      }
    });
  });
}

function renderCheckBackPanel(tableId, display) {
  return `
    <div class="checkback-panel ${display.overdue ? "overdue" : ""}">
      <h3>${escapeHtml(display.label)}</h3>
      <p>${escapeHtml(display.message)}</p>
      <div class="panel-actions three">
        <button class="primary" data-checkback-action="checked" type="button">Checked Back</button>
        <button data-checkback-action="refill" type="button">Refill Done</button>
        <button data-checkback-action="needs" type="button">Guest Needs Something</button>
      </div>
      <div class="panel-actions">
        <button data-checkback-action="snooze2" type="button">Snooze 2 Min</button>
        <button data-checkback-action="snooze5" type="button">Snooze 5 Min</button>
      </div>
    </div>
  `;
}

function handleCheckBackAction(tableId, action) {
  const tableState = getTableState(tableId);
  const active = getActiveCheckBackReminder(tableId);
  if (!active) return;
  if (action === "snooze2" || action === "snooze5") {
    const minutes = action === "snooze2" ? 2 : 5;
    active.snoozedUntil = Date.now() + minutes * 60000;
    active.status = "scheduled";
    logEvent("check_back_snoozed", tableId, null, null, { type: active.type, minutes });
    toast(`Check back snoozed ${minutes} minutes.`);
  } else if (action === "needs") {
    active.status = "completed";
    active.completedAt = Date.now();
    createSystemAlert({ type: "guest_needs_something", tableId, message: `${getTable(tableId).name}: guest needs something. Check refill, sauce, missing item, food issue, or manager help.` });
    logEvent("guest_needs_something", tableId, null, null, { type: active.type });
    setTableStatus(tableId, "Check Back Done", false);
  } else {
    active.status = "completed";
    active.completedAt = Date.now();
    logEvent(action === "refill" ? "refill_check_completed" : "check_back_completed", tableId, null, null, { type: active.type });
    setTableStatus(tableId, "Check Back Done", false);
  }
  markDirty();
  renderAll();
}

function getActiveCheckBackReminder(tableId) {
  const reminders = getTableState(tableId).checkBack?.reminders || [];
  return reminders.find((reminder) => ["due", "overdue"].includes(reminder.status)) || null;
}

function getNextScheduledCheckBack(tableId) {
  const reminders = getTableState(tableId).checkBack?.reminders || [];
  return reminders
    .filter((reminder) => reminder.status === "scheduled")
    .sort((a, b) => (a.snoozedUntil || a.dueAt) - (b.snoozedUntil || b.dueAt))[0] || null;
}

function getCheckBackDisplayState(tableId) {
  const active = getActiveCheckBackReminder(tableId);
  if (!active) return null;
  return {
    label: active.type === "refill_check" ? "Refill Check" : active.status === "overdue" ? "Check Back Overdue" : "Check Back",
    message: checkBackMessage(getTable(tableId), active.type),
    overdue: active.status === "overdue",
    pulse: getCheckBackSettings().pulseTable
  };
}

function checkBackMessage(table, type) {
  const name = table?.name || "Table";
  const messages = {
    first_check_back: `${name}: quick check back. Make sure everything came out okay.`,
    refill_check: `${name}: refill check. Drinks, sauces, napkins?`,
    second_check_back: `${name}: second check back. See if they need anything else.`,
    dessert_check_drop_suggestion: `${name}: ready for dessert offer or check soon?`
  };
  return messages[type] || `${name}: check back when you get a chance.`;
}

function checkBackDueEvent(type) {
  return type === "refill_check" ? "refill_check_due" : "check_back_due";
}

function renderStations() {
  const activeAlerts = getRoleAlerts();
  els.stationsList.innerHTML = state.layoutConfig.stations.map((station) => `<div class="station-summary"><h4>${escapeHtml(station.name)}</h4><p>${station.type}</p><p>Capabilities: ${(station.capabilities || []).join(", ") || "Server section"}</p><p>Active alerts: ${activeAlerts.filter((alert) => alert.stationId === station.id).length}</p></div>`).join("");
  updateNotificationBubble();
}

function updateNotificationBubble() {
  const count = getRoleAlerts().length;
  if (!els.alertsButton || !els.alertCount) return;
  els.alertCount.textContent = count;
  els.alertsButton.classList.toggle("hidden", count === 0);
  els.alertsButton.classList.toggle("pulse", count > 0);
}

function showAlertsDrawer() {
  const activeAlerts = getRoleAlerts();
  showModal(`
    <div class="flow-header">
      <div><h3>Notifications</h3><p>${activeAlerts.length} active service ${activeAlerts.length === 1 ? "notification" : "notifications"}</p></div>
      <button id="closeModalButton" type="button">Close</button>
    </div>
    <div class="alert-drawer-list">
      ${activeAlerts.length ? activeAlerts.map((alert) => `
        <div class="alert-card compact-alert-card">
          <h4>${escapeHtml(alert.message)}</h4>
          <p>${escapeHtml(alert.status)}${alert.claimedBy ? ` by ${escapeHtml(alert.claimedBy)}` : ""}</p>
          <div class="alert-actions">
            <button data-claim-alert="${alert.id}" type="button">Claim</button>
            <button class="primary" data-done-alert="${alert.id}" type="button">Done</button>
          </div>
        </div>
      `).join("") : `<div class="empty-state">No active notifications.</div>`}
    </div>
  `);
  document.getElementById("closeModalButton").addEventListener("click", closeModal);
  document.querySelectorAll("[data-claim-alert]").forEach((button) => button.addEventListener("click", () => updateAlert(button.dataset.claimAlert, "claimed")));
  document.querySelectorAll("[data-done-alert]").forEach((button) => button.addEventListener("click", () => updateAlert(button.dataset.doneAlert, "done")));
}

function getRoleAlerts() {
  const role = currentRole();
  const assigned = new Set(getCurrentAssignedTableIds());
  return (state.currentShift.alerts || []).filter((alert) => {
    if (alert.status === "done") return false;
    if (role === "General Manager" || role === "Manager" || role === "Supervisor" || role === "PIC") return true;
    if (role === "Server") return !alert.tableId || assigned.has(alert.tableId) || ["sidework_due", "prep_alert", "message", "table_sat_for_you", "checkback"].includes(alert.type);
    if (role === "Host") return ["seating", "waitlist", "table_sat", "manager_request", "message"].includes(alert.type) || !alert.tableId;
    if (role === "Dishwasher") return ["dish", "sidework_due", "message"].includes(alert.type);
    return true;
  });
}

function updateAlert(alertId, status) {
  const alert = state.currentShift.alerts.find((item) => item.id === alertId);
  if (!alert) return;
  alert.status = status === "claimed" ? "claimed" : "done";
  alert.claimedBy = status === "claimed" ? "Available server" : alert.claimedBy;
  logEvent(status === "claimed" ? "alert_claimed" : "alert_completed", alert.tableId, alert.seatNumber, alert.itemId, { alertId });
  markDirty();
  renderAll();
}

// Messages
function renderMessages() {
  if (!els.messagesPanel) return;
  const messages = state.messages.slice().sort((a, b) => b.createdAt - a.createdAt);
  els.messagesPanel.innerHTML = `
    <section class="settings-card message-compose">
      <h4>Send Local Message</h4>
      <div class="form-grid">
        <label class="field"><span>Type</span><select id="messageTypeInput"><option>General</option><option>Table Help</option><option>Side Work</option><option>Manager Needed</option><option>Kitchen Note</option></select></label>
        <label class="field"><span>Target</span><select id="messageTargetInput"><option>All</option><option>Managers</option><option>Servers</option><option>Hosts</option><option>Station 1</option><option>Station 2</option><option>Kitchen</option></select></label>
        <label class="field wide"><span>Message</span><textarea id="messageTextInput" rows="3" placeholder="Example: Can someone run food to Table 7?"></textarea></label>
      </div>
      <button class="primary" id="sendLocalMessageButton" type="button">Send Message</button>
    </section>
    <section class="settings-card">
      <div class="section-header"><h3>Message Log</h3><p>${messages.length} local messages saved on this device.</p></div>
      <div class="message-list">
        ${messages.length ? messages.map(renderMessageCard).join("") : `<div class="empty-soft">No messages yet.</div>`}
      </div>
    </section>
  `;
  document.getElementById("sendLocalMessageButton").addEventListener("click", sendLocalMessage);
  els.messagesPanel.querySelectorAll("[data-mark-message-read]").forEach((button) => button.addEventListener("click", () => markMessageRead(button.dataset.markMessageRead)));
}

function renderMessageCard(message) {
  const read = (message.readBy || []).includes(state.activeUser?.id || "local");
  return `
    <article class="message-card ${read ? "read" : ""}">
      <div>
        <strong>${escapeHtml(message.type)} - ${escapeHtml(message.target)}</strong>
        <p>${escapeHtml(message.text)}</p>
        <small>${escapeHtml(message.senderName)} - ${new Date(message.createdAt).toLocaleString()}</small>
      </div>
      <button data-mark-message-read="${message.id}" type="button">${read ? "Read" : "Mark Read"}</button>
    </article>
  `;
}

function sendLocalMessage() {
  const text = document.getElementById("messageTextInput").value.trim();
  if (!text) return toast("Write a message first.", "danger");
  const message = {
    id: makeId("message"),
    restaurantId: state.restaurantData?.id || "local-restaurant",
    senderUserId: state.activeUser?.id || "local",
    senderName: state.profile.name || state.activeUser?.name || "Server",
    target: document.getElementById("messageTargetInput").value,
    type: document.getElementById("messageTypeInput").value,
    text,
    createdAt: Date.now(),
    readBy: []
  };
  state.messages.unshift(message);
  logEvent("message_sent", null, null, null, { target: message.target, type: message.type });
  notifyUser({ type: "message", title: "New TableFlow Message", message: `${message.senderName}: ${message.text}` });
  markDirty();
  renderAll();
}

function markMessageRead(messageId) {
  const message = state.messages.find((item) => item.id === messageId);
  if (!message) return;
  const userId = state.activeUser?.id || "local";
  message.readBy = [...new Set([...(message.readBy || []), userId])];
  markDirty();
  renderMessages();
}

function getUnreadMessages() {
  const userId = state.activeUser?.id || "local";
  return state.messages.filter((message) => !(message.readBy || []).includes(userId));
}

function notifyUser({ type = "general", title = "TableFlow", message = "", tableId = null }) {
  const settings = getNotificationSettings();
  if (!state.settings.notifications) return;
  const key = `${type}|${tableId || ""}|${message}`;
  const now = Date.now();
  if (state.notificationCooldowns[key] && now - state.notificationCooldowns[key] < settings.cooldownMs) return;
  state.notificationCooldowns[key] = now;
  if (settings.inAppAlerts !== false) toast(message || title);
  if (settings.pushNotifications) sendBrowserNotification(title, message, key);
  if (settings.voiceNotifications) speakNotification(formatNarration(message || title, type));
}

function getNotificationSettings() {
  return { ...createDefaults().settings.notificationSettings, ...(state.settings.notificationSettings || {}) };
}

function sendBrowserNotification(title, body, tag = "tableflow") {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, tag, silent: true });
  } catch {
    toast("Browser notification could not be shown here.", "danger");
  }
}

async function requestPushNotifications() {
  const support = getNotificationSupport();
  if (!support.supported) {
    toast(support.message, "danger");
    renderSettings();
    return;
  }
  if (support.iosNeedsHomeScreen) {
    toast("Install TableFlow to Home Screen to enable iOS notifications.", "danger");
    renderSettings();
    return;
  }
  try {
    const permission = await Notification.requestPermission();
    state.settings.notificationSettings.pushNotifications = permission === "granted";
    saveAll(true);
    renderAll();
    toast(permission === "granted" ? "Push notifications enabled for this browser." : "Notifications were not enabled.", permission === "granted" ? "ok" : "danger");
  } catch {
    toast("Notification permission request failed. In-app alerts will still work.", "danger");
  }
}

function getNotificationSupport() {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isStandalone = Boolean(window.navigator.standalone) || window.matchMedia?.("(display-mode: standalone)")?.matches;
  if (!("Notification" in window)) return { supported: false, isIOS, isStandalone, iosNeedsHomeScreen: false, message: "Browser notifications are not supported here. In-app alerts will still work." };
  if (isIOS && !isStandalone) return { supported: true, isIOS, isStandalone, iosNeedsHomeScreen: true, message: "Add TableFlow to your Home Screen to enable app-style notifications on iOS." };
  return { supported: true, isIOS, isStandalone, iosNeedsHomeScreen: false, message: `Browser notification permission: ${Notification.permission}` };
}

function testNotification() {
  const message = "Reminder Table 7 Timer Up";
  notifyUser({ type: "test", title: "TableFlow Test", message });
  if (getNotificationSettings().pushNotifications && Notification.permission !== "granted") requestPushNotifications();
}

function speakNotification(text) {
  if (!("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.volume = Math.min(1, Math.max(0, Number(state.settings.chimeVolume || 0.35) + 0.35));
    window.speechSynthesis.speak(utterance);
  } catch {
    toast("Voice narration is not available in this browser.", "danger");
  }
}

function formatNarration(message, type) {
  if (getNotificationSettings().voiceMode === "friendly") return `TableFlow reminder. ${message}`;
  return String(message).replace(/:/g, "");
}

// Side Work
function renderSideWork() {
  if (!els.sideWorkPanel || !state.currentShift?.sideWork) return;
  ensureSideWorkInstances(state.currentShift.sideWork, getWorkSchedule());
  updateSuggestedSideWork();
  const summary = getShiftSummary();
  const tasks = getSideWorkRows();
  const focus = getFocusSideWork(tasks);
  const upcoming = tasks.filter((row) => row.bucket === "upcoming").slice(0, 8);
  const completed = tasks.filter((row) => ["Done", "Skipped"].includes(row.instance.status));
  const allTasks = tasks.filter((row) => row.template.active);
  els.sideWorkPanel.innerHTML = `
    <div class="sidework-grid">
      <section class="sidework-card shift-progress-card">
        <h4>Today's Shift</h4>
        <p>${escapeHtml(summary.scheduleText)}</p>
        <div class="progress-track"><span style="width:${summary.percent}%"></span></div>
        <p>${summary.percent}% complete - ${escapeHtml(summary.timeLeft)} left</p>
        <p>Station: ${escapeHtml(getCurrentStationName())}</p>
        <p>Side work: ${summary.doneCount}/${summary.totalCount} done</p>
        <strong>${focus[0] ? `Next: ${escapeHtml(focus[0].template.title)}` : "You're caught up for now."}</strong>
      </section>
      <section class="sidework-card focus-card">
        <h4>Focus Now</h4>
        <p class="muted">One to three useful things. No chaos list.</p>
        ${focus.length ? focus.map(renderSideWorkTaskCard).join("") : `<div class="empty-soft">You're caught up for now.</div>`}
      </section>
      <details class="sidework-card" open>
        <summary>Upcoming</summary>
        ${upcoming.length ? upcoming.map(renderSideWorkTaskCard).join("") : `<div class="empty-soft">No upcoming tasks assigned to this station.</div>`}
      </details>
      <details class="sidework-card">
        <summary>Completed</summary>
        ${completed.length ? completed.map(renderSideWorkTaskCard).join("") : `<div class="empty-soft">Completed tasks will collect here.</div>`}
      </details>
      <details class="sidework-card">
        <summary>All Tasks</summary>
        ${allTasks.length ? allTasks.map(renderSideWorkTaskCard).join("") : `<div class="empty-soft">No side work tasks configured yet.</div>`}
      </details>
    </div>
  `;
  els.sideWorkPanel.querySelectorAll("[data-sidework-action]").forEach((button) => button.addEventListener("click", () => {
    const [action, instanceId] = button.dataset.sideworkAction.split("|");
    updateSideWorkTask(instanceId, action);
  }));
  els.sideWorkPanel.querySelectorAll("[data-sidework-snooze]").forEach((button) => button.addEventListener("click", () => {
    const [instanceId, minutes] = button.dataset.sideworkSnooze.split("|");
    snoozeSideWorkTask(instanceId, Number(minutes));
  }));
}

function renderSideWorkTaskCard(row) {
  const dueText = formatDueTime(row.instance.dueAt);
  const statusClass = cssStatus(row.instance.status);
  return `
    <article class="sidework-task sidework-${statusClass}">
      <div>
        <strong>${escapeHtml(row.template.title)}</strong>
        <p>${escapeHtml(row.template.stationName)} - ${escapeHtml(row.template.category)}</p>
        <p>${escapeHtml(row.template.description)}</p>
        <small>Due ${escapeHtml(dueText)} - about ${row.template.estimatedMinutes}m - ${escapeHtml(row.template.priority)}</small>
      </div>
      <span class="status-pill">${escapeHtml(row.instance.status)}</span>
      <div class="sidework-actions">
        <button data-sidework-action="start|${row.instance.id}" type="button">Start</button>
        <button class="primary" data-sidework-action="done|${row.instance.id}" type="button">Done</button>
        <button data-sidework-snooze="${row.instance.id}|10" type="button">Snooze 10</button>
        <button data-sidework-snooze="${row.instance.id}|15" type="button">Snooze 15</button>
        <button data-sidework-snooze="${row.instance.id}|30" type="button">Snooze 30</button>
        <button data-sidework-action="help|${row.instance.id}" type="button">Ask for Help</button>
        <button data-sidework-action="skip|${row.instance.id}" type="button">Not My Station</button>
      </div>
    </article>
  `;
}

function ensureSideWorkInstances(sideWork, schedule) {
  const shift = getShiftWindow(schedule);
  const existingKeys = new Set(sideWork.taskInstances.map((instance) => `${instance.templateId}|${instance.dueAt}`));
  sideWork.taskTemplates.filter((task) => task.active).forEach((template) => {
    getTaskDueTimes(template, shift).forEach((dueAt) => {
      const key = `${template.id}|${dueAt}`;
      if (existingKeys.has(key)) return;
      sideWork.taskInstances.push({
        id: makeId("sidework"),
        templateId: template.id,
        dueAt,
        dueEndAt: dueAt + template.dueWindowMinutes * 60000,
        status: "Not Started",
        startedAt: null,
        completedAt: null,
        snoozedUntil: null,
        reminderShownAt: null,
        note: ""
      });
      existingKeys.add(key);
    });
  });
}

function getTaskDueTimes(template, shift) {
  const start = shift.start;
  const end = shift.end;
  const duration = end - start;
  if (template.timingType === "shift_start") return [start + 15 * 60000];
  if (template.timingType === "shift_middle") return [start + duration / 2];
  if (template.timingType === "pre_rush") return [start + duration * 0.28];
  if (template.timingType === "post_rush") return [start + duration * 0.62];
  if (template.timingType === "before_shift_end") return [end - Math.max(15, template.timingOffsetMinutes) * 60000];
  if (template.timingType === "fixed_time") return [combineDateAndTime(new Date(start), template.fixedTime || "21:00", end)];
  if (template.timingType === "repeating") {
    const every = Math.max(30, template.timingOffsetMinutes || 120) * 60000;
    const times = [];
    for (let due = start + every; due < end - 15 * 60000; due += every) times.push(due);
    return times.length ? times : [start + every];
  }
  return [start + Math.max(0, template.timingOffsetMinutes) * 60000];
}

function getSideWorkRows() {
  const templates = Object.fromEntries(state.currentShift.sideWork.taskTemplates.map((task) => [task.id, task]));
  const now = Date.now();
  const stationId = getCurrentStationId();
  return state.currentShift.sideWork.taskInstances.map((instance) => {
    const template = templates[instance.templateId];
    if (!template) return null;
    const isOwnStation = !template.stationId || template.stationId === stationId || template.stationName === state.profile.station;
    const effectiveDue = instance.snoozedUntil || instance.dueAt;
    const bucket = ["Done", "Skipped"].includes(instance.status) ? "completed" : effectiveDue <= now + 15 * 60000 ? "focus" : "upcoming";
    return { template, instance, isOwnStation, effectiveDue, bucket };
  }).filter(Boolean).sort((a, b) => Number(b.isOwnStation) - Number(a.isOwnStation) || priorityRank(b.template.priority) - priorityRank(a.template.priority) || a.effectiveDue - b.effectiveDue);
}

function getFocusSideWork(rows) {
  const limit = Math.max(1, Math.min(3, Number(state.settings.sideWork?.maxFocusTasks) || 3));
  const stationRows = rows.filter((row) => row.bucket === "focus" && row.isOwnStation && !["Done", "Skipped"].includes(row.instance.status));
  const fallback = rows.filter((row) => row.bucket === "focus" && !["Done", "Skipped"].includes(row.instance.status));
  return (stationRows.length ? stationRows : fallback).slice(0, limit);
}

function updateSuggestedSideWork() {
  const now = Date.now();
  let changed = false;
  getSideWorkRows().forEach((row) => {
    if (row.instance.status === "Not Started" && (row.instance.snoozedUntil || row.instance.dueAt) <= now + 15 * 60000) {
      row.instance.status = "Suggested Now";
      logEvent("sidework_task_suggested", null, null, row.template.id, { instanceId: row.instance.id });
      changed = true;
    }
  });
  if (changed) markDirty();
}

function processSideWorkReminders() {
  if (!state.settings.sideWork?.remindersEnabled) return;
  const now = Date.now();
  getSideWorkRows().filter((row) => !["Done", "Skipped"].includes(row.instance.status)).forEach((row) => {
    const dueAt = row.instance.snoozedUntil || row.instance.dueAt;
    if (dueAt > now || row.instance.reminderShownAt && now - row.instance.reminderShownAt < 20 * 60000) return;
    row.instance.reminderShownAt = now;
    row.instance.status = row.instance.status === "Not Started" ? "Suggested Now" : row.instance.status;
    const message = sideWorkReminderMessage(row.template);
    createSystemAlert({ type: "sidework_due", message, tableId: null, itemId: row.template.id });
    logEvent("sidework_reminder_triggered", null, null, row.template.id, { instanceId: row.instance.id });
    if (state.settings.sideWork.chimeEnabled !== false) playChime();
    markDirty();
  });
}

function sideWorkReminderMessage(task) {
  const style = state.settings.sideWork?.reminderStyle || getWorkSchedule().reminderStyle || "gentle";
  if (style === "manager") return `${task.stationName}: ${task.title} is due. Mark done when complete.`;
  if (style === "normal") return `${task.title} for ${task.stationName}.`;
  return `Tiny side quest: ${task.title.toLowerCase()} when you get a sec.`;
}

function updateSideWorkTask(instanceId, action) {
  const row = getSideWorkRows().find((item) => item.instance.id === instanceId);
  if (!row) return;
  const eventMap = { start: "sidework_task_started", done: "sidework_task_completed", skip: "sidework_task_skipped", help: "sidework_help_requested" };
  if (action === "start") {
    row.instance.status = "In Progress";
    row.instance.startedAt = row.instance.startedAt || Date.now();
  }
  if (action === "done") {
    row.instance.status = "Done";
    row.instance.completedAt = Date.now();
  }
  if (action === "skip") row.instance.status = "Skipped";
  if (action === "help") row.instance.status = "Needs Help";
  logEvent(eventMap[action] || "sidework_updated", null, null, row.template.id, { instanceId });
  markDirty();
  renderAll();
}

function snoozeSideWorkTask(instanceId, minutes) {
  const row = getSideWorkRows().find((item) => item.instance.id === instanceId);
  if (!row) return;
  row.instance.snoozedUntil = Date.now() + minutes * 60000;
  row.instance.status = "Not Started";
  logEvent("sidework_task_snoozed", null, null, row.template.id, { instanceId, minutes });
  markDirty();
  renderAll();
  toast(`Snoozed ${minutes} minutes.`);
}

function addSideWorkTaskFromSetup() {
  const title = els.sideWorkTitleInput.value.trim();
  if (!title) return toast("Add a side work task title first.", "danger");
  const task = normalizeSideWorkTemplate({
    id: makeId("task"),
    title,
    description: els.sideWorkDescriptionInput.value.trim(),
    stationId: els.sideWorkStationIdInput.value.trim(),
    stationName: els.sideWorkStationNameInput.value.trim() || "Any station",
    role: els.sideWorkRoleInput.value.trim() || "Server",
    timingType: els.sideWorkTimingTypeInput.value,
    timingOffsetMinutes: Number(els.sideWorkOffsetInput.value) || 0,
    dueWindowMinutes: Number(els.sideWorkWindowInput.value) || 30,
    priority: els.sideWorkPriorityInput.value,
    repeat: els.sideWorkTimingTypeInput.value === "repeating" ? "repeating" : "once",
    estimatedMinutes: Number(els.sideWorkEstimateInput.value) || 5,
    required: true,
    category: els.sideWorkCategoryInput.value.trim() || "Running Side Work",
    active: true
  });
  state.currentShift.sideWork.taskTemplates.push(task);
  ensureSideWorkInstances(state.currentShift.sideWork, getWorkSchedule());
  logEvent("sidework_task_created", null, null, task.id, {});
  markDirty();
  renderAll();
  toast("Side work task added.");
}

// Analytics
function logEvent(type, tableId = null, seatNumber = null, itemId = null, metadata = {}) {
  state.analytics.events.push({ id: makeId("event"), type, tableId, seatNumber, itemId, timestamp: Date.now(), metadata });
}

function renderAnalytics() {
  const events = getAnalyticsEvents();
  const tablesServed = new Set(events.filter((e) => e.type === "paid" || e.type === "table_reset").map((e) => e.tableId)).size;
  const guestsServed = events.filter((e) => e.type === "table_seated").reduce((sum, e) => sum + Number(e.metadata.partySize || 0), 0);
  const ordersSent = events.filter((e) => e.type === "order_sent").length;
  const appsFired = events.filter((e) => e.type === "app_fired").length;
  const alertsCompleted = events.filter((e) => e.type === "alert_completed").length;
  const sideWorkDone = events.filter((e) => e.type === "sidework_task_completed").length;
  const sideWorkSkipped = events.filter((e) => e.type === "sidework_task_skipped").length;
  const checkBackDone = events.filter((e) => e.type === "check_back_completed").length;
  const checkBackDue = events.filter((e) => e.type === "check_back_due").length;
  const refillDone = events.filter((e) => e.type === "refill_check_completed").length;
  const itemCounts = countBy(events.filter((e) => e.type === "item_added"), "itemId");
  const mostItemId = Object.keys(itemCounts).sort((a, b) => itemCounts[b] - itemCounts[a])[0];
  const mostItem = mostItemId ? getMenuItem(mostItemId)?.shortName || mostItemId : "None";
  els.analyticsCards.innerHTML = [
    ["Tables Served", tablesServed],
    ["Guests Served", guestsServed],
    ["Average Turn Time", estimateAverageTurn(events)],
    ["Longest Table", getLongestActiveTable()],
    ["Average Greet Time", estimateStageTime(events, "table_seated", "greeted")],
    ["Average Drink Time", estimateStageTime(events, "drinks_ordered", "drinks_served")],
    ["Orders Sent", ordersSent],
    ["Apps Fired", appsFired],
    ["Alerts Completed", alertsCompleted],
    ["Most Ordered Item", mostItem],
    ["Side Work Done", sideWorkDone],
    ["Side Work Skipped", sideWorkSkipped],
    ["Check Backs Done", checkBackDone],
    ["Check Back Rate", checkBackDue ? `${Math.round((checkBackDone / checkBackDue) * 100)}%` : "0%"],
    ["Refills Done", refillDone],
    ["Avg Eating Time", estimateAverageEatingMinutes() ? `${Math.round(estimateAverageEatingMinutes())}m` : "0m"]
  ].map(([label, value]) => `<div class="stat-card"><p>${label}</p><h3>${value}</h3></div>`).join("");
  renderAnalyticsBars(events);
}

function renderAnalyticsBars(events) {
  const counts = countBy(events.filter((e) => e.type === "item_added"), "itemId");
  const max = Math.max(1, ...Object.values(counts));
  els.analyticsBars.innerHTML = `<h3>Most Ordered Items</h3>${Object.entries(counts).slice(0, 8).map(([itemId, count]) => `<div class="bar-row"><span>${escapeHtml(getMenuItem(itemId)?.shortName || itemId)}</span><div><i style="width:${(count / max) * 100}%"></i></div><strong>${count}</strong></div>`).join("") || "<p>No item data yet.</p>"}`;
}

function getAnalyticsEvents() {
  const now = Date.now();
  const startToday = new Date().setHours(0, 0, 0, 0);
  const range = state.analyticsRange;
  return state.analytics.events.filter((event) => {
    if (range === "all") return true;
    if (range === "shift") return event.timestamp >= state.currentShift.startedAt;
    if (range === "today") return event.timestamp >= startToday;
    return event.timestamp >= now - Number(range) * 86400000;
  });
}

// Settings
function renderSettings() {
  if (els.snapToggle) els.snapToggle.checked = state.settings.snap !== false;
  if (els.gridToggle) els.gridToggle.checked = state.settings.showGrid !== false;
  els.themeToggle.checked = state.settings.theme === "light";
  els.notificationsToggle.checked = state.settings.notifications;
  const notify = getNotificationSettings();
  els.inAppAlertsToggle.checked = notify.inAppAlerts !== false;
  els.pushNotificationsToggle.checked = Boolean(notify.pushNotifications);
  els.voiceNotificationsToggle.checked = Boolean(notify.voiceNotifications);
  els.voiceModeInput.value = notify.voiceMode || "brief";
  const support = getNotificationSupport();
  els.notificationSupportText.textContent = support.iosNeedsHomeScreen ? "Add TableFlow to your Home Screen to enable app-style notifications on iOS." : support.message;
  els.chimeToggle.checked = state.settings.chime;
  els.autosaveToggle.checked = state.settings.autosave;
  els.compactNavToggle.checked = Boolean(state.settings.navigation?.compact);
  els.chimeVolume.value = state.settings.chimeVolume;
  els.appVersionText.textContent = APP_VERSION;
  els.pinEnabledToggle.checked = state.settings.pinEnabled;
  els.pinRequireOpenToggle.checked = state.settings.pinRequireOpen;
  els.pinRequireAdminToggle.checked = state.settings.pinRequireAdmin;
  const side = state.settings.sideWork || {};
  els.sideWorkRemindersToggle.checked = side.remindersEnabled !== false;
  els.sideWorkChimeToggle.checked = side.chimeEnabled !== false;
  els.sideWorkReminderStyleInput.value = side.reminderStyle || "gentle";
  els.sideWorkSnoozeInput.value = side.snoozeDefaultMinutes || 15;
  els.sideWorkMaxFocusInput.value = side.maxFocusTasks || 3;
  const check = getCheckBackSettings();
  els.checkBackEnabledToggle.checked = check.enabled !== false;
  els.checkBackSmartToggle.checked = check.useSmartTiming !== false;
  els.checkBackChimeToggle.checked = check.chimeEnabled !== false;
  els.checkBackPulseToggle.checked = check.pulseTable !== false;
  els.firstCheckInput.value = check.firstCheckMinutes;
  els.refillCheckInput.value = check.refillCheckMinutes;
  els.secondCheckInput.value = check.secondCheckMinutes;
  els.dessertSuggestInput.value = check.dessertSuggestMinutes;
  els.quickDrinkDeliveryToggle.checked = state.settings.serviceWorkflow?.quickDrinkDelivery !== false;
  els.skipDrinkDeliveryConfirmToggle.checked = Boolean(state.settings.serviceWorkflow?.skipDrinkDeliveryConfirm);
  els.orderReminderAfterDrinksToggle.checked = state.settings.serviceWorkflow?.orderReminderAfterDrinks !== false;
  els.orderReminderAfterDrinksInput.value = state.settings.serviceWorkflow?.orderReminderAfterDrinksMinutes || 4;
  els.developerModeToggle.checked = Boolean(state.settings.developer?.enabled);
  els.testerToggleSetting.checked = Boolean(state.settings.developer?.showTesterToggle);
  els.debugLogsToggle.checked = Boolean(state.settings.developer?.debugLogs);
  const b = state.settings.branding || defaultBranding();
  els.accountSettingsSummary.textContent = state.activeUser ? `${state.activeUser.name} - ${state.activeUser.email}` : "No active local account";
  els.brandingRestaurantNameInput.value = b.restaurantName || "";
  els.brandingStoreNumberInput.value = b.storeNumber || "";
  els.brandingAppNameInput.value = b.appDisplayName || "TableFlow";
  els.brandingPrimaryInput.value = b.primaryColor || THEME_PRESETS.default.primary;
  els.brandingSecondaryInput.value = b.secondaryColor || THEME_PRESETS.default.secondary;
  els.brandingAccentInput.value = b.accentColor || THEME_PRESETS.default.accent;
  els.brandingBgInput.value = b.backgroundColor || THEME_PRESETS.default.bg;
  els.brandingCardInput.value = b.cardColor || THEME_PRESETS.default.card;
  els.brandingButtonStyleInput.value = b.buttonStyle || "rounded";
  els.brandingGuestCheckLogoToggle.checked = b.useLogoOnGuestCheck !== false;
  els.brandingLoginLogoToggle.checked = b.useLogoOnLogin !== false;
  els.logoPreview.innerHTML = (b.logoDataUrl || b.logoAssetPath) ? `<img src="${b.logoDataUrl || b.logoAssetPath}" alt="Store logo preview" />` : `<p>No logo uploaded.</p>`;
  renderThemePresets();
  renderSettingsSurface();
}

function renderSettingsSurface() {
  if (!els.settingsPanel) return;
  if (state.settingsPage && state.settingsPage !== "main") {
    els.settingsPanel.innerHTML = renderSettingsSubpage(state.settingsPage);
    bindSettingsSurfaceActions();
    return;
  }
  const cards = [
    ["account", "Account & Security", "Local account, PIN lock, sign out, and store team identity.", "AC"],
    ["appearance", "Appearance", "Mode, navigation density, theme preset, and iOS Glass.", "AP"],
    ["branding", "Store Branding", "Denny's store name, number, colors, and single stored logo.", "BR"],
    ["notifications", "Notifications", "Compact alerts, push support, chimes, and voice style.", "NO"],
    ["shift", "Shift / Clock In", "Clock in, assigned section, table ownership, and summaries.", "SH"],
    ["menu", "Menu & Pricing", "Denny's menu source, overrides, prices, and CSV exports.", "MN"],
    ["storage", "Data & Storage", "Usage, cleanup, backups, import, and local data policy.", "DS"],
    ["integrations", "Integrations", "Online store sync plus future Toast, Square, Clover, KDS, scheduling, and payroll.", "IN"],
    ["developer", "Developer Tools", "Tester controls, debug report, and device previews.", "DV"],
    ["about", "About TableFlow", "Version, repository defaults, and local-first sync status.", "TF"]
  ];
  els.settingsPanel.innerHTML = `
    <div class="settings-category-grid">
      ${cards.map(([key, title, desc, icon]) => `
        <button class="settings-category-card" data-settings-page="${key}" type="button">
          <span class="settings-card-icon">${icon}</span>
          <strong>${escapeHtml(title)}</strong>
          <small>${escapeHtml(desc)}</small>
        </button>
      `).join("")}
    </div>
  `;
  bindSettingsSurfaceActions();
}

function renderSettingsSubpage(page) {
  const titleMap = {
    account: ["Account & Security", "Local team identity and device protection."],
    appearance: ["Appearance", "Theme, light/dark mode, and POS tablet density."],
    branding: ["Store Branding", "Denny's store identity without duplicating large logo blobs."],
    notifications: ["Notifications", "Compact service alerts for every role."],
    shift: ["Shift / Clock In", "Clock in, assigned tables, and shift summary tools."],
    menu: ["Menu & Pricing", "Default Denny's menu plus local override exports."],
    storage: ["Data & Storage", "Repository defaults, IndexedDB live data, cleanup, and backup."],
    integrations: ["Integrations", "Online sync endpoint and future POS, KDS, delivery, reservation, scheduling, and payroll links."],
    developer: ["Developer Tools", "Local tester and diagnostics."],
    about: ["About TableFlow", "Denny's-only local-first TableFlow setup."]
  };
  const [title, desc] = titleMap[page] || titleMap.about;
  return `
    <div class="settings-subpage">
      <div class="page-header">
        <button class="secondary" data-settings-page="main" type="button">Back</button>
        <div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(desc)}</p></div>
      </div>
      ${renderSettingsSubpageBody(page)}
    </div>
  `;
}

function renderSettingsSubpageBody(page) {
  if (page === "account") return `
    <section class="section-card">
      <h4>Account</h4>
      <p>${escapeHtml(state.activeUser ? `${state.activeUser.name || state.activeUser.fullName} - ${state.activeUser.email}` : "No active local account")}</p>
      <div class="action-row"><span>PIN lock</span><strong>${state.settings.pinEnabled ? "Enabled" : "Off"}</strong></div>
      <div class="button-row"><button class="primary" id="settingsLockAppAction" type="button">Lock App</button><button class="danger" id="settingsSignOutAction" type="button">Sign Out</button><button data-settings-page="developer" type="button">Developer Commands</button></div>
    </section>`;
  if (page === "appearance") return `
    <section class="section-card">
      <h4>Theme Presets</h4>
      <div class="theme-preset-grid">${Object.entries(THEME_PRESETS).map(([key, preset]) => `<button class="theme-preset" data-apply-theme="${key}" type="button"><div class="theme-swatch" style="background:${preset.bg}"><span style="background:${preset.primary}"></span><span style="background:${preset.secondary}"></span><span style="background:${preset.accent}"></span></div><strong>${escapeHtml(preset.name)}</strong></button>`).join("")}</div>
      <label class="switch-row"><input id="settingsLightModeMirror" type="checkbox" ${state.settings.theme === "light" ? "checked" : ""} /> Light mode</label>
      <label class="switch-row"><input id="settingsCompactMirror" type="checkbox" ${state.settings.navigation?.compact ? "checked" : ""} /> Compact tablet navigation</label>
    </section>`;
  if (page === "branding") return `
    <section class="section-card">
      <h4>Denny's Store Branding</h4>
      <div class="form-grid">
        <label class="field"><span>Store name</span><input id="settingsStoreNameMirror" value="${escapeHtml(state.settings.branding.restaurantName || "Denny's Store")}" /></label>
        <label class="field"><span>Store number</span><input id="settingsStoreNumberMirror" value="${escapeHtml(state.settings.branding.storeNumber || "")}" /></label>
      </div>
      <p class="storage-note">Logo is stored once by key and referenced by settings, not copied into every data object.</p>
      <div class="button-row"><button class="primary" id="settingsSaveBrandingMirror" type="button">Save Branding</button><button id="uploadLogoMirror" type="button">Upload Logo</button><button id="removeLogoMirror" type="button">Remove Logo</button></div>
    </section>`;
  if (page === "notifications") return `
    <section class="section-card">
      <h4>Alerts</h4>
      <div class="action-row"><span>Role filter</span><strong>${escapeHtml(currentRole())}</strong></div>
      <div class="action-row"><span>Active alerts</span><strong>${getRoleAlerts().length}</strong></div>
      <label class="switch-row"><input id="settingsInAppAlertsMirror" type="checkbox" ${getNotificationSettings().inAppAlerts !== false ? "checked" : ""} /> In-app alert toasts</label>
      <button id="settingsRequestPushButton" type="button">Request iOS / Browser Permission</button>
      <p class="security-note">${escapeHtml(getNotificationSupport().message)}</p>
      <button class="primary" id="settingsOpenNotificationsButton" type="button">Open Notifications</button>
    </section>`;
  if (page === "shift") return `
    <section class="section-card">
      <h4>Current Shift</h4>
      <div class="action-row"><span>Status</span><strong>${isClockedIn() ? "Clocked In" : "Clocked Out"}</strong></div>
      <div class="action-row"><span>Assigned tables</span><strong>${getCurrentAssignedTableIds().length}</strong></div>
      <div class="button-row"><button class="primary" id="settingsClockAction" type="button">${isClockedIn() ? "Clock Out" : "Clock In"}</button><button data-view="profile" type="button">View Profile</button></div>
    </section>`;
  if (page === "menu") return `
    <section class="section-card">
      <h4>Denny's Menu</h4>
      <p>Default source: <code>data/dennys-menu.csv</code>. Edits are saved as local menu overrides in IndexedDB.</p>
      <div class="button-row"><button id="downloadDennyMenuButton" type="button">Download Denny's Menu CSV</button><button id="exportMenuCsvMirror" type="button">Export Edited Menu CSV</button><button data-view="menueditor" type="button">Open Menu Editor</button></div>
    </section>`;
  if (page === "storage") return renderStorageSettingsBody();
  if (page === "integrations") return `
    <section class="section-card cloud-sync-card">
      <h4>Online Store Sync</h4>
      <p>Use a shared REST, Supabase Edge Function, Firebase endpoint, or future TableFlow cloud endpoint so two devices can share table status, active orders, POS queue, messages, alerts, and shift activity.</p>
      <div class="sync-status-row">
        <span class="status-chip ${state.settings.sync?.status === "online" ? "ok" : state.settings.sync?.status === "error" ? "danger" : ""}">${escapeHtml(state.settings.sync?.status || "offline")}</span>
        <span>${state.settings.sync?.lastPush ? `Last push ${formatClock(state.settings.sync.lastPush)}` : "Not pushed yet"}</span>
        <span>${state.settings.sync?.lastPull ? `Last pull ${formatClock(state.settings.sync.lastPull)}` : "Not pulled yet"}</span>
      </div>
      <label class="switch-row"><input id="settingsSyncEnabledInput" type="checkbox" ${state.settings.sync?.enabled ? "checked" : ""} /> Enable online sync</label>
      <div class="form-grid">
        <label class="field"><span>Sync endpoint URL</span><input id="settingsSyncEndpointInput" type="url" placeholder="https://your-sync-endpoint/tableflow-store" value="${escapeHtml(state.settings.sync?.endpoint || "")}" /></label>
        <label class="field"><span>API key / token (optional)</span><input id="settingsSyncApiKeyInput" type="password" value="${escapeHtml(state.settings.sync?.apiKey || "")}" /></label>
        <label class="field"><span>Poll interval seconds</span><input id="settingsSyncIntervalInput" type="number" min="5" max="300" value="${Number(state.settings.sync?.intervalSeconds || 15)}" /></label>
      </div>
      ${state.settings.sync?.lastError ? `<p class="security-note danger-note">${escapeHtml(state.settings.sync.lastError)}</p>` : `<p class="security-note">Local mode still works offline. When this is enabled, TableFlow pulls online state, merges fresh table updates, then pushes this device's latest service state.</p>`}
      <div class="button-row">
        <button class="primary" id="saveSyncSettingsButton" type="button">Save Sync Settings</button>
        <button id="pushSyncNowButton" type="button">Push Now</button>
        <button id="pullSyncNowButton" type="button">Pull Now</button>
        <button id="testSyncButton" type="button">Test Sync</button>
      </div>
    </section>
    <section class="section-card">
      <h4>Future Integrations</h4>
      <div class="integration-grid">${["Toast POS", "Square POS", "Clover", "Kitchen Display", "Delivery Orders", "QR Menu", "Reservation System", "Shift Scheduling", "Payroll export"].map((name) => `<div class="integration-tile"><strong>${name}</strong><span>Planned</span></div>`).join("")}</div>
    </section>`;
  if (page === "developer") return `
    <section class="section-card">
      <h4>Developer Tools</h4>
      <p>Debug tools stay here unless Developer Mode is enabled.</p>
      <label class="switch-row"><input id="settingsDeveloperMirror" type="checkbox" ${state.settings.developer?.enabled ? "checked" : ""} /> Developer Mode</label>
      <button class="primary" data-view="developer" type="button">Open Developer Tools</button>
    </section>`;
  return `
    <section class="section-card">
      <h4>TableFlow for Denny's</h4>
      <p>Version ${escapeHtml(APP_VERSION)}. Repository files provide default Denny's configs. Browser storage keeps active shift data on this device.</p>
      <p>Future sync can connect Firebase, Supabase, REST APIs, or WebSocket updates.</p>
    </section>`;
}

function renderStorageSettingsBody() {
  const usage = estimateStorageUsage();
  return `
    <section class="section-card">
      <h4>Data & Storage</h4>
      <p class="storage-note">Default Denny's configs load from repository files. Live shift data is stored locally on this device. Export data to back it up or move it.</p>
      <div class="dashboard-stats">
        <div class="stat-card"><p>localStorage estimate</p><h3>${usage.localKb} KB</h3></div>
        <div class="stat-card"><p>IndexedDB</p><h3>${state.storage.idbAvailable ? "On" : "Fallback"}</h3></div>
        <div class="stat-card"><p>Events</p><h3>${state.analytics.events.length}</h3></div>
      </div>
      <div class="button-row">
        <button class="primary" id="exportCurrentShiftButton" type="button">Export Current Shift</button>
        <button id="exportAllLocalButton" type="button">Export All Local Data</button>
        <button id="importBackupMirror" type="button">Import Backup</button>
        <button id="downloadDennyMenuButton" type="button">Download Denny's Menu CSV</button>
        <button id="downloadDennyLayoutButton" type="button">Download Floor Layout JSON</button>
        <button id="cleanupShiftsButton" type="button">Clear completed shifts older than 30 days</button>
        <button id="cleanupPosButton" type="button">Clear delivered POS queue history</button>
        <button id="cleanupAnalyticsButton" type="button">Clear old analytics events</button>
        <button id="cleanupMessagesButton" type="button">Clear old messages</button>
        <button id="compactStorageButton" type="button">Compact storage</button>
      </div>
    </section>`;
}

function bindSettingsSurfaceActions() {
  els.settingsPanel?.querySelectorAll("[data-settings-page]").forEach((button) => button.addEventListener("click", () => {
    state.settingsPage = button.dataset.settingsPage;
    renderSettingsSurface();
  }));
  els.settingsPanel?.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));
  els.settingsPanel?.querySelectorAll("[data-apply-theme]").forEach((button) => button.addEventListener("click", () => applyThemePreset(button.dataset.applyTheme)));
  document.getElementById("settingsLockAppAction")?.addEventListener("click", lockApp);
  document.getElementById("settingsSignOutAction")?.addEventListener("click", logoutLocal);
  document.getElementById("settingsLightModeMirror")?.addEventListener("change", (event) => { setTheme(event.target.checked ? "light" : "dark"); saveAll(true); renderAll(); });
  document.getElementById("settingsCompactMirror")?.addEventListener("change", (event) => { state.settings.navigation.compact = event.target.checked; saveAll(true); renderAll(); });
  document.getElementById("settingsInAppAlertsMirror")?.addEventListener("change", (event) => { state.settings.notificationSettings.inAppAlerts = event.target.checked; saveAll(true); });
  document.getElementById("settingsRequestPushButton")?.addEventListener("click", requestPushNotifications);
  document.getElementById("settingsOpenNotificationsButton")?.addEventListener("click", showAlertsDrawer);
  document.getElementById("settingsDeveloperMirror")?.addEventListener("change", (event) => { state.settings.developer.enabled = event.target.checked; saveAll(true); renderAll(); });
  document.getElementById("settingsSaveBrandingMirror")?.addEventListener("click", () => {
    state.settings.branding.restaurantName = document.getElementById("settingsStoreNameMirror").value.trim() || "Denny's Store";
    state.settings.branding.storeNumber = document.getElementById("settingsStoreNumberMirror").value.trim();
    saveAll(true);
    renderAll();
    toast("Store branding saved.");
  });
  document.getElementById("saveSyncSettingsButton")?.addEventListener("click", saveSyncSettingsFromPanel);
  document.getElementById("pushSyncNowButton")?.addEventListener("click", () => runManualCloudAction(pushCloudSync, "Push"));
  document.getElementById("pullSyncNowButton")?.addEventListener("click", () => runManualCloudAction(pullCloudSync, "Pull"));
  document.getElementById("testSyncButton")?.addEventListener("click", testCloudSync);
  document.getElementById("uploadLogoMirror")?.addEventListener("click", () => els.logoFileInput.click());
  document.getElementById("removeLogoMirror")?.addEventListener("click", () => { state.settings.branding.logoDataUrl = ""; state.settings.branding.logoKey = ""; state.settings.branding.logoAssetPath = ""; saveAll(true); renderAll(); toast("Logo removed."); });
  document.getElementById("settingsClockAction")?.addEventListener("click", () => isClockedIn() ? openClockOutFlow() : openClockInFlow());
  document.getElementById("downloadDennyMenuButton")?.addEventListener("click", () => downloadText("dennys-menu.csv", menuToCsv(getServiceMenuItems()), "text/csv"));
  document.getElementById("downloadDennyLayoutButton")?.addEventListener("click", () => downloadJson("dennys-layout-default.json", state.layoutConfig));
  document.getElementById("exportMenuCsvMirror")?.addEventListener("click", exportMenuCsv);
  document.getElementById("exportCurrentShiftButton")?.addEventListener("click", () => downloadJson("tableflow-current-shift.json", state.currentShift));
  document.getElementById("exportAllLocalButton")?.addEventListener("click", exportAllData);
  document.getElementById("importBackupMirror")?.addEventListener("click", () => els.importAllInput.click());
  document.getElementById("cleanupShiftsButton")?.addEventListener("click", () => cleanupStorage("shifts"));
  document.getElementById("cleanupPosButton")?.addEventListener("click", () => cleanupStorage("pos"));
  document.getElementById("cleanupAnalyticsButton")?.addEventListener("click", () => cleanupStorage("analytics"));
  document.getElementById("cleanupMessagesButton")?.addEventListener("click", () => cleanupStorage("messages"));
  document.getElementById("compactStorageButton")?.addEventListener("click", compactStorage);
}

function readSyncSettingsFromPanel() {
  const endpoint = document.getElementById("settingsSyncEndpointInput")?.value.trim() || "";
  const apiKey = document.getElementById("settingsSyncApiKeyInput")?.value.trim() || "";
  const intervalSeconds = Math.max(5, Math.min(300, Number(document.getElementById("settingsSyncIntervalInput")?.value) || 15));
  state.settings.sync = {
    ...state.settings.sync,
    enabled: Boolean(document.getElementById("settingsSyncEnabledInput")?.checked),
    endpoint,
    apiKey,
    intervalSeconds
  };
}

function saveSyncSettingsFromPanel() {
  readSyncSettingsFromPanel();
  state.settings.sync.status = cloudSyncConfigured() ? "ready" : "offline";
  state.settings.sync.lastError = "";
  setupCloudSyncTimer();
  saveAll(true);
  renderSettingsSurface();
  toast(state.settings.sync.enabled ? "Online sync settings saved." : "Online sync is off.");
}

async function runManualCloudAction(action, label) {
  readSyncSettingsFromPanel();
  if (!cloudSyncConfigured()) return toast("Add a sync endpoint and enable online sync first.", "danger");
  state.settings.sync.status = "syncing";
  renderSettingsSurface();
  try {
    await action(true);
    state.settings.sync.status = "online";
    state.settings.sync.lastError = "";
    saveAll(true);
    renderAll();
  } catch (error) {
    state.settings.sync.status = "error";
    state.settings.sync.lastError = error.message || `${label} failed.`;
    saveAll(true);
    renderSettingsSurface();
    toast(`${label} failed. Check the sync endpoint.`, "danger");
  }
}

async function testCloudSync() {
  readSyncSettingsFromPanel();
  if (!cloudSyncConfigured()) return toast("Add a sync endpoint and enable online sync first.", "danger");
  try {
    await pullCloudSync(false);
    await pushCloudSync(false);
    state.settings.sync.status = "online";
    state.settings.sync.lastError = "";
    saveAll(true);
    renderAll();
    toast("Online sync test passed.");
  } catch (error) {
    state.settings.sync.status = "error";
    state.settings.sync.lastError = error.message || "Sync test failed.";
    saveAll(true);
    renderSettingsSurface();
    toast("Sync test failed. The app still works locally.", "danger");
  }
}

function estimateStorageUsage() {
  const total = Object.keys(localStorage).reduce((sum, key) => sum + key.length + String(localStorage.getItem(key)).length, 0);
  state.storage.usageBytes = total;
  return { localKb: Math.round(total / 1024) };
}

async function cleanupStorage(type) {
  const cutoff = Date.now() - 30 * 86400000;
  if (type === "analytics") state.analytics.events = state.analytics.events.filter((event) => Number(event.timestamp || event.createdAt || Date.now()) >= cutoff);
  if (type === "messages") state.messages = state.messages.filter((message) => Number(message.createdAt || Date.now()) >= cutoff);
  if (type === "pos") {
    Object.values(state.currentShift.tables).forEach((table) => {
      table.posQueue = table.posQueue.filter((item) => !isDeliveredQueueStatus(item.queueStatus) || Number(item.updatedAt || Date.now()) >= cutoff);
    });
  }
  if (type === "shifts") {
    state.currentShift.shiftSummaries = (state.currentShift.shiftSummaries || []).filter((summary) => Number(summary.clockOutAt || summary.createdAt || Date.now()) >= cutoff);
    if (state.storage.idbAvailable) await idbClear("shiftSummaries");
  }
  saveAll(true);
  renderAll();
  toast("Storage cleanup complete.");
}

function compactStorage() {
  ["tableflow.backup", "tableflow.restaurantData.local", "tableflow.menuConfig", "tableflow.layoutConfig", "tableflow.analytics", "tableflow.messages"].forEach((key) => localStorage.removeItem(key));
  saveAll(true);
  renderAll();
  toast("Storage compacted.");
}

function updateStorageStatus() {
  const ok = storageAvailable();
  const text = ok ? "Healthy" : "Unavailable";
  els.storageStatus.textContent = text;
  els.settingsStorageStatus.textContent = text;
}

function setTheme(theme) {
  state.settings.theme = theme;
  document.body.classList.toggle("light-mode", theme === "light");
  applyBranding();
}

function applyBranding() {
  if (!state.settings?.branding) return;
  const b = state.settings.branding;
  const vars = {
    "--primary": b.primaryColor || THEME_PRESETS.default.primary,
    "--secondary": b.secondaryColor || THEME_PRESETS.default.secondary,
    "--accent": b.accentColor || THEME_PRESETS.default.accent,
    "--bg": b.backgroundColor || THEME_PRESETS.default.bg,
    "--panel": b.cardColor || THEME_PRESETS.default.card,
    "--panel-2": b.cardColor || THEME_PRESETS.default.card
  };
  Object.entries(vars).forEach(([name, value]) => {
    document.documentElement.style.setProperty(name, value);
    document.body.style.setProperty(name, value);
  });
  document.documentElement.style.setProperty("--glass-bg", b.preset === "iosGlass" ? "rgba(255,255,255,.14)" : "rgba(255,255,255,.08)");
  document.documentElement.style.setProperty("--glass-border", b.preset === "iosGlass" ? "rgba(255,255,255,.28)" : "var(--line)");
  document.documentElement.style.setProperty("--glass-blur", b.preset === "iosGlass" ? "22px" : "10px");
  document.documentElement.style.setProperty("--glass-shadow", b.preset === "iosGlass" ? "0 22px 70px rgba(0,0,0,.24)" : "0 14px 36px rgba(0,0,0,.28)");
  document.body.classList.toggle("theme-ios-glass", b.preset === "iosGlass");
  document.body.classList.toggle("button-square", b.buttonStyle === "square");
  document.body.classList.toggle("button-pill", b.buttonStyle === "pill");
  const logoSrc = b.logoDataUrl || b.logoAssetPath || "";
  const logoHtml = logoSrc ? `<img src="${logoSrc}" alt="" />` : "TF";
  if (els.shellBrandLogo) els.shellBrandLogo.innerHTML = logoHtml;
  if (els.loadingBrandLogo) els.loadingBrandLogo.innerHTML = logoHtml;
  if (els.shellAppName) els.shellAppName.textContent = b.appDisplayName || "TableFlow";
  if (els.shellRestaurantName) els.shellRestaurantName.textContent = [b.restaurantName, b.storeNumber ? `Store ${b.storeNumber}` : ""].filter(Boolean).join(" - ") || "Local Server Assistant";
  if (els.authAppName) els.authAppName.textContent = b.appDisplayName || "TableFlow";
  if (els.authBrandLogo) els.authBrandLogo.innerHTML = b.useLogoOnLogin && logoSrc ? `<img src="${logoSrc}" alt="" />` : `<div class="brand-icon">TF</div>`;
}

function renderThemePresets() {
  if (!els.themePresetGrid) return;
  els.themePresetGrid.innerHTML = Object.entries(THEME_PRESETS).map(([key, preset]) => `
    <div class="theme-preset">
      <div class="theme-swatch" style="background:${preset.bg}"><span style="background:${preset.primary}"></span><span style="background:${preset.secondary}"></span><span style="background:${preset.accent}"></span></div>
      <strong>${escapeHtml(preset.name)}</strong>
      <button data-apply-theme="${key}" type="button">Apply Preset</button>
    </div>
  `).join("");
  els.themePresetGrid.querySelectorAll("[data-apply-theme]").forEach((button) => button.addEventListener("click", () => applyThemePreset(button.dataset.applyTheme)));
}

// Developer Tools
function renderDeveloperTools() {
  if (!els.developerPanel) return;
  const metrics = getDebugMetrics();
  els.developerPanel.innerHTML = `
    <div class="settings-grid">
      <section class="settings-card">
        <h4>Device Preview</h4>
        <div class="button-row">
          ${["phone", "phone-landscape", "tablet", "tablet-landscape", "square-touch", "desktop", "full"].map((mode) => `<button data-preview-mode="${mode}" type="button">${mode.replace("-", " ")}</button>`).join("")}
        </div>
        <p>Current preview: ${escapeHtml(state.settings.developer.preview || "full")}</p>
      </section>
      <section class="settings-card">
        <h4>Test Data Controls</h4>
        <div class="button-row">
          ${[
            ["demo-user", "Create demo user"], ["demo-restaurant", "Create demo restaurant"], ["reset-layout", "Reset demo layout"],
            ["random-table", "Add random active table"], ["random-drinks", "Add random drinks"], ["random-apps", "Add random apps"],
            ["random-entrees", "Add random entrees"], ["send-pos", "Send items to POS"], ["food-ready", "Mark food ready"],
            ["delivered", "Mark delivered"], ["checkback", "Trigger check back"], ["sidework", "Trigger side work"],
            ["rush", "Simulate rush"], ["ten-tables", "Simulate 10 tables"], ["theme", "Test theme switch"],
            ["export", "Test import/export"], ["corrupt", "Test corrupted storage"], ["perf100", "100 order items"], ["clear", "Clear test data"]
          ].map(([action, label]) => `<button data-dev-action="${action}" type="button">${label}</button>`).join("")}
        </div>
      </section>
      <section class="settings-card">
        <h4>Debug Info</h4>
        <p>Current view: ${escapeHtml(state.activeView)}</p>
        <p>Active table: ${escapeHtml(state.selectedTableId || "None")}</p>
        <p>Active seat: ${escapeHtml(getSelectedTable() ? getTableState(state.selectedTableId).selectedSeat || 1 : "None")}</p>
        <p>Tables: ${metrics.tables}</p>
        <p>Orders: ${metrics.orders}</p>
        <p>POS queue: ${metrics.queue}</p>
        <p>Alerts: ${metrics.alerts}</p>
        <p>Events: ${metrics.events}</p>
        <p>localStorage size: ${metrics.storageKb} KB</p>
        <p>Last render: ${metrics.renderMs} ms</p>
      </section>
      <section class="settings-card">
        <h4>Tester Log</h4>
        <div class="tester-log">${state.devLogs.slice(-30).map((log) => `<p><strong>${escapeHtml(log.action)}</strong> ${escapeHtml(log.result)} <small>${log.ms}ms</small></p>`).join("") || "<p>No tester runs yet.</p>"}</div>
      </section>
    </div>
  `;
  els.developerPanel.querySelectorAll("[data-preview-mode]").forEach((button) => button.addEventListener("click", () => setPreviewMode(button.dataset.previewMode)));
  els.developerPanel.querySelectorAll("[data-dev-action]").forEach((button) => button.addEventListener("click", () => runDevAction(button.dataset.devAction)));
}

function renderTesterPanel() {
  const showToggle = Boolean(state.settings?.developer?.showTesterToggle);
  els.testerToggleButton?.classList.toggle("hidden", !showToggle);
  const stored = safeRead("tableflow.dev.testerEnabled", false, false);
  if (stored && !state.testerEnabled) state.testerEnabled = true;
  els.testerPanel?.classList.toggle("hidden", !showToggle || !state.testerEnabled);
  if (!els.testerPanel || !state.testerEnabled) return;
  const metrics = getDebugMetrics();
  els.testerPanel.innerHTML = `
    <h3>Tester</h3>
    <p>${metrics.tables} tables / ${metrics.orders} orders / ${metrics.storageKb} KB</p>
    <div class="button-row">
      <button data-dev-action="random-table" type="button">Start Table</button>
      <button data-dev-action="random-drinks" type="button">Drinks</button>
      <button data-dev-action="random-entrees" type="button">Entrees</button>
      <button data-dev-action="perf100" type="button">100 Items</button>
    </div>
    <div class="tester-log">${state.devLogs.slice(-8).map((log) => `<p>${escapeHtml(log.action)}: ${escapeHtml(log.result)}</p>`).join("")}</div>
  `;
  els.testerPanel.querySelectorAll("[data-dev-action]").forEach((button) => button.addEventListener("click", () => runDevAction(button.dataset.devAction)));
}

function setPreviewMode(mode) {
  state.settings.developer.preview = mode;
  document.body.dataset.preview = mode;
  markDirty();
  renderAll();
}

function runDevAction(action) {
  const start = performance.now();
  try {
    const result = executeDevAction(action);
    const ms = Math.round(performance.now() - start);
    state.devLogs.push({ action, result, ms, at: Date.now() });
    if (state.settings.developer.debugLogs) console.log("[TableFlow tester]", action, result, `${ms}ms`);
    markDirty();
    renderAll();
  } catch (error) {
    state.devLogs.push({ action, result: `Error: ${error.message}`, ms: Math.round(performance.now() - start), at: Date.now() });
    toast(`Tester error: ${error.message}`, "danger");
    renderDeveloperTools();
  }
}

function executeDevAction(action) {
  if (action === "demo-user") { state.profile.loggedIn = true; state.profile.name = "Demo Server"; return "Demo user ready"; }
  if (action === "demo-restaurant") { state.settings.branding.restaurantName = "Denny's Demo Store"; applyBranding(); return "Demo store ready"; }
  if (action === "reset-layout") { const defaults = createDefaults(); state.layoutConfig = defaults.layoutConfig; state.currentShift.tables = defaults.currentShift.tables; return "Layout reset"; }
  if (action === "random-table") { const table = randomTable(); seatParty(table.id, Math.min(table.seats || 4, 4)); return `${table.name} started`; }
  if (action === "random-drinks") return addRandomOrders("BEV", 4);
  if (action === "random-apps") return addRandomOrders("APPT", 3);
  if (action === "random-entrees") return addRandomOrders("ENTREE", 4);
  if (action === "send-pos") { Object.keys(state.currentShift.tables).forEach(markTableRungIn); return "Items sent to POS"; }
  if (action === "food-ready") { getPosQueueRows().slice(0, 12).forEach((row) => updateQueueItem(`${row.tableId}|${row.id}`, "food_ready")); return "Food marked ready"; }
  if (action === "delivered") { getPosQueueRows().slice(0, 12).forEach((row) => updateQueueItem(`${row.tableId}|${row.id}`, "delivered")); return "Food delivered"; }
  if (action === "checkback") { const table = randomTable(); scheduleCheckBackReminders(table.id); getTableState(table.id).checkBack.reminders[0].dueAt = Date.now() - 1000; processCheckBackReminders(); return "Check back triggered"; }
  if (action === "sidework") { processSideWorkReminders(); return "Side work reminder ticked"; }
  if (action === "rush" || action === "ten-tables") { state.layoutConfig.objects.filter((o) => o.category === "table").slice(0, 10).forEach((t) => seatParty(t.id, Math.min(t.seats || 4, 4))); return "Rush simulated"; }
  if (action === "theme") { applyThemePreset(["default", "dennys", "sakura", "blue", "crimson"][Math.floor(Math.random() * 5)]); return "Theme switched"; }
  if (action === "export") { JSON.stringify(exportAllDataObject()); return "Export object built"; }
  if (action === "corrupt") { localStorage.setItem("tableflow.dev.corruptTest", "{bad json"); safeRead("tableflow.dev.corruptTest", {}); localStorage.removeItem("tableflow.dev.corruptTest"); return "Corruption recovery checked"; }
  if (action === "perf100") return addRandomOrders("ENTREE", 100);
  if (action === "clear") { clearShiftWithConfirm(); return "Clear confirmation opened"; }
  return "No action";
}

function addRandomOrders(category, count) {
  const table = getSelectedTable() || randomTable();
  const tableState = getTableState(table.id);
  if (!tableState.partySize) seatParty(table.id, Math.min(table.seats || 4, 4));
  const items = state.menuConfig.items.filter((item) => item.active && item.orderable !== false && item.category === category);
  for (let i = 0; i < count; i += 1) {
    const item = items[i % items.length];
    tableState.selectedSeat = (i % Math.max(1, tableState.partySize)) + 1;
    addMenuItemToSelectedSeat(item.id);
  }
  return `${count} ${category} orders added`;
}

function randomTable() {
  const tables = state.layoutConfig.objects.filter((object) => object.category === "table");
  return tables[Math.floor(Math.random() * tables.length)] || tables[0];
}

function getDebugMetrics() {
  const orders = Object.values(state.currentShift.tables).reduce((sum, table) => sum + table.orders.length, 0);
  const queue = Object.values(state.currentShift.tables).reduce((sum, table) => sum + table.posQueue.length, 0);
  const storageSize = Object.keys(localStorage).reduce((sum, key) => sum + key.length + String(localStorage.getItem(key)).length, 0);
  return {
    tables: state.layoutConfig.objects.filter((object) => object.category === "table").length,
    orders,
    queue,
    alerts: state.currentShift.alerts.filter((alert) => alert.status !== "done").length,
    events: state.analytics.events.length,
    storageKb: Math.round(storageSize / 1024),
    renderMs: state.lastRenderMs || 0
  };
}

function exportDebugReport() {
  downloadJson("tableflow-debug-report.json", { metrics: getDebugMetrics(), logs: state.devLogs, state: exportAllDataObject() });
}

function applyThemePreset(key, rerender = true) {
  const preset = THEME_PRESETS[key] || THEME_PRESETS.default;
  Object.assign(state.settings.branding, {
    preset: key,
    primaryColor: preset.primary,
    secondaryColor: preset.secondary,
    accentColor: preset.accent,
    backgroundColor: preset.bg,
    cardColor: preset.card
  });
  applyBranding();
  markDirty();
  if (rerender) renderAll();
}

function saveBrandingFromSettings() {
  Object.assign(state.settings.branding, {
    restaurantName: els.brandingRestaurantNameInput.value.trim() || "Denny's Store",
    storeNumber: els.brandingStoreNumberInput.value.trim(),
    appDisplayName: els.brandingAppNameInput.value.trim() || "TableFlow",
    primaryColor: els.brandingPrimaryInput.value,
    secondaryColor: els.brandingSecondaryInput.value,
    accentColor: els.brandingAccentInput.value,
    backgroundColor: els.brandingBgInput.value,
    cardColor: els.brandingCardInput.value,
    buttonStyle: els.brandingButtonStyleInput.value,
    useLogoOnGuestCheck: els.brandingGuestCheckLogoToggle.checked,
    useLogoOnLogin: els.brandingLoginLogoToggle.checked
  });
  applyBranding();
  markDirty();
  renderAll();
  toast("Branding saved.");
}

function handleLogoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 2.5 * 1024 * 1024) toast("Large logo detected. TableFlow will resize it locally.", "danger");
  const reader = new FileReader();
  reader.onload = () => resizeLogo(String(reader.result));
  reader.onerror = () => toast("Logo upload failed.", "danger");
  reader.readAsDataURL(file);
  event.target.value = "";
}

function resizeLogo(dataUrl) {
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement("canvas");
    const max = 320;
    const scale = Math.min(1, max / Math.max(image.width, image.height));
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    state.settings.branding.logoDataUrl = canvas.toDataURL("image/png", 0.85);
    state.settings.branding.logoKey = "store-logo";
    if (state.storage.idbAvailable) idbPut("logoAssets", { id: "store-logo", dataUrl: state.settings.branding.logoDataUrl, updatedAt: Date.now() });
    markDirty();
    renderAll();
    toast("Logo saved locally.");
  };
  image.onerror = () => toast("Logo image could not be read.", "danger");
  image.src = dataUrl;
}

// Profile and PIN
function renderProfile() {
  els.profileSummary.textContent = state.profile.loggedIn || state.activeUser ? `${state.profile.name || state.activeUser?.name || state.activeUser?.fullName} - ${currentRole()}` : "Not logged in";
  const schedule = getWorkSchedule();
  const assignedIds = getProfileAssignedTableIds();
  const allTables = state.layoutConfig.objects.filter((object) => object.category === "table");
  if (!state.profile.loggedIn && !state.activeUser) {
    els.profilePanel.innerHTML = `
      <div class="settings-card">
        <h4>Start Shift</h4>
        <div class="form-grid">
          <label class="field"><span>Name</span><input id="loginNameInput" /></label>
          <label class="field"><span>Employee ID</span><input id="loginEmployeeInput" /></label>
          <label class="field"><span>Role</span><select id="loginRoleInput"><option>Server</option><option>Host</option><option>Manager</option><option>Busser</option></select></label>
          <label class="field"><span>Server rank</span><select id="loginRankInput"><option>Training</option><option selected>Server</option><option>Senior Server</option><option>Lead Server</option><option>Manager</option></select></label>
          <label class="field"><span>Station</span><input id="loginStationInput" value="Station 1" /></label>
          <label class="field"><span>Shift start</span><input id="loginShiftStartInput" type="time" value="${escapeHtml(schedule.shiftStart)}" /></label>
          <label class="field"><span>Shift end</span><input id="loginShiftEndInput" type="time" value="${escapeHtml(schedule.shiftEnd)}" /></label>
        </div>
        <button class="primary" id="startShiftButton" type="button">Start Shift</button>
      </div>
    `;
    document.getElementById("startShiftButton").addEventListener("click", startMockShift);
    return;
  }
  const displayName = state.profile.name || state.activeUser?.name || state.activeUser?.fullName || "Denny's Team Member";
  const initials = getInitials(displayName);
  const summaries = state.currentShift.shiftSummaries || [];
  const currentAssigned = getCurrentAssignedTableIds();
  const assignedTables = currentAssigned.map((id) => getTable(id)?.name).filter(Boolean);
  els.profilePanel.innerHTML = `
    <div class="profile-layout">
      <section class="profile-card employee-profile-card">
        <div class="profile-avatar" style="background:${escapeHtml(state.profile.color || state.settings.branding.primaryColor || "#d71920")}">${escapeHtml(initials)}</div>
        <div>
          <h3>${escapeHtml(displayName)}</h3>
          <p>${escapeHtml(currentRole())} - Employee ${escapeHtml(state.profile.employeeId || state.activeUser?.employeeId || "Unassigned")}</p>
          <div class="chip-row">
            <span class="status-chip ${isClockedIn() ? "success" : ""}">${isClockedIn() ? "Clocked In" : "Clocked Out"}</span>
            <span class="status-chip">${escapeHtml(getStationName(state.currentShift.sectionId || getCurrentStationId()))}</span>
            <span class="status-chip">${assignedTables.length} tables</span>
          </div>
        </div>
      </section>

      <section class="section-card">
        <h4>Quick Actions</h4>
        <div class="quick-action-grid">
          <button class="primary" id="profileClockButton" type="button">${isClockedIn() ? "Clock Out" : "Clock In"}</button>
          <button id="profileEditButton" type="button">Edit Profile</button>
          <button id="profileSummaryButton" type="button">View Shift Summary</button>
          <button id="profileLockButton" type="button">Lock App</button>
          <button class="danger" id="logoutButton" type="button">Sign Out</button>
        </div>
      </section>

      <section class="section-card">
        <h4>Current Shift</h4>
        <div class="action-row"><span>Status</span><strong>${isClockedIn() ? `Started ${new Date(state.currentShift.clockInAt || Date.now()).toLocaleTimeString()}` : "Not clocked in"}</strong></div>
        <div class="action-row"><span>Active tables</span><strong>${getActiveTables().length}</strong></div>
        <div class="action-row"><span>POS queue</span><strong>${getPosQueueRows().length}</strong></div>
        <div class="action-row"><span>Alerts</span><strong>${getRoleAlerts().length}</strong></div>
      </section>

      <section class="section-card">
        <h4>Assigned Tables</h4>
        <div class="section-table-grid">
          ${allTables.map((table) => `
            <button class="${currentAssigned.includes(table.id) ? "active" : ""}" data-profile-table="${table.id}" type="button">
              <strong>${escapeHtml(table.name)}</strong>
              <span>${escapeHtml(getStationName(table.stationId))}</span>
            </button>
          `).join("")}
        </div>
        <div class="button-row">
          <button class="primary" id="saveSectionButton" type="button">Save My Section</button>
          <button id="selectStationTablesButton" type="button">Use Current Station</button>
          <button id="clearSectionButton" type="button">Clear Section</button>
        </div>
      </section>

      <section class="section-card">
        <h4>Schedule</h4>
        <div class="form-grid">
          <label class="field"><span>Usual work days</span><input id="profileDaysInput" value="${escapeHtml((schedule.days || []).join(", "))}" /></label>
          <label class="field"><span>Shift start</span><input id="profileShiftStartInput" type="time" value="${escapeHtml(schedule.shiftStart || "09:00")}" /></label>
          <label class="field"><span>Shift end</span><input id="profileShiftEndInput" type="time" value="${escapeHtml(schedule.shiftEnd || "17:00")}" /></label>
          <label class="field"><span>Role</span><select id="profileRoleInput">${getRoleOptions(schedule.role || state.profile.role || "Server")}</select></label>
          <label class="field"><span>Server rank</span><select id="profileRankInput"><option ${state.profile.serverRank === "Training" ? "selected" : ""}>Training</option><option ${state.profile.serverRank === "Server" ? "selected" : ""}>Server</option><option ${state.profile.serverRank === "Senior Server" ? "selected" : ""}>Senior Server</option><option ${state.profile.serverRank === "Lead Server" ? "selected" : ""}>Lead Server</option><option ${state.profile.serverRank === "Manager" ? "selected" : ""}>Manager</option></select></label>
          <label class="field"><span>Default station ID</span><input id="profileStationIdInput" value="${escapeHtml(schedule.defaultStationId || "server-1")}" /></label>
          <label class="field"><span>Preferred reminder timing</span><select id="profileReminderStyleInput"><option value="gentle" ${schedule.reminderStyle === "gentle" ? "selected" : ""}>Gentle</option><option value="normal" ${schedule.reminderStyle === "normal" ? "selected" : ""}>Normal</option><option value="manager" ${schedule.reminderStyle === "manager" ? "selected" : ""}>Manager Mode</option></select></label>
          <label class="field wide"><span>Break times optional</span><input id="profileBreaksInput" value="${escapeHtml((schedule.breakTimes || []).join(", "))}" placeholder="Example: 02:00-02:15" /></label>
        </div>
        <button class="primary" id="saveScheduleButton" type="button">Save Schedule</button>
      </section>

      <section class="section-card">
        <h4>Recent Shift Summaries</h4>
        ${summaries.length ? summaries.slice(0, 4).map((summary) => `<div class="action-row"><span>${new Date(summary.createdAt).toLocaleDateString()} - ${summary.tablesServed} tables</span><strong>$${Number(summary.tipsEarned || 0).toFixed(2)} tips</strong></div>`).join("") : `<div class="empty-state">No completed shift summaries yet.</div>`}
      </section>

      <section class="section-card">
        <h4>Tips Summary</h4>
        <div class="dashboard-stats">
          <div class="stat-card"><p>Last tips</p><h3>$${Number(summaries[0]?.tipsEarned || 0).toFixed(2)}</h3></div>
          <div class="stat-card"><p>Tips/hour</p><h3>$${Number(summaries[0]?.tipHourlyRate || 0).toFixed(2)}</h3></div>
        </div>
      </section>

      <section class="section-card">
        <h4>Preferences</h4>
        <div class="action-row"><span>Reminder style</span><strong>${escapeHtml(schedule.reminderStyle || "gentle")}</strong></div>
        <div class="action-row"><span>Default section</span><strong>${escapeHtml(schedule.defaultStationId || "server-1")}</strong></div>
        <button id="profileSettingsButton" type="button">Open Settings</button>
      </section>
    </div>
  `;
  document.getElementById("profileClockButton").addEventListener("click", () => isClockedIn() ? openClockOutFlow() : openClockInFlow());
  document.getElementById("profileEditButton").addEventListener("click", () => toast("Edit Profile is ready through Schedule and Assigned Tables below."));
  document.getElementById("profileSummaryButton").addEventListener("click", () => summaries.length ? showShiftSummary(summaries[0]) : toast("No shift summary yet."));
  document.getElementById("profileLockButton").addEventListener("click", lockApp);
  document.getElementById("profileSettingsButton").addEventListener("click", () => setView("settings"));
  document.getElementById("saveScheduleButton").addEventListener("click", saveProfileSchedule);
  els.profilePanel.querySelectorAll("[data-profile-table]").forEach((button) => button.addEventListener("click", () => button.classList.toggle("active")));
  document.getElementById("saveSectionButton").addEventListener("click", saveProfileSection);
  document.getElementById("selectStationTablesButton").addEventListener("click", () => {
    const stationId = getCurrentStationId();
    state.profile.assignedTableIds = allTables.filter((table) => table.stationId === stationId).map((table) => table.id);
    markDirty();
    renderAll();
    toast("Section set from current station.");
  });
  document.getElementById("clearSectionButton").addEventListener("click", () => {
    state.profile.assignedTableIds = [];
    markDirty();
    renderAll();
    toast("Section cleared.");
  });
  document.getElementById("logoutButton").addEventListener("click", () => showConfirm("Log out of this local shift profile?", "Logout", () => {
    state.profile.loggedIn = false;
    logoutLocal();
  }));
}

function startMockShift() {
  const name = document.getElementById("loginNameInput").value.trim();
  if (!name) return toast("Enter a name to start shift.", "danger");
  state.profile = {
    ...state.profile,
    loggedIn: true,
    name,
    employeeId: document.getElementById("loginEmployeeInput").value.trim() || "000",
    role: document.getElementById("loginRoleInput").value,
    serverRank: document.getElementById("loginRankInput").value,
    station: document.getElementById("loginStationInput").value.trim() || "Station 1",
    assignedTableIds: getTablesForStation(document.getElementById("loginStationInput").value.trim() || "Station 1").map((table) => table.id),
    color: state.profile.color || "#ff6a21",
    shiftStart: Date.now(),
    workSchedule: {
      ...getWorkSchedule(),
      shiftStart: document.getElementById("loginShiftStartInput").value || "09:00",
      shiftEnd: document.getElementById("loginShiftEndInput").value || "17:00",
      role: document.getElementById("loginRoleInput").value
    }
  };
  logEvent("mock_login", null, null, null, { name, role: state.profile.role });
  saveAll(true);
  setView("floor");
}

function saveProfileSchedule() {
  state.profile.workSchedule = {
    ...getWorkSchedule(),
    userId: state.profile.employeeId || "local-user",
    days: document.getElementById("profileDaysInput").value.split(",").map((day) => day.trim()).filter(Boolean),
    shiftStart: document.getElementById("profileShiftStartInput").value || "09:00",
    shiftEnd: document.getElementById("profileShiftEndInput").value || "17:00",
    role: document.getElementById("profileRoleInput").value,
    defaultStationId: document.getElementById("profileStationIdInput").value.trim() || "server-1",
    reminderStyle: document.getElementById("profileReminderStyleInput").value,
    remindersEnabled: true,
    breakTimes: document.getElementById("profileBreaksInput").value.split(",").map((item) => item.trim()).filter(Boolean)
  };
  state.profile.serverRank = document.getElementById("profileRankInput").value;
  state.profile.role = state.profile.workSchedule.role;
  if (state.activeUser) {
    state.activeUser.role = state.profile.role;
    state.users = state.users.map((user) => user.id === state.activeUser.id ? { ...user, role: state.profile.role, updatedAt: Date.now() } : user);
    safeWrite(STORAGE_KEYS.users, state.users);
  }
  ensureSideWorkInstances(state.currentShift.sideWork, state.profile.workSchedule);
  logEvent("work_schedule_updated", null, null, null, state.profile.workSchedule);
  markDirty();
  renderAll();
  toast("Schedule saved.");
}

function saveProfileSection() {
  state.profile.assignedTableIds = Array.from(els.profilePanel.querySelectorAll("[data-profile-table].active")).map((button) => button.dataset.profileTable);
  state.currentShift.assignedTableIds = state.profile.assignedTableIds;
  logEvent("section_updated", null, null, null, { tableIds: state.profile.assignedTableIds });
  markDirty();
  renderAll();
  toast("My section saved.");
}

function showShiftSummary(summary) {
  showModal(`
    <h3>Shift Summary</h3>
    <div class="dashboard-stats">
      <div class="stat-card"><p>Tables</p><h3>${summary.tablesServed}</h3></div>
      <div class="stat-card"><p>Guests</p><h3>${summary.guestsServed}</h3></div>
      <div class="stat-card"><p>Tips/hour</p><h3>$${Number(summary.tipHourlyRate || 0).toFixed(2)}</h3></div>
    </div>
    <p>${escapeHtml(summary.notes || "No notes for this summary.")}</p>
    <div class="modal-actions"><button class="primary" id="closeModalButton" type="button">Done</button></div>
  `);
  document.getElementById("closeModalButton").addEventListener("click", closeModal);
}

function setupPinKeypad() {
  els.pinKeypad.innerHTML = ["1","2","3","4","5","6","7","8","9","Clear","0","Back"].map((key) => `<button data-pin-key="${key}" type="button">${key}</button>`).join("");
  els.pinKeypad.querySelectorAll("[data-pin-key]").forEach((button) => button.addEventListener("click", () => {
    const key = button.dataset.pinKey;
    if (key === "Clear") els.pinEntryInput.value = "";
    else if (key === "Back") els.pinEntryInput.value = els.pinEntryInput.value.slice(0, -1);
    else if (els.pinEntryInput.value.length < 6) els.pinEntryInput.value += key;
  }));
}

function showLockScreen() {
  els.lockScreen.classList.remove("hidden");
  els.pinEntryInput.value = "";
  els.lockMessage.textContent = "Enter PIN";
}

function lockApp() {
  if (state.settings.pinEnabled && state.settings.pinHash) {
    state.pinUnlocked = false;
    showLockScreen();
    return;
  }
  showModal(`
    <h3>Create a Lock PIN</h3>
    <p class="security-note">Use a 4 to 6 digit PIN to lock this device during service.</p>
    <label class="field"><span>PIN</span><input id="lockPinInput" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password" /></label>
    <label class="field"><span>Confirm PIN</span><input id="lockPinConfirmInput" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password" /></label>
    <div class="modal-actions"><button id="cancelLockPinButton" type="button">Cancel</button><button class="primary" id="saveLockPinButton" type="button">Save & Lock</button></div>
  `);
  document.getElementById("cancelLockPinButton").addEventListener("click", closeModal);
  document.getElementById("saveLockPinButton").addEventListener("click", () => {
    const pin = document.getElementById("lockPinInput").value;
    const confirmPin = document.getElementById("lockPinConfirmInput").value;
    if (!/^\d{4,6}$/.test(pin)) return toast("PIN must be 4 to 6 digits.", "danger");
    if (pin !== confirmPin) return toast("PIN confirmation does not match.", "danger");
    state.settings.pinHash = hashPin(pin);
    state.settings.pinEnabled = true;
    state.pinUnlocked = false;
    saveAll(true);
    closeModal();
    showLockScreen();
    toast("App locked.");
  });
}

function unlockWithPin() {
  if (hashPin(els.pinEntryInput.value) === state.settings.pinHash) {
    state.pinUnlocked = true;
    els.lockScreen.classList.add("hidden");
    if (!state.profile.loggedIn) setView("profile");
  } else {
    els.lockMessage.textContent = "Incorrect PIN. Try again.";
    els.pinEntryInput.value = "";
  }
}

function savePinFromSettings() {
  const pin = els.pinCreateInput.value;
  const confirmPin = els.pinConfirmInput.value;
  if (!/^\d{4,6}$/.test(pin)) return toast("PIN must be 4 to 6 digits.", "danger");
  if (pin !== confirmPin) return toast("PIN confirmation does not match.", "danger");
  state.settings.pinHash = hashPin(pin);
  state.settings.pinEnabled = true;
  state.pinUnlocked = true;
  els.pinCreateInput.value = "";
  els.pinConfirmInput.value = "";
  saveAll(true);
  renderAll();
  toast("PIN saved.");
}

function removePin() {
  state.settings.pinHash = "";
  state.settings.pinEnabled = false;
  state.settings.pinRequireOpen = false;
  state.settings.pinRequireAdmin = false;
  state.pinUnlocked = true;
  saveAll(true);
  renderAll();
  toast("PIN removed.");
}

function runAdminAction(action) {
  if (!canUseAdminTools()) {
    showLockedRoleMessage("admin tools");
    return;
  }
  if (!state.settings.pinEnabled || !state.settings.pinRequireAdmin || state.pinUnlocked) {
    action();
    return;
  }
  showPinModal(action);
}

function showPinModal(action) {
  showModal(`
    <h3>Manager PIN Required</h3>
    <p class="security-note">Local app protection only.</p>
    <label class="field"><span>PIN</span><input id="adminPinInput" type="password" inputmode="numeric" maxlength="6" /></label>
    <div class="modal-actions"><button class="primary" id="adminPinUnlockButton" type="button">Unlock</button><button id="closeModalButton" type="button">Cancel</button></div>
  `);
  document.getElementById("adminPinUnlockButton").addEventListener("click", () => {
    if (hashPin(document.getElementById("adminPinInput").value) === state.settings.pinHash) {
      state.pinUnlocked = true;
      closeModal();
      action();
    } else {
      toast("Incorrect PIN. Try again.", "danger");
    }
  });
  document.getElementById("closeModalButton").addEventListener("click", closeModal);
}

function hashPin(pin) {
  let hash = 5381;
  for (let i = 0; i < pin.length; i += 1) hash = ((hash << 5) + hash) + pin.charCodeAt(i);
  return `pin-v1-${Math.abs(hash)}`;
}

// Import/Export
function exportAllDataObject() {
  return { version: APP_VERSION, createdAt: new Date().toISOString(), users: state.users.map(({ passwordHash, ...user }) => user), restaurants: state.restaurants, activeUser: state.activeUser ? { id: state.activeUser.id, email: state.activeUser.email } : null, restaurantData: buildRestaurantData(), layoutConfig: state.layoutConfig, menuConfig: state.menuConfig, settings: state.settings, currentShift: state.currentShift, analytics: state.analytics, profile: state.profile, messages: state.messages };
}

function buildRestaurantData() {
  const now = Date.now();
  const existing = state.restaurantData || {};
  return {
    id: existing.id || makeId("restaurant"),
    name: state.settings.branding?.restaurantName || state.layoutConfig.restaurantName || "Denny's Store",
    ownerUserId: state.activeUser?.id || existing.ownerUserId || "local-owner",
    restaurantName: state.settings.branding?.restaurantName || state.layoutConfig.restaurantName || "Denny's Store",
    storeNumber: state.settings.branding?.storeNumber || "",
    logoKey: state.settings.branding?.logoKey || (state.settings.branding?.logoDataUrl ? "store-logo" : ""),
    settings: compactSettingsForLocalStorage(),
    defaultConfigFiles: {
      menu: "data/dennys-menu.csv",
      layout: "data/dennys-layout-default.json",
      sideWork: "data/dennys-sidework-default.json",
      themePresets: "data/dennys-theme-presets.json",
      prices: "data/dennys-prices-ma.csv"
    },
    layouts: [{ id: "dennys-default-layout", source: "data/dennys-layout-default.json", overridesStore: "layoutOverrides" }],
    menuConfig: { id: "dennys-menu", source: "data/dennys-menu.csv", overridesStore: "menuOverrides", categories: POS_CATEGORIES },
    stations: state.layoutConfig.stations,
    currentShiftId: state.currentShift.id,
    members: buildRestaurantMembers(),
    permissions: buildDefaultPermissions(),
    inviteCode: existing.inviteCode || generateInviteCode(),
    joiningEnabled: existing.joiningEnabled !== false,
    requireApproval: existing.requireApproval !== false,
    syncState: state.currentShift.syncState,
    roles: buildRoleSummary(),
    createdAt: existing.createdAt || now,
    updatedAt: now,
    createdBy: existing.createdBy || state.activeUser?.id || "local"
  };
}

function restaurantDataToAppState(restaurantData, defaults) {
  return {
    layoutConfig: restaurantData.layouts?.[0]?.objects ? restaurantData.layouts[0] : defaults.layoutConfig,
    menuConfig: restaurantData.menuConfig?.items ? restaurantData.menuConfig : defaults.menuConfig,
    settings: { ...defaults.settings, ...(restaurantData.settings || {}), branding: { ...defaults.settings.branding, ...(restaurantData.theme || {}), ...(restaurantData.settings?.branding || {}) } },
    currentShift: restaurantData.currentShift || defaults.currentShift,
    analytics: { events: Array.isArray(restaurantData.analyticsEvents) ? restaurantData.analyticsEvents : [] },
    profile: defaults.profile,
    messages: Array.isArray(restaurantData.messages) ? restaurantData.messages : defaults.messages
  };
}

function buildRestaurantMembers() {
  return state.users.map((user) => ({
    userId: user.id,
    role: user.role || "Server",
    section: user.section || state.profile.station || "Station 1",
    joinedAt: user.joinedAt || user.createdAt || Date.now(),
    permissions: permissionsForRole(user.role || "Server"),
    activeShift: state.currentShift.userId === user.id ? state.currentShift.id : null,
    deviceIds: [state.currentShift.syncState?.deviceId || "local-device"]
  }));
}

function buildDefaultPermissions() {
  return {
    "General Manager": ["all"],
    Manager: ["service", "alerts", "messages", "floor_setup", "menu_setup", "team"],
    Supervisor: ["service", "alerts", "messages", "analytics"],
    PIC: ["service", "alerts", "messages", "rotation"],
    Server: ["service", "assigned_tables", "alerts", "messages", "sidework"],
    Host: ["floor", "seating", "alerts", "messages"],
    Dishwasher: ["sidework", "alerts", "messages"]
  };
}

function permissionsForRole(role) {
  return buildDefaultPermissions()[role] || buildDefaultPermissions().Server;
}

function generateInviteCode() {
  return `TF-DENNYS-${Math.floor(1000 + Math.random() * 9000)}`;
}

function exportAllData() {
  downloadJson("tableflow-all-data.json", exportAllDataObject());
}

function importAllData(text) {
  try {
    const data = JSON.parse(text);
    const defaults = createDefaults();
    if (data.restaurantData) {
      state.restaurantData = data.restaurantData;
      Object.assign(state, normalizeAll(restaurantDataToAppState(data.restaurantData, defaults), defaults));
    } else {
      Object.assign(state, normalizeAll(data, defaults));
    }
    saveAll(true);
    renderAll();
    toast("Imported all data.");
  } catch (error) {
    toast("Import failed. File is not valid TableFlow JSON.", "danger");
  }
}

function importBrandingData(text) {
  try {
    const parsed = JSON.parse(text);
    state.settings.branding = { ...defaultBranding(), ...parsed };
    applyBranding();
    markDirty();
    renderAll();
    toast("Branding imported.");
  } catch {
    toast("Branding import failed.", "danger");
  }
}

function logoutLocal() {
  safeWrite(STORAGE_KEYS.activeSession, null);
  localStorage.removeItem(STORAGE_KEYS.activeSession);
  state.activeUser = null;
  state.authMode = "welcome";
  els.appShell.classList.add("hidden");
  els.authScreen.classList.remove("hidden");
  renderAuth();
}

function exportMenuCsv() {
  downloadText("tableflow-menu.csv", menuToCsv(getServiceMenuItems()), "text/csv");
}

function importMenuCsv(text) {
  const result = csvToMenu(text);
  if (result.items.length) {
    state.menuConfig.items = result.items;
    markDirty();
    renderAll();
  }
  toast(`Imported ${result.items.length} menu rows. ${result.errors.length ? `${result.errors.length} rows skipped.` : ""}`, result.errors.length ? "danger" : "ok");
}

function openTableContextMenu(event, object) {
  if (object.category !== "table") return;
  event.preventDefault();
  event.stopPropagation();
  clearLongPress();
  state.selectedTableId = object.id;
  document.querySelector(".context-menu")?.remove();
  const menu = document.createElement("div");
  menu.className = "context-menu";
  menu.style.left = `${Math.min(event.clientX || 20, window.innerWidth - 240)}px`;
  menu.style.top = `${Math.min(event.clientY || 20, window.innerHeight - 360)}px`;
  menu.innerHTML = `
    <button data-context="seat" type="button">Seat Table</button>
    <button data-context="order" type="button">View Order</button>
    <button data-context="pos" type="button">Open POS Queue</button>
    <button data-context="status" type="button">Change Status</button>
    <button data-context="check" type="button">Guest Check</button>
    <button data-context="edit" type="button">Edit Table Info</button>
    <button data-context="seat-add" type="button">Add Seat</button>
    <button data-context="reset" type="button">Close / Reset Table</button>
  `;
  menu.addEventListener("click", (clickEvent) => {
    const action = clickEvent.target.dataset.context;
    document.querySelector(".context-menu")?.remove();
    handleContextAction(object.id, action);
  });
  document.body.appendChild(menu);
  window.setTimeout(() => document.addEventListener("click", closeContextMenu, { once: true }), 0);
  renderAll();
}

function closeContextMenu() {
  document.querySelector(".context-menu")?.remove();
}

function handleContextAction(tableId, action) {
  const table = getTable(tableId);
  const tableState = getTableState(tableId);
  if (action === "seat") quickSeatSelected();
  if (action === "order") setView("orders");
  if (action === "pos") setView("pos");
  if (action === "status") showStatusChooser(tableId);
  if (action === "check") showGuestCheck(tableId);
  if (action === "edit") runAdminAction(() => { state.editMode = true; renderAll(); });
  if (action === "seat-add") { table.seats += 1; tableState.partySize = Math.max(tableState.partySize, table.seats); logEvent("seat_added", tableId, null, null, {}); markDirty(); renderAll(); }
  if (action === "reset") resetTableWithConfirm(tableId);
}

function showStatusChooser(tableId) {
  showModal(`
    <h3>Change Status</h3>
    <div class="modifier-pills">${STATUS.map((status) => `<button data-status-choice="${status}" type="button">${status}</button>`).join("")}</div>
    <div class="modal-actions"><button id="closeModalButton" type="button">Cancel</button></div>
  `);
  document.querySelectorAll("[data-status-choice]").forEach((button) => button.addEventListener("click", () => {
    setTableStatus(tableId, button.dataset.statusChoice);
    closeModal();
  }));
  document.getElementById("closeModalButton").addEventListener("click", closeModal);
}

// Events
function bindEvents() {
  document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => {
    const view = button.dataset.view;
    setView(view);
  }));
  els.mobileNavToggle?.addEventListener("click", () => { state.mobileNavOpen = !state.mobileNavOpen; renderNavigation(); });
  els.mobileNavBackdrop?.addEventListener("click", () => { state.mobileNavOpen = false; renderNavigation(); });
  window.addEventListener("pointermove", moveDrag);
  window.addEventListener("pointerup", endDrag);
  els.floorCanvas.addEventListener("click", () => { state.selectedTableId = null; renderAll(); });
  els.floorEditorCanvas.addEventListener("click", () => { state.floorEditorSelectedId = null; renderFloorEditor(); });
  els.editModeButton.addEventListener("click", () => runAdminAction(() => setView("flooreditor")));
  els.openFloorEditorButton.addEventListener("click", () => runAdminAction(() => setView("flooreditor")));
  els.backToFloorButton.addEventListener("click", () => setView("floor"));
  els.saveLayoutButton.addEventListener("click", () => { saveAll(true); toast("Layout saved."); });
  els.undoLayoutButton.addEventListener("click", undoLayout);
  els.redoLayoutButton.addEventListener("click", redoLayout);
  els.snapToggle.addEventListener("change", () => { state.settings.snap = els.snapToggle.checked; markDirty(); renderAll(); });
  els.gridToggle.addEventListener("change", () => { state.settings.showGrid = els.gridToggle.checked; markDirty(); renderAll(); });
  els.zoomOutButton.addEventListener("click", () => { state.floorEditorZoom = Math.max(0.5, state.floorEditorZoom - 0.1); renderFloorEditor(); });
  els.resetZoomButton.addEventListener("click", () => { state.floorEditorZoom = 1; renderFloorEditor(); });
  els.zoomInButton.addEventListener("click", () => { state.floorEditorZoom = Math.min(1.8, state.floorEditorZoom + 0.1); renderFloorEditor(); });
  els.exportLayoutButton.addEventListener("click", exportFloorLayout);
  els.importLayoutButton.addEventListener("click", () => els.layoutFileInput.click());
  els.layoutFileInput.addEventListener("change", readFileInput(importFloorLayout));
  els.quickSeatButton.addEventListener("click", () => quickSeatSelected());
  els.startTableButton.addEventListener("click", openStartTableFlow);
  els.openMenuButton.addEventListener("click", () => setView("menu"));
  els.sendDrinksButton.addEventListener("click", sendDrinkRound);
  els.guestCheckTopButton.addEventListener("click", () => state.selectedTableId && showGuestCheck(state.selectedTableId));
  els.messagesTopButton?.addEventListener("click", () => setView("messages"));
  els.menuSearchInput.addEventListener("input", () => { state.menuSearch = els.menuSearchInput.value; renderMenu(); });
  els.menuSubcategoryFilter.addEventListener("change", () => { state.menuSubcategory = els.menuSubcategoryFilter.value; renderMenu(); });
  els.menuEditorSearchInput.addEventListener("input", () => { state.menuEditorSearch = els.menuEditorSearchInput.value; renderMenuEditor(); });
  els.menuEditorCategoryFilter.addEventListener("change", () => { state.menuEditorCategory = els.menuEditorCategoryFilter.value; renderMenuEditor(); });
  els.noDrinkButton.addEventListener("click", () => addMenuItemToSelectedSeat("no-drink"));
  els.copyPosQueueButton.addEventListener("click", () => copyText(buildPosText()));
  els.alertsButton.addEventListener("click", showAlertsDrawer);
  els.saveNowButton.addEventListener("click", () => { saveAll(true); toast("Saved."); });
  els.lockAppButton?.addEventListener("click", lockApp);
  els.unlockButton.addEventListener("click", unlockWithPin);
  els.clearLocalDataButton.addEventListener("click", () => showConfirm("This will remove local TableFlow data from this device.", "Clear Local Data", clearAllLocalData));
  bindSettingsEvents();
  bindMenuImportExportEvents();
  bindSideWorkImportExportEvents();
  bindAnalyticsEvents();
}

function bindSettingsEvents() {
  els.themeToggle.addEventListener("change", () => { setTheme(els.themeToggle.checked ? "light" : "dark"); saveAll(true); renderAll(); });
  els.notificationsToggle.addEventListener("change", () => { state.settings.notifications = els.notificationsToggle.checked; saveAll(true); });
  els.inAppAlertsToggle.addEventListener("change", () => { state.settings.notificationSettings.inAppAlerts = els.inAppAlertsToggle.checked; saveAll(true); });
  els.pushNotificationsToggle.addEventListener("change", () => {
    if (els.pushNotificationsToggle.checked) requestPushNotifications();
    else { state.settings.notificationSettings.pushNotifications = false; saveAll(true); renderAll(); }
  });
  els.voiceNotificationsToggle.addEventListener("change", () => { state.settings.notificationSettings.voiceNotifications = els.voiceNotificationsToggle.checked; saveAll(true); });
  els.voiceModeInput.addEventListener("change", () => { state.settings.notificationSettings.voiceMode = els.voiceModeInput.value; saveAll(true); });
  els.chimeToggle.addEventListener("change", () => { state.settings.chime = els.chimeToggle.checked; saveAll(true); });
  els.autosaveToggle.addEventListener("change", () => { state.settings.autosave = els.autosaveToggle.checked; saveAll(true); });
  els.compactNavToggle.addEventListener("change", () => { state.settings.navigation.compact = els.compactNavToggle.checked; saveAll(true); renderAll(); });
  els.chimeVolume.addEventListener("input", () => { state.settings.chimeVolume = Number(els.chimeVolume.value); saveAll(true); });
  els.pinEnabledToggle.addEventListener("change", () => { state.settings.pinEnabled = els.pinEnabledToggle.checked; saveAll(true); renderAll(); });
  els.pinRequireOpenToggle.addEventListener("change", () => { state.settings.pinRequireOpen = els.pinRequireOpenToggle.checked; saveAll(true); renderAll(); });
  els.pinRequireAdminToggle.addEventListener("change", () => { state.settings.pinRequireAdmin = els.pinRequireAdminToggle.checked; saveAll(true); renderAll(); });
  els.sideWorkRemindersToggle.addEventListener("change", () => { state.settings.sideWork.remindersEnabled = els.sideWorkRemindersToggle.checked; saveAll(true); });
  els.sideWorkChimeToggle.addEventListener("change", () => { state.settings.sideWork.chimeEnabled = els.sideWorkChimeToggle.checked; saveAll(true); });
  els.sideWorkReminderStyleInput.addEventListener("change", () => { state.settings.sideWork.reminderStyle = els.sideWorkReminderStyleInput.value; saveAll(true); });
  els.sideWorkSnoozeInput.addEventListener("change", () => { state.settings.sideWork.snoozeDefaultMinutes = Number(els.sideWorkSnoozeInput.value) || 15; saveAll(true); });
  els.sideWorkMaxFocusInput.addEventListener("change", () => { state.settings.sideWork.maxFocusTasks = Math.max(1, Math.min(3, Number(els.sideWorkMaxFocusInput.value) || 3)); saveAll(true); renderAll(); });
  els.checkBackEnabledToggle.addEventListener("change", () => { state.settings.checkBack.enabled = els.checkBackEnabledToggle.checked; saveAll(true); });
  els.checkBackSmartToggle.addEventListener("change", () => { state.settings.checkBack.useSmartTiming = els.checkBackSmartToggle.checked; saveAll(true); });
  els.checkBackChimeToggle.addEventListener("change", () => { state.settings.checkBack.chimeEnabled = els.checkBackChimeToggle.checked; saveAll(true); });
  els.checkBackPulseToggle.addEventListener("change", () => { state.settings.checkBack.pulseTable = els.checkBackPulseToggle.checked; saveAll(true); renderAll(); });
  els.firstCheckInput.addEventListener("change", () => { state.settings.checkBack.firstCheckMinutes = clamp(els.firstCheckInput.value, 1, 5); saveAll(true); });
  els.refillCheckInput.addEventListener("change", () => { state.settings.checkBack.refillCheckMinutes = clamp(els.refillCheckInput.value, 5, 15); saveAll(true); });
  els.secondCheckInput.addEventListener("change", () => { state.settings.checkBack.secondCheckMinutes = clamp(els.secondCheckInput.value, 10, 25); saveAll(true); });
  els.dessertSuggestInput.addEventListener("change", () => { state.settings.checkBack.dessertSuggestMinutes = clamp(els.dessertSuggestInput.value, 18, 40); saveAll(true); });
  els.quickDrinkDeliveryToggle.addEventListener("change", () => { state.settings.serviceWorkflow.quickDrinkDelivery = els.quickDrinkDeliveryToggle.checked; saveAll(true); renderAll(); });
  els.skipDrinkDeliveryConfirmToggle.addEventListener("change", () => { state.settings.serviceWorkflow.skipDrinkDeliveryConfirm = els.skipDrinkDeliveryConfirmToggle.checked; saveAll(true); });
  els.orderReminderAfterDrinksToggle.addEventListener("change", () => { state.settings.serviceWorkflow.orderReminderAfterDrinks = els.orderReminderAfterDrinksToggle.checked; saveAll(true); });
  els.orderReminderAfterDrinksInput.addEventListener("change", () => { state.settings.serviceWorkflow.orderReminderAfterDrinksMinutes = clamp(els.orderReminderAfterDrinksInput.value, 1, 20); saveAll(true); renderAll(); });
  els.savePinButton.addEventListener("click", savePinFromSettings);
  els.removePinButton.addEventListener("click", () => runAdminAction(removePin));
  els.testChimeButton.addEventListener("click", playChime);
  els.testNotificationButton.addEventListener("click", testNotification);
  els.exportAllButton.addEventListener("click", () => runAdminAction(exportAllData));
  els.importAllButton.addEventListener("click", () => runAdminAction(() => els.importAllInput.click()));
  els.importAllInput.addEventListener("change", readFileInput((text) => importAllData(text)));
  els.clearShiftButton.addEventListener("click", clearShiftWithConfirm);
  els.resetDemoButton.addEventListener("click", resetDemoWithConfirm);
  els.developerModeToggle.addEventListener("change", () => { state.settings.developer.enabled = els.developerModeToggle.checked; saveAll(true); renderAll(); });
  els.testerToggleSetting.addEventListener("change", () => { state.settings.developer.showTesterToggle = els.testerToggleSetting.checked; saveAll(true); renderAll(); });
  els.debugLogsToggle.addEventListener("change", () => { state.settings.developer.debugLogs = els.debugLogsToggle.checked; saveAll(true); });
  els.openDevToolsButton.addEventListener("click", () => setView("developer"));
  els.exportDebugReportButton.addEventListener("click", exportDebugReport);
  els.testerToggleButton.addEventListener("click", () => { state.testerEnabled = !state.testerEnabled; safeWrite("tableflow.dev.testerEnabled", state.testerEnabled); renderTesterPanel(); });
  els.runDeveloperCommandButton.addEventListener("click", runDeveloperCommand);
  els.developerCommandInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") runDeveloperCommand();
  });
  els.logoutSettingsButton.addEventListener("click", logoutLocal);
  els.saveBrandingButton.addEventListener("click", saveBrandingFromSettings);
  els.uploadLogoButton.addEventListener("click", () => els.logoFileInput.click());
  els.logoFileInput.addEventListener("change", handleLogoUpload);
  els.removeLogoButton.addEventListener("click", () => { state.settings.branding.logoDataUrl = ""; state.settings.branding.logoKey = ""; state.settings.branding.logoAssetPath = ""; markDirty(); renderAll(); });
  els.saveCustomThemeButton.addEventListener("click", () => { state.settings.branding.preset = "custom"; markDirty(); renderAll(); toast("Custom theme saved."); });
  els.resetThemeButton.addEventListener("click", () => applyThemePreset("default"));
  els.exportRestaurantButton.addEventListener("click", () => runAdminAction(() => downloadJson("tableflow-restaurant-data.json", buildRestaurantData())));
  els.exportBrandingButton.addEventListener("click", () => runAdminAction(() => downloadJson("tableflow-branding.json", state.settings.branding)));
  els.importBrandingButton.addEventListener("click", () => runAdminAction(() => els.importBrandingInput.click()));
  els.importBrandingInput.addEventListener("change", readFileInput(importBrandingData));
}

function bindSideWorkImportExportEvents() {
  els.addSideWorkTaskButton.addEventListener("click", () => runAdminAction(addSideWorkTaskFromSetup));
  els.exportSideWorkJsonButton.addEventListener("click", () => runAdminAction(() => downloadJson("tableflow-side-work.json", state.currentShift.sideWork)));
  els.importSideWorkJsonButton.addEventListener("click", () => runAdminAction(() => { els.sideWorkFileInput.dataset.mode = "json"; els.sideWorkFileInput.click(); }));
  els.exportSideWorkCsvButton.addEventListener("click", () => runAdminAction(() => downloadText("tableflow-side-work.csv", sideWorkToCsv(state.currentShift.sideWork.taskTemplates), "text/csv")));
  els.importSideWorkCsvButton.addEventListener("click", () => runAdminAction(() => { els.sideWorkFileInput.dataset.mode = "csv"; els.sideWorkFileInput.click(); }));
  els.templateSideWorkCsvButton.addEventListener("click", () => runAdminAction(() => downloadText("tableflow-side-work-template.csv", sideWorkCsvHeader(), "text/csv")));
  els.sideWorkFileInput.addEventListener("change", readFileInput((text) => {
    if (els.sideWorkFileInput.dataset.mode === "json") importSideWorkJson(text);
    else importSideWorkCsv(text);
  }));
}

function bindMenuImportExportEvents() {
  els.addMenuItemButton.addEventListener("click", () => runAdminAction(addMenuEditorItem));
  els.clearMenuFormButton.addEventListener("click", clearMenuForm);
  els.exportMenuJsonButton.addEventListener("click", () => runAdminAction(() => downloadJson("tableflow-menu.json", { ...state.menuConfig, items: getServiceMenuItems() })));
  els.importMenuJsonButton.addEventListener("click", () => runAdminAction(() => { els.menuFileInput.dataset.mode = "json"; els.menuFileInput.click(); }));
  els.exportMenuCsvButton.addEventListener("click", () => runAdminAction(exportMenuCsv));
  els.importMenuCsvButton.addEventListener("click", () => runAdminAction(() => { els.menuFileInput.dataset.mode = "csv"; els.menuFileInput.click(); }));
  els.templateMenuCsvButton.addEventListener("click", () => runAdminAction(() => downloadText("tableflow-menu-template.csv", csvHeader(), "text/csv")));
  els.menuFileInput.addEventListener("change", readFileInput((text) => {
    if (els.menuFileInput.dataset.mode === "json") {
      try {
        const parsed = JSON.parse(text);
        state.menuConfig = normalizeMenuConfig(parsed);
        markDirty();
        renderAll();
        toast("Menu JSON imported.");
      } catch {
        toast("Menu JSON import failed.", "danger");
      }
    } else {
      importMenuCsv(text);
    }
  }));
}

function bindAnalyticsEvents() {
  document.querySelectorAll("[data-analytics-range]").forEach((button) => button.addEventListener("click", () => {
    state.analyticsRange = button.dataset.analyticsRange;
    document.querySelectorAll("[data-analytics-range]").forEach((b) => b.classList.toggle("active", b === button));
    renderAnalytics();
  }));
  els.exportAnalyticsJsonButton.addEventListener("click", () => downloadJson("tableflow-analytics.json", state.analytics));
  els.exportAnalyticsCsvButton.addEventListener("click", () => downloadText("tableflow-analytics.csv", eventsToCsv(state.analytics.events), "text/csv"));
  els.clearAnalyticsButton.addEventListener("click", () => {
    showConfirm("Clear analytics history?", "Clear Analytics", () => {
      state.analytics.events = [];
      markDirty();
      renderAll();
    });
  });
}

function renderGeneralManager() {
  if (!els.gmPanel) return;
  if (!hasAnyRole(GM_ROLES)) {
    els.gmPanel.innerHTML = `<div class="settings-card locked-card"><h3>General Manager Access Required</h3><p>Your current role is ${escapeHtml(currentRole())}. Ask a General Manager to open setup tools.</p></div>`;
    return;
  }
  els.gmPanel.innerHTML = `
    <div class="gm-grid">
      ${renderGmTool("Store Settings", "Store identity, local workspace data, and role setup.", "settings", "Open Settings")}
      ${renderGmTool("Floor Editor", "Edit tables, stations, cashier spots, and labels.", "flooreditor", "Edit Floor")}
      ${renderGmTool("Menu Editor", "Edit menu items, POS keys, modifiers, and CSV imports.", "menueditor", "Edit Menu")}
      ${renderGmTool("Branding & Theme", "Logo, colors, theme presets, and guest check branding.", "settings", "Open Branding")}
      ${renderGmTool("Side Work Setup", "Task templates, station assignments, reminder settings.", "sidework", "Open Side Work")}
      ${renderGmTool("Import / Export", "Back up restaurant data, menu, layout, analytics, and branding.", "settings", "Open Data")}
      ${renderGmTool("Analytics", "View local event history and shift performance.", "analytics", "View Analytics")}
      ${renderGmTool("Developer Tools", "Device preview, simulations, stress tests, and debug report.", "developer", "Open Dev Tools")}
      <section class="settings-card">
        <h4>Store Team</h4>
        <div class="action-row"><span>Invite code</span><strong>${escapeHtml(state.restaurantData?.inviteCode || generateInviteCode())}</strong></div>
        <div class="button-row"><button id="regenerateInviteButton" type="button">Regenerate Invite Code</button><button id="toggleJoinButton" type="button">${state.restaurantData?.joiningEnabled === false ? "Enable Joining" : "Disable Joining"}</button></div>
        <p class="security-note">Join requests stay local until cloud sync is connected.</p>
      </section>
      <section class="settings-card">
        <h4>Kiosk Seating Rotation</h4>
        ${renderKioskRotation()}
      </section>
      <section class="settings-card">
        <h4>Team Activity Feed</h4>
        ${(state.currentShift.activityFeed || []).slice(0, 8).map((item) => `<div class="action-row"><span>${escapeHtml(item.text)}</span><strong>${new Date(item.createdAt).toLocaleTimeString()}</strong></div>`).join("") || `<div class="empty-state">No team activity yet.</div>`}
      </section>
      <section class="settings-card">
        <h4>User / Roles Management</h4>
        <p class="security-note">Local roles only. Cloud user management can replace this later.</p>
        <div class="user-role-list">
          ${state.users.length ? state.users.map((user) => `
            <label class="field user-role-row">
              <span>${escapeHtml(user.name)} (${escapeHtml(user.email)})</span>
              <select data-user-role="${user.id}">${getRoleOptions(user.role || "Server")}</select>
            </label>
          `).join("") : `<p>No local users yet.</p>`}
        </div>
      </section>
      <section class="settings-card">
        <h4>Kitchen Display System Coming Later</h4>
        <p>Prepared data model: main-kitchen, app-station, dessert-station, and drink-station tickets.</p>
        <code>kitchenTicket = { id, restaurantId, tableId, seatNumber, stationType, items, status, createdAt }</code>
      </section>
    </div>
  `;
  els.gmPanel.querySelectorAll("[data-gm-view]").forEach((button) => button.addEventListener("click", () => setView(button.dataset.gmView)));
  els.gmPanel.querySelectorAll("[data-user-role]").forEach((select) => select.addEventListener("change", () => updateUserRole(select.dataset.userRole, select.value)));
  document.getElementById("regenerateInviteButton")?.addEventListener("click", () => { state.restaurantData = { ...buildRestaurantData(), inviteCode: generateInviteCode() }; saveAll(true); renderAll(); toast("Invite code regenerated."); });
  document.getElementById("toggleJoinButton")?.addEventListener("click", () => { state.restaurantData = { ...buildRestaurantData(), joiningEnabled: state.restaurantData?.joiningEnabled === false }; saveAll(true); renderAll(); });
}

function renderKioskRotation() {
  const servers = state.users.filter((user) => ["Server", "PIC", "Supervisor", "Manager", "General Manager"].includes(user.role || "Server"));
  const records = state.currentShift.seatingRecords || [];
  const last = records[0];
  const next = servers.length ? servers[(Math.max(0, servers.findIndex((user) => user.id === last?.seatedForUserId)) + 1) % servers.length] : null;
  return `
    <div class="action-row"><span>Last seated server</span><strong>${escapeHtml(last?.seatedForName || "None")}</strong></div>
    <div class="action-row"><span>Next up</span><strong>${escapeHtml(next?.name || next?.fullName || "Set roster")}</strong></div>
    <div class="user-role-list">
      ${records.slice(0, 5).map((record) => `<div class="action-row"><span>Table ${escapeHtml(getTable(record.tableId)?.number || getTable(record.tableId)?.name || record.tableId)} - Party of ${record.partySize}</span><strong>Sat for ${escapeHtml(record.seatedForName)} by ${escapeHtml(record.seatedByName)}</strong></div>`).join("") || `<div class="empty-state">No seating records yet.</div>`}
    </div>
  `;
}

function renderGmTool(title, description, view, buttonLabel) {
  return `
    <section class="settings-card gm-tool-card">
      <h4>${escapeHtml(title)}</h4>
      <p>${escapeHtml(description)}</p>
      <button class="primary" data-gm-view="${view}" type="button">${escapeHtml(buttonLabel)}</button>
    </section>
  `;
}

function updateUserRole(userId, role) {
  state.users = state.users.map((user) => user.id === userId ? { ...user, role, updatedAt: Date.now() } : user);
  if (state.activeUser?.id === userId) state.activeUser.role = role;
  safeWrite(STORAGE_KEYS.users, state.users);
  logEvent("user_role_updated", null, null, null, { userId, role });
  markDirty();
  renderAll();
  toast("Role updated locally.");
}

function runDeveloperCommand() {
  const raw = els.developerCommandInput.value.trim();
  const command = raw.toLowerCase();
  if (!command) return toast("Type a developer command first.", "danger");
  if (["help", "?"].includes(command)) {
    showModal(`
      <h3>Developer Commands</h3>
      <p><strong>role gm</strong> - make current user General Manager.</p>
      <p><strong>role server</strong> - make current user Server.</p>
      <p><strong>role manager</strong>, <strong>role supervisor</strong>, <strong>role pic</strong>, <strong>role host</strong>, <strong>role dishwasher</strong></p>
      <p><strong>seed owner</strong> - recreate the local owner login.</p>
      <p><strong>login owner</strong> - sign in as the local owner account.</p>
      <div class="modal-actions"><button class="primary" id="closeModalButton" type="button">OK</button></div>
    `);
    document.getElementById("closeModalButton").addEventListener("click", closeModal);
    return;
  }
  if (["seed owner", "seed gm", "create owner"].includes(command)) {
    ensureDeveloperOwnerAccount();
    els.developerCommandInput.value = "";
    renderAll();
    return toast(`Owner account ready: ${DEV_OWNER_EMAIL}`);
  }
  if (["login owner", "login gm"].includes(command)) {
    ensureDeveloperOwnerAccount();
    const owner = state.users.find((user) => user.email === DEV_OWNER_EMAIL);
    startSession(owner);
    loadStateSafely();
    els.developerCommandInput.value = "";
    renderAll();
    return toast("Signed in as local owner.");
  }
  const role = parseDeveloperRole(command);
  if (role) {
    setCurrentUserRole(role);
    els.developerCommandInput.value = "";
    return;
  }
  toast("Unknown command. Try: role gm, role server, seed owner, login owner.", "danger");
}

function parseDeveloperRole(command) {
  const cleaned = command.replace(/^set\s+/, "").replace(/^make\s+me\s+/, "").replace(/^role\s+/, "").trim();
  const roles = {
    gm: "General Manager",
    general: "General Manager",
    "general manager": "General Manager",
    manager: "Manager",
    supervisor: "Supervisor",
    pic: "PIC",
    server: "Server",
    host: "Host",
    dishwasher: "Dishwasher"
  };
  return roles[cleaned] || null;
}

function setCurrentUserRole(role) {
  if (!state.activeUser) return toast("Sign in first, then run the role command.", "danger");
  state.activeUser.role = role;
  state.profile.role = role;
  state.profile.workSchedule = { ...state.profile.workSchedule, role };
  state.users = state.users.map((user) => user.id === state.activeUser.id ? { ...user, role, updatedAt: Date.now() } : user);
  safeWrite(STORAGE_KEYS.users, state.users);
  safeWrite(STORAGE_KEYS.activeSession, { userId: state.activeUser.id, signedInAt: Date.now() });
  logEvent("developer_role_command", null, null, null, { role });
  markDirty();
  renderAll();
  toast(`Role changed to ${role}.`);
}

function buildRoleSummary() {
  return state.users.map((user) => ({ id: user.id, name: user.name, email: user.email, role: user.role || "Server", employeeId: user.employeeId || "" }));
}

function isClockedIn() {
  return Boolean(state.currentShift?.isClockedIn && !state.currentShift.clockOutAt);
}

function getCurrentAssignedTableIds() {
  return state.currentShift?.assignedTableIds?.length ? state.currentShift.assignedTableIds : getProfileAssignedTableIds();
}

function requireClockedIn(action) {
  if (isClockedIn() || hasAnyRole(["General Manager", "Manager", "Supervisor", "PIC"])) {
    action();
    return;
  }
  openClockInFlow("Clock in before starting tables.");
}

function openClockInFlow(message = "") {
  const tables = state.layoutConfig.objects.filter((object) => object.category === "table");
  const selected = new Set(getCurrentAssignedTableIds());
  const sectionId = state.currentShift.sectionId || getCurrentStationId();
  showModal(`
    <div class="flow-header">
      <div><h3>Clock In</h3><p>${escapeHtml(message || "Select your Denny's section and tables for this shift.")}</p></div>
      <button id="closeModalButton" type="button">Cancel</button>
    </div>
    <div class="form-grid">
      <label class="field"><span>Role</span><select id="clockRoleInput">${getRoleOptions(currentRole())}</select></label>
      <label class="field"><span>Section</span><select id="clockSectionInput">${state.layoutConfig.stations.filter((station) => station.type === "server").map((station) => `<option value="${station.id}" ${station.id === sectionId ? "selected" : ""}>${escapeHtml(station.name)}</option>`).join("")}</select></label>
      <label class="field wide"><span>Starting notes optional</span><input id="clockNotesInput" placeholder="Example: closing section, patio closed, training server" /></label>
    </div>
    <div class="button-row"><button id="clockSelectSectionButton" type="button">Select All In Section</button><button id="clockClearTablesButton" type="button">Clear Selection</button></div>
    <div class="section-table-grid">
      ${tables.map((table) => `<button class="${selected.has(table.id) ? "active" : ""}" data-clock-table="${table.id}" type="button"><strong>${escapeHtml(table.name)}</strong><span>${escapeHtml(getStationName(table.stationId))}</span></button>`).join("")}
    </div>
    <div class="modal-actions"><button class="primary" id="confirmClockInButton" type="button">Confirm Shift Start</button></div>
  `);
  const refreshSectionSelection = () => {
    const stationId = document.getElementById("clockSectionInput").value;
    document.querySelectorAll("[data-clock-table]").forEach((button) => {
      button.classList.toggle("active", getTable(button.dataset.clockTable)?.stationId === stationId);
    });
  };
  document.getElementById("clockSelectSectionButton").addEventListener("click", refreshSectionSelection);
  document.getElementById("clockClearTablesButton").addEventListener("click", () => document.querySelectorAll("[data-clock-table]").forEach((button) => button.classList.remove("active")));
  document.querySelectorAll("[data-clock-table]").forEach((button) => button.addEventListener("click", () => button.classList.toggle("active")));
  document.getElementById("confirmClockInButton").addEventListener("click", confirmClockIn);
  document.getElementById("closeModalButton").addEventListener("click", closeModal);
}

function confirmClockIn() {
  const assignedTableIds = Array.from(document.querySelectorAll("[data-clock-table].active")).map((button) => button.dataset.clockTable);
  state.currentShift.isClockedIn = true;
  state.currentShift.clockInAt = Date.now();
  state.currentShift.clockOutAt = null;
  state.currentShift.userId = state.activeUser?.id || "local-user";
  state.currentShift.restaurantId = state.restaurantData?.id || "local-store";
  state.currentShift.role = document.getElementById("clockRoleInput").value;
  state.currentShift.sectionId = document.getElementById("clockSectionInput").value;
  state.currentShift.assignedTableIds = assignedTableIds;
  state.currentShift.notes = document.getElementById("clockNotesInput").value.trim();
  state.profile.loggedIn = true;
  state.profile.role = state.currentShift.role;
  state.profile.assignedTableIds = assignedTableIds;
  state.profile.shiftStart = state.currentShift.clockInAt;
  closeModal();
  logEvent("clock_in", null, null, null, { assignedTableIds, sectionId: state.currentShift.sectionId });
  saveAll(true);
  renderAll();
  toast("Clocked in.");
}

function openClockOutFlow() {
  const now = Date.now();
  const clockIn = state.currentShift.clockInAt || state.profile.shiftStart || now;
  const hours = Math.max(0.01, (now - clockIn) / 3600000);
  showModal(`
    <div class="flow-header"><div><h3>Clock Out</h3><p>Review your shift summary before ending service.</p></div><button id="closeModalButton" type="button">Cancel</button></div>
    <div class="dashboard-stats">
      <div class="stat-card"><p>Shift Length</p><h3>${hours.toFixed(2)}h</h3></div>
      <div class="stat-card"><p>Tables Served</p><h3>${getShiftTablesServed()}</h3></div>
      <div class="stat-card"><p>Guests Served</p><h3>${getShiftGuestsServed()}</h3></div>
    </div>
    <div class="form-grid">
      <label class="field"><span>Clock out time</span><input id="clockOutTimeInput" type="datetime-local" value="${toDateTimeLocal(now)}" /></label>
      <label class="field"><span>Tips earned</span><input id="tipsEarnedInput" type="number" min="0" step="0.01" /></label>
      <label class="field wide"><span>Notes</span><textarea id="clockOutNotesInput" rows="3"></textarea></label>
    </div>
    <div class="modal-actions"><button class="primary" id="confirmClockOutButton" type="button">Confirm Clock Out</button></div>
  `);
  document.getElementById("confirmClockOutButton").addEventListener("click", confirmClockOut);
  document.getElementById("closeModalButton").addEventListener("click", closeModal);
}

function confirmClockOut() {
  const adjusted = new Date(document.getElementById("clockOutTimeInput").value).getTime() || Date.now();
  const clockIn = state.currentShift.clockInAt || adjusted;
  const tips = Number(document.getElementById("tipsEarnedInput").value) || 0;
  const hours = Math.max(0.01, (adjusted - clockIn) / 3600000);
  const summary = {
    id: makeId("shiftSummary"),
    userId: state.currentShift.userId || state.activeUser?.id || "local-user",
    restaurantId: state.currentShift.restaurantId || state.restaurantData?.id || "local-store",
    clockInAt: clockIn,
    clockOutAt: Date.now(),
    adjustedClockOutAt: adjusted,
    assignedTableIds: state.currentShift.assignedTableIds || [],
    tipsEarned: tips,
    tipHourlyRate: Number((tips / hours).toFixed(2)),
    tablesServed: getShiftTablesServed(),
    guestsServed: getShiftGuestsServed(),
    ordersRungIn: getPosQueueRows().length,
    checkBacksCompleted: state.analytics.events.filter((event) => event.type === "check_back_completed").length,
    sideWorkCompleted: getSideWorkRows().filter((row) => row.instance.status === "Done").length,
    notes: document.getElementById("clockOutNotesInput").value.trim(),
    createdAt: Date.now()
  };
  state.currentShift.shiftSummaries.unshift(summary);
  if (state.storage.idbAvailable) idbPut("shiftSummaries", summary);
  state.currentShift.isClockedIn = false;
  state.currentShift.clockOutAt = adjusted;
  state.currentShift.tipsEarned = tips;
  closeModal();
  logEvent("clock_out", null, null, null, summary);
  saveAll(true);
  renderAll();
  toast(`Clocked out. Tips/hour: $${summary.tipHourlyRate.toFixed(2)}`);
}

function getShiftTablesServed() {
  return Object.values(state.currentShift.tables || {}).filter((table) => table.partySize || table.timestamps?.seated).length;
}

function getShiftGuestsServed() {
  return Object.values(state.currentShift.tables || {}).reduce((sum, table) => sum + Number(table.partySize || table.maxPartySize || 0), 0);
}

function toDateTimeLocal(time) {
  const date = new Date(time);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

// Service actions
function quickSeatSelected() {
  openStartTableFlow();
}

function seatParty(tableId, partySize, options = {}) {
  const tableState = getTableState(tableId);
  const now = Date.now();
  const table = getTable(tableId);
  const ownerUserId = state.currentShift.userId || state.activeUser?.id || "local-user";
  const ownerName = state.profile.name || state.activeUser?.name || state.activeUser?.fullName || "Server";
  tableState.partySize = partySize;
  tableState.updatedAt = now;
  tableState.maxPartySize = Math.max(Number(tableState.maxPartySize || 0), Number(partySize || 0));
  tableState.selectedSeat = partySize ? 1 : null;
  tableState.timestamps.seated = tableState.timestamps.seated || now;
  tableState.seatedAt = tableState.timestamps.seated;
  tableState.ownerUserId = ownerUserId;
  tableState.ownerName = ownerName;
  tableState.sectionId = state.currentShift.sectionId || table?.stationId || getCurrentStationId();
  tableState.seats = Array.from({ length: Math.max(1, Number(partySize || 1)) }, (_, index) => ({
    id: `${tableId}-seat-${index + 1}`,
    seatNumber: index + 1,
    status: "Seated",
    createdAt: now
  }));
  state.selectedTableId = tableId;
  state.currentShift.activeTableId = tableId;
  const seatingRecord = {
    id: makeId("seating"),
    tableId,
    partySize,
    seatedForUserId: ownerUserId,
    seatedForName: ownerName,
    seatedByUserId: state.activeUser?.id || "local-device",
    seatedByName: state.activeUser?.name || state.activeUser?.fullName || "TableFlow",
    seatedAt: now
  };
  state.currentShift.seatingRecords.unshift(seatingRecord);
  state.currentShift.activityFeed.unshift({ id: makeId("activity"), type: "table_seated", text: `${seatingRecord.seatedByName} sat ${table?.name || tableId} for ${ownerName}`, createdAt: now });
  setTableStatus(tableId, partySize ? "Seated" : "Open", false);
  logEvent("table_seated", tableId, null, null, { partySize, ownerUserId });
  if (seatingRecord.seatedByUserId !== seatingRecord.seatedForUserId) {
    createSystemAlert({ type: "table_sat_for_you", tableId, message: `Party of ${partySize} sat for you by ${seatingRecord.seatedByName} at ${table?.name || "a table"}.` });
  }
  markDirty();
  if (partySize > 0 && !options.goToDashboard) {
    state.activeMenuCategory = "BEV";
    state.activeView = "menu";
  }
  if (partySize > 0 && options.goToDashboard) state.activeView = "tabledashboard";
  renderAll();
}

function selectSeat(tableId, seatNumber) {
  if (!tableId) return;
  getTableState(tableId).selectedSeat = Math.max(1, Number(seatNumber) || 1);
  markDirty();
  renderAll();
}

function sendDrinkRound() {
  const table = getSelectedTable();
  if (!table) return toast("Select a table first.", "danger");
  setTableStatus(table.id, "Drinks Ordered");
  logEvent("drinks_ordered", table.id, null, null, {});
  setView("pos");
}

function setTableStatus(tableId, status, rerender = true) {
  const tableState = getTableState(tableId);
  const now = Date.now();
  tableState.status = status;
  tableState.updatedAt = now;
  const key = status.toLowerCase().replaceAll(" ", "_").replace("-", "_");
  tableState.timestamps[key] = now;
  const eventMap = {
    Seated: "table_seated",
    Greeted: "greeted",
    "Drinks Ordered": "drinks_ordered",
    "Drinks Served": "drinks_served",
    "Apps Fired": "app_fired",
    "Order Taken": "order_taken",
    "Order Sent": "order_sent",
    "Food Running": "food_running",
    "Check Back": "check_back",
    "Check Back Due": "check_back_due",
    "Refill Check Due": "refill_check_due",
    "Check Back Overdue": "check_back_overdue",
    "Check Back Done": "check_back_completed",
    "Check Dropped": "check_dropped",
    Paid: "paid",
    "Pre-Bus": "pre_bus",
    "Bus Needed": "bus_needed",
    Reset: "table_reset"
  };
  logEvent(eventMap[status] || "status_changed", tableId, null, null, { status });
  markDirty();
  if (rerender) renderAll();
}

function resetTableWithConfirm(tableId) {
  showConfirm("Reset this table and clear its current shift orders?", "Reset Table", () => resetTable(tableId));
}

function resetTable(tableId) {
  const table = getTable(tableId);
  state.currentShift.tables[tableId] = defaultTableState(table);
  logEvent("table_reset", tableId, null, null, {});
  markDirty();
  renderAll();
}

function clearShiftWithConfirm() {
  runAdminAction(() => showConfirm("Clear current shift only? Layout and menu stay saved.", "Clear Shift", () => {
    const defaults = createDefaults();
    state.currentShift = defaults.currentShift;
    state.selectedTableId = null;
    logEvent("shift_cleared", null, null, null, {});
    markDirty();
    renderAll();
  }));
}

function resetDemoWithConfirm() {
  runAdminAction(() => showConfirm("Reset demo data? This replaces current layout, menu, shift, and settings.", "Reset Demo", () => {
    const defaults = createDefaults();
    Object.assign(state, defaults);
    setTheme(state.settings.theme);
    saveAll(true);
    renderAll();
    toast("Demo data reset.");
  }));
}

// Utilities and helpers
function runReminderTick() {
  processSideWorkReminders();
  processCheckBackReminders();
  processTableReminders();
  if (["sidework", "floor", "stations"].includes(state.activeView) || state.selectedTableId) renderAll();
}

function getTable(id) { return state.layoutConfig.objects.find((o) => o.id === id); }
function getSelectedTable() { return state.selectedTableId ? getTable(state.selectedTableId) : null; }
function getTableState(id) { return state.currentShift.tables[id]; }
function getMenuItem(id) { return state.menuConfig.items.find((item) => item.id === id); }
function getActiveTables() {
  return state.layoutConfig.objects.filter((table) => {
    if (table.category !== "table") return false;
    const tableState = getTableState(table.id);
    const hasAlerts = state.currentShift.alerts.some((alert) => alert.tableId === table.id && alert.status !== "done");
    return tableState.partySize > 0 || tableState.orders.length || tableState.posQueue.some((item) => item.queueStatus !== "completed") || hasAlerts;
  });
}
function getActiveMinutes(tableState) {
  const start = tableState.timestamps.seated || tableState.timestamps.table_seated || tableState.startedAt || tableState.orders[0]?.createdAt;
  return start ? Math.max(0, Math.round((Date.now() - start) / 60000)) : 0;
}
function formatCountdown(timestamp) {
  const diff = Math.max(0, Number(timestamp) - Date.now());
  const minutes = Math.ceil(diff / 60000);
  return minutes <= 1 ? "1 min" : `${minutes} min`;
}
function getWorkSchedule() {
  return state.profile.workSchedule || createDefaults().profile.workSchedule;
}
function getCurrentStationId() {
  const schedule = getWorkSchedule();
  const stationName = state.profile.station || schedule.defaultStationId || "Station 1";
  const byId = state.layoutConfig.stations.find((station) => station.id === schedule.defaultStationId || station.id === stationName);
  const byName = state.layoutConfig.stations.find((station) => station.name === stationName);
  return byId?.id || byName?.id || schedule.defaultStationId || "server-1";
}
function getCurrentStationName() {
  const station = state.layoutConfig.stations.find((item) => item.id === getCurrentStationId() || item.name === state.profile.station);
  return station?.name || state.profile.station || "Station 1";
}

function getStationName(stationId) {
  return state.layoutConfig.stations.find((station) => station.id === stationId)?.name || stationId || "Unassigned";
}

function getTablesForStation(stationOrId) {
  const station = state.layoutConfig.stations.find((item) => item.id === stationOrId || item.name === stationOrId);
  const stationId = station?.id || stationOrId;
  return state.layoutConfig.objects.filter((object) => object.category === "table" && object.stationId === stationId);
}

function getProfileAssignedTableIds() {
  const saved = Array.isArray(state.profile.assignedTableIds) ? state.profile.assignedTableIds.filter((id) => getTable(id)) : [];
  if (saved.length) return saved;
  return getTablesForStation(getCurrentStationId()).map((table) => table.id);
}
function getShiftWindow(schedule = getWorkSchedule()) {
  const now = new Date();
  let start = combineDateAndTime(now, schedule.shiftStart || "09:00");
  let end = combineDateAndTime(now, schedule.shiftEnd || "17:00");
  if (end <= start) end += 86400000;
  const nowMs = Date.now();
  if (nowMs < start && end - start > 12 * 3600000) {
    start -= 86400000;
    end -= 86400000;
  }
  if (nowMs > end) {
    start += 86400000;
    end += 86400000;
  }
  return { start, end };
}
function combineDateAndTime(date, time, endGuard = null) {
  const [hours, minutes] = String(time || "00:00").split(":").map(Number);
  const value = new Date(date);
  value.setHours(hours || 0, minutes || 0, 0, 0);
  let ms = value.getTime();
  if (endGuard && ms > endGuard) ms -= 86400000;
  return ms;
}
function getShiftSummary() {
  const shift = getShiftWindow();
  const now = Date.now();
  const percent = Math.max(0, Math.min(100, Math.round(((now - shift.start) / (shift.end - shift.start)) * 100)));
  const tasks = getSideWorkRows();
  const doneCount = tasks.filter((row) => row.instance.status === "Done").length;
  return {
    percent,
    timeLeft: formatDuration(Math.max(0, shift.end - now)),
    scheduleText: `${formatClock(shift.start)} to ${formatClock(shift.end)}`,
    doneCount,
    totalCount: tasks.length
  };
}
function formatClock(ms) { return new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); }
function formatDueTime(ms) {
  const diff = ms - Date.now();
  if (Math.abs(diff) < 60000) return "now";
  return diff < 0 ? `${Math.round(Math.abs(diff) / 60000)}m ago` : `in ${Math.round(diff / 60000)}m`;
}
function formatDuration(ms) {
  const minutes = Math.round(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours}h ${rest}m` : `${rest}m`;
}
function priorityRank(priority) {
  return { high: 3, medium: 2, low: 1 }[priority] || 0;
}
function getCheckBackSettings() {
  return { ...createDefaults().settings.checkBack, ...(state.settings.checkBack || {}) };
}
function getCheckBackTimings() {
  const settings = getCheckBackSettings();
  if (!settings.useSmartTiming) return settings;
  const eating = estimateAverageEatingMinutes();
  return {
    ...settings,
    firstCheckMinutes: clamp(settings.firstCheckMinutes || 2, 1, 5),
    refillCheckMinutes: clamp(settings.refillCheckMinutes || 8, 5, 15),
    secondCheckMinutes: clamp(settings.secondCheckMinutes || 15, 10, 25),
    dessertSuggestMinutes: clamp(eating ? Math.round(eating * 0.7) : settings.dessertSuggestMinutes || 25, 18, 40)
  };
}
function estimateAverageEatingMinutes() {
  const events = state.analytics.events;
  const byTable = groupBy(events.filter((event) => event.tableId), "tableId");
  const values = Object.values(byTable).map((tableEvents) => {
    const food = tableEvents.find((event) => event.type === "food_delivered");
    const end = tableEvents.find((event) => event.type === "check_dropped" || event.type === "paid");
    return food && end && end.timestamp > food.timestamp ? Math.round((end.timestamp - food.timestamp) / 60000) : null;
  }).filter((value) => value !== null);
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}
function clamp(value, min, max) { return Math.max(min, Math.min(max, Number(value) || min)); }
function findPrepStation(item) {
  return state.layoutConfig.stations.find((station) => station.id === item.prepStationId || station.capabilities?.includes(item.prepCapability));
}
function nextStatus(status) { return STATUS[(STATUS.indexOf(status) + 1) % STATUS.length]; }
function cssStatus(status) { return status.toLowerCase().replaceAll(" ", "-").replace("/", "-"); }
function snap(value) { return state.settings.snap ? Math.round(value / GRID) * GRID : Math.round(value); }
function makeId(prefix) { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`; }
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function cssEscape(value) { return window.CSS?.escape ? CSS.escape(value) : String(value).replace(/["\\]/g, "\\$&"); }
function groupBy(items, key) { return items.reduce((g, item) => ((g[item[key]] ||= []).push(item), g), {}); }
function countBy(items, key) { return items.reduce((g, item) => ((g[item[key]] = (g[item[key]] || 0) + 1), g), {}); }
function escapeHtml(value) { return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
function toast(message, tone = "ok") {
  document.querySelector(".toast")?.remove();
  const el = document.createElement("div");
  el.className = `toast ${tone}`;
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}
function shake(el) {
  el.classList.remove("shake");
  void el.offsetWidth;
  el.classList.add("shake");
}
function updateTime() {
  els.currentTime.textContent = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
function playChime() {
  if (!state.settings.notifications || !state.settings.chime) return;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  const ctx = new Ctx();
  const gain = ctx.createGain();
  const a = ctx.createOscillator();
  const b = ctx.createOscillator();
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.01, state.settings.chimeVolume), ctx.currentTime + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
  a.frequency.value = 660; b.frequency.value = 880;
  a.connect(gain); b.connect(gain); gain.connect(ctx.destination);
  a.start(); b.start(ctx.currentTime + 0.1); a.stop(ctx.currentTime + 0.4); b.stop(ctx.currentTime + 0.45);
}
function showModal(html) {
  closeModal();
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `<div class="modal-card">${html}</div>`;
  modal.addEventListener("click", (event) => { if (event.target === modal) closeModal(); });
  document.body.appendChild(modal);
}
function closeModal() { document.querySelector(".modal-backdrop")?.remove(); }
function showConfirm(message, actionLabel, onConfirm) {
  showModal(`
    <h3>${escapeHtml(message)}</h3>
    <div class="modal-actions">
      <button id="cancelConfirmButton" type="button">Cancel</button>
      <button class="primary" id="okConfirmButton" type="button">${escapeHtml(actionLabel)}</button>
    </div>
  `);
  document.getElementById("cancelConfirmButton").addEventListener("click", closeModal);
  document.getElementById("okConfirmButton").addEventListener("click", () => {
    closeModal();
    onConfirm();
  });
}
function showNumberInput(label, value, onSave) {
  showModal(`
    <h3>${escapeHtml(label)}</h3>
    <label class="field"><span>${escapeHtml(label)}</span><input id="modalNumberInput" type="number" min="0" value="${Number(value) || 0}" /></label>
    <div class="modal-actions"><button id="cancelNumberButton" type="button">Cancel</button><button class="primary" id="saveNumberButton" type="button">Save</button></div>
  `);
  document.getElementById("cancelNumberButton").addEventListener("click", closeModal);
  document.getElementById("saveNumberButton").addEventListener("click", () => {
    const next = Number(document.getElementById("modalNumberInput").value) || 0;
    closeModal();
    onSave(next);
  });
}

function showTableSelectorModal(onSelect = null) {
  const tables = state.layoutConfig.objects.filter((object) => object.category === "table");
  showModal(`
    <h3>Select Table</h3>
    <div class="table-selector-grid">
      ${tables.map((table) => {
        const tableState = getTableState(table.id);
        return `<button class="table-select-tile status-${cssStatus(tableState.status)}" data-select-table="${table.id}" type="button"><strong>${escapeHtml(table.name)}</strong><span>${escapeHtml(tableState.status)}</span><small>${tableState.partySize || 0}/${table.seats} guests</small></button>`;
      }).join("")}
    </div>
    <div class="modal-actions"><button id="closeModalButton" type="button">Cancel</button></div>
  `);
  document.querySelectorAll("[data-select-table]").forEach((button) => button.addEventListener("click", () => {
    state.selectedTableId = button.dataset.selectTable;
    closeModal();
    if (onSelect) onSelect(state.selectedTableId);
    renderAll();
  }));
  document.getElementById("closeModalButton").addEventListener("click", closeModal);
}

function openStartTableFlow() {
  if (!isClockedIn() && !hasAnyRole(["General Manager", "Manager", "Supervisor", "PIC"])) {
    openClockInFlow("Clock in before starting tables.");
    return;
  }
  state.startFlow = { tableId: null, partySize: null, showAllTables: false };
  renderStartTablePicker();
}

function renderStartTablePicker(message = "") {
  const allTables = state.layoutConfig.objects.filter((object) => object.category === "table");
  const assignedIds = getProfileAssignedTableIds();
  const tables = state.startFlow.showAllTables || !assignedIds.length ? allTables : allTables.filter((table) => assignedIds.includes(table.id));
  const readyCount = tables.filter((table) => isTableReadyForStart(table.id)).length;
  showModal(`
    <div class="flow-header">
      <button id="startFlowBackButton" type="button">Back</button>
      <div><h3>${state.startFlow.showAllTables ? "All Ready Tables" : "My Ready Tables"}</h3><p>Step 1 of 2 - ${readyCount} ready</p></div>
      <button id="startFlowCancelButton" type="button">Cancel</button>
    </div>
    <div class="button-row">
      <button class="${!state.startFlow.showAllTables ? "primary" : ""}" id="showMyTablesButton" type="button">My Section</button>
      <button class="${state.startFlow.showAllTables ? "primary" : ""}" id="showAllTablesButton" type="button">Show All Tables</button>
    </div>
    ${message ? `<div class="recovery-banner">${escapeHtml(message)}</div>` : ""}
    ${!tables.length ? `<div class="settings-card">No tables are assigned to your section yet. Go to Profile > My Table Section or use Show All Tables.</div>` : ""}
    <div class="floor-picker-grid">
      ${tables.map((table) => {
        const tableState = getTableState(table.id);
        const ready = isTableReadyForStart(table.id);
        return `<button class="floor-picker-tile status-${cssStatus(tableState.status)} ${ready ? "" : "disabled-tile"}" data-start-pick-table="${table.id}" type="button">
          <strong>${escapeHtml(table.name)}</strong>
          <span>${escapeHtml(ready ? "Ready" : tableState.status)}</span>
          <small>${tableState.partySize || 0}/${table.seats} guests</small>
        </button>`;
      }).join("")}
    </div>
  `);
  document.getElementById("startFlowBackButton").addEventListener("click", closeModal);
  document.getElementById("startFlowCancelButton").addEventListener("click", closeModal);
  document.getElementById("showMyTablesButton").addEventListener("click", () => { state.startFlow.showAllTables = false; renderStartTablePicker(); });
  document.getElementById("showAllTablesButton").addEventListener("click", () => { state.startFlow.showAllTables = true; renderStartTablePicker(); });
  document.querySelectorAll("[data-start-pick-table]").forEach((button) => button.addEventListener("click", () => {
    const tableId = button.dataset.startPickTable;
    if (!isTableReadyForStart(tableId)) {
      renderActiveTableChoice(tableId);
      return;
    }
    requireClockedIn(() => {
      state.startFlow.tableId = tableId;
      renderPartySizePicker();
    });
  }));
}

function renderActiveTableChoice(tableId) {
  const table = getTable(tableId);
  showModal(`
    <h3>${escapeHtml(table.name)} is already active.</h3>
    <p>Open table instead?</p>
    <div class="modal-actions">
      <button id="activeCancelButton" type="button">Cancel</button>
      <button class="primary" id="activeOpenButton" type="button">Open Table</button>
    </div>
  `);
  document.getElementById("activeCancelButton").addEventListener("click", () => renderStartTablePicker());
  document.getElementById("activeOpenButton").addEventListener("click", () => { closeModal(); openTableDashboard(tableId); });
}

function renderPartySizePicker() {
  const table = getTable(state.startFlow.tableId);
  const partySize = state.startFlow.partySize || table.seats || 2;
  showModal(`
    <div class="flow-header">
      <button id="partyBackButton" type="button">Back to Table Selection</button>
      <div><h3>${escapeHtml(table.name)} Party Size</h3><p>Step 2 of 2 - Default seats: ${table.seats}</p></div>
      <button id="partyCancelButton" type="button">Cancel</button>
    </div>
    ${partySize > table.seats ? `<div class="recovery-banner">Extra seats may be needed.</div>` : ""}
    <div class="party-size-grid">
      ${Array.from({ length: 10 }, (_, index) => index + 1).map((size) => `<button class="${partySize === size ? "active" : ""}" data-party-size="${size}" type="button">${size}</button>`).join("")}
      <button data-party-custom type="button">Custom</button>
    </div>
    <div class="modal-actions">
      <button id="partyBackButton2" type="button">Back</button>
      <button class="primary" id="startPickedTableButton" type="button">Start Table</button>
    </div>
  `);
  document.querySelectorAll("[data-party-size]").forEach((button) => button.addEventListener("click", () => { state.startFlow.partySize = Number(button.dataset.partySize); renderPartySizePicker(); }));
  document.querySelector("[data-party-custom]").addEventListener("click", () => showNumberInput("Custom party size", partySize, (value) => { state.startFlow.partySize = value; renderPartySizePicker(); }));
  document.getElementById("partyBackButton").addEventListener("click", () => renderStartTablePicker());
  document.getElementById("partyBackButton2").addEventListener("click", () => renderStartTablePicker());
  document.getElementById("partyCancelButton").addEventListener("click", closeModal);
  document.getElementById("startPickedTableButton").addEventListener("click", startPickedTable);
}

function startPickedTable() {
  const tableId = state.startFlow.tableId;
  const partySize = Number(state.startFlow.partySize || getTable(tableId).seats || 1);
  closeModal();
  seatParty(tableId, partySize, { goToDashboard: true });
}

function isTableReadyForStart(tableId) {
  const tableState = getTableState(tableId);
  return !tableState.partySize && !tableState.orders.length && !tableState.posQueue.length && ["Open", "Reset", "Ready"].includes(tableState.status);
}

function copyText(text) { navigator.clipboard?.writeText(text).then(() => toast("Copied.")) || toast("Copy is not available in this browser."); }
function downloadJson(filename, value) { downloadText(filename, JSON.stringify(value, null, 2), "application/json"); }
function downloadText(filename, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
}
function readFileInput(callback) {
  return (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => callback(String(reader.result));
    reader.readAsText(file);
    event.target.value = "";
  };
}
function storageAvailable() {
  try { localStorage.setItem("tableflow.test", "1"); localStorage.removeItem("tableflow.test"); return true; } catch { return false; }
}
function showRecovery(message) {
  els.recoveryBanner.textContent = message;
  els.recoveryBanner.classList.remove("hidden");
}
function clearAllLocalData() {
  Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
  window.location.reload();
}
function getInitials(name) {
  return String(name || "TF").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function upsertById(list, item) {
  const index = list.findIndex((entry) => entry.id === item.id);
  if (index >= 0) return list.map((entry) => entry.id === item.id ? { ...entry, ...item } : entry);
  return [...list, item];
}

function formatPrice(price) {
  const value = Number(price);
  return Number.isFinite(value) && value > 0 ? `$${value.toFixed(2)}` : "";
}

// CSV and analytics helpers
function csvHeader() { return "id,posKey,name,shortName,category,subcategory,price,modifiers,requiresPrepStation,prepCapability,prepStationId,canBeTableShare,active,sortOrder\n"; }
function menuToCsv(items) {
  return csvHeader() + items.map((item) => [item.id, item.posKey, item.name, item.shortName, item.category, item.subcategory, item.price ?? "", item.modifiers.join("|"), item.requiresPrepStation, item.prepCapability, item.prepStationId, item.canBeTableShare, item.active, item.sortOrder].map(csvCell).join(",")).join("\n");
}
function csvCell(value) { return `"${String(value ?? "").replaceAll('"', '""')}"`; }
function csvToMenu(text) {
  const lines = text.trim().split(/\r?\n/);
  const header = parseCsvLine(lines.shift() || "");
  const required = csvHeader().trim().split(",");
  const errors = [];
  if (!required.every((col) => header.includes(col))) return { items: [], errors: ["Missing required columns"] };
  const items = lines.map((line, index) => {
    const cols = parseCsvLine(line);
    const row = Object.fromEntries(header.map((name, i) => [name, cols[i] || ""]));
    if (!row.id || !row.name || !POS_CATEGORIES.includes(row.category)) {
      errors.push(`Row ${index + 2} skipped`);
      return null;
    }
    return normalizeMenuConfig({ items: [{ ...row, modifiers: row.modifiers.split("|").filter(Boolean), canBeTableShare: row.canBeTableShare === "true", requiresPrepStation: row.requiresPrepStation === "true", active: row.active !== "false", sortOrder: Number(row.sortOrder) || index + 1 }] }).items[0];
  }).filter(Boolean);
  return { items, errors };
}
function parseCsvLine(line) {
  const cells = [];
  let current = "", quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"' && line[i + 1] === '"') { current += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { cells.push(current); current = ""; }
    else current += char;
  }
  cells.push(current);
  return cells;
}
function sideWorkCsvHeader() { return "id,title,description,stationId,stationName,role,timingType,timingOffsetMinutes,dueWindowMinutes,priority,repeat,estimatedMinutes,required,category,active\n"; }
function sideWorkToCsv(tasks) {
  return sideWorkCsvHeader() + tasks.map((task) => [task.id, task.title, task.description, task.stationId, task.stationName, task.role, task.timingType, task.timingOffsetMinutes, task.dueWindowMinutes, task.priority, task.repeat, task.estimatedMinutes, task.required, task.category, task.active].map(csvCell).join(",")).join("\n");
}
function csvToSideWork(text) {
  const lines = text.trim().split(/\r?\n/);
  const header = parseCsvLine(lines.shift() || "");
  const required = sideWorkCsvHeader().trim().split(",");
  const errors = [];
  if (!required.every((col) => header.includes(col))) return { tasks: [], errors: ["Missing required columns"] };
  const tasks = lines.map((line, index) => {
    const cols = parseCsvLine(line);
    const row = Object.fromEntries(header.map((name, i) => [name, cols[i] || ""]));
    const task = normalizeSideWorkTemplate({
      ...row,
      timingOffsetMinutes: Number(row.timingOffsetMinutes) || 0,
      dueWindowMinutes: Number(row.dueWindowMinutes) || 30,
      estimatedMinutes: Number(row.estimatedMinutes) || 5,
      required: row.required !== "false",
      active: row.active !== "false"
    });
    if (!task) errors.push(`Row ${index + 2} skipped`);
    return task;
  }).filter(Boolean);
  return { tasks, errors };
}
function importSideWorkJson(text) {
  try {
    const parsed = JSON.parse(text);
    state.currentShift.sideWork = normalizeSideWork(parsed, createDefaults().currentShift.sideWork);
    ensureSideWorkInstances(state.currentShift.sideWork, getWorkSchedule());
    markDirty();
    renderAll();
    toast("Side work JSON imported.");
  } catch {
    toast("Side work JSON import failed.", "danger");
  }
}
function importSideWorkCsv(text) {
  const result = csvToSideWork(text);
  if (result.tasks.length) {
    state.currentShift.sideWork.taskTemplates = result.tasks;
    state.currentShift.sideWork.taskInstances = [];
    ensureSideWorkInstances(state.currentShift.sideWork, getWorkSchedule());
    markDirty();
    renderAll();
  }
  toast(`Imported ${result.tasks.length} side work rows. ${result.errors.length ? `${result.errors.length} rows skipped.` : ""}`, result.errors.length ? "danger" : "ok");
}
function addMenuEditorItem() {
  const editingId = els.menuEditingIdInput.value;
  const item = normalizeMenuConfig({ items: [{
    id: editingId || makeId("menu"),
    posKey: els.menuPosKeyInput.value.trim() || "NEW ITEM",
    name: els.menuNameInput.value.trim() || "New Item",
    shortName: els.menuShortNameInput.value.trim() || els.menuNameInput.value.trim() || "Item",
    category: els.menuCategoryInput.value,
    subcategory: els.menuSubcategoryInput.value.trim(),
    price: els.menuPriceInput.value ? Number(els.menuPriceInput.value) : null,
    requiresSeat: true,
    canBeTableShare: false,
    requiresPrepStation: els.menuPrepRequiredInput.checked || Boolean(els.menuPrepCapabilityInput.value.trim()),
    prepCapability: els.menuPrepCapabilityInput.value.trim(),
    prepStationId: els.menuPrepStationInput.value.trim(),
    modifiers: els.menuModifiersInput.value.split("|").map((m) => m.trim()).filter(Boolean),
    active: true,
    sortOrder: state.menuConfig.items.find((existing) => existing.id === editingId)?.sortOrder || state.menuConfig.items.length + 1
  }] }).items[0];
  if (editingId) {
    state.menuConfig.items = state.menuConfig.items.map((existing) => existing.id === editingId ? { ...existing, ...item, updatedAt: Date.now() } : existing);
    logEvent("menu_item_updated", null, null, item.id, {});
  } else {
    state.menuConfig.items.push(item);
    logEvent("menu_item_added", null, null, item.id, {});
  }
  clearMenuForm();
  markDirty();
  renderAll();
}

function loadMenuItemIntoForm(itemId) {
  const item = getMenuItem(itemId);
  if (!item) return;
  els.menuEditingIdInput.value = item.id;
  els.menuPosKeyInput.value = item.posKey || "";
  els.menuNameInput.value = item.name || "";
  els.menuShortNameInput.value = item.shortName || "";
  els.menuCategoryInput.value = item.category || "ENTREE";
  els.menuSubcategoryInput.value = item.subcategory || "";
  els.menuPriceInput.value = item.price ?? "";
  els.menuPrepCapabilityInput.value = item.prepCapability || "";
  els.menuPrepStationInput.value = item.prepStationId || "";
  if (els.menuTableShareInput) els.menuTableShareInput.checked = false;
  els.menuPrepRequiredInput.checked = Boolean(item.requiresPrepStation);
  els.menuModifiersInput.value = (item.modifiers || []).join("|");
}

function clearMenuForm() {
  ["menuEditingIdInput", "menuPosKeyInput", "menuNameInput", "menuShortNameInput", "menuSubcategoryInput", "menuPriceInput", "menuPrepCapabilityInput", "menuPrepStationInput", "menuModifiersInput"].forEach((id) => { if (els[id]) els[id].value = ""; });
  if (els.menuTableShareInput) els.menuTableShareInput.checked = false;
  if (els.menuPrepRequiredInput) els.menuPrepRequiredInput.checked = false;
}
function eventsToCsv(events) {
  return "id,type,tableId,seatNumber,itemId,timestamp,metadata\n" + events.map((event) => [event.id, event.type, event.tableId || "", event.seatNumber || "", event.itemId || "", new Date(event.timestamp).toISOString(), JSON.stringify(event.metadata || {})].map(csvCell).join(",")).join("\n");
}
function estimateAverageTurn(events) {
  return estimateStageTime(events, "table_seated", "table_reset", "paid");
}
function estimateStageTime(events, fromType, toType, fallbackToType = null) {
  const byTable = groupBy(events.filter((event) => event.tableId), "tableId");
  const minutes = Object.values(byTable).map((tableEvents) => {
    const ordered = tableEvents.slice().sort((a, b) => a.timestamp - b.timestamp);
    const start = ordered.find((event) => event.type === fromType);
    const end = ordered.find((event) => event.type === toType) || (fallbackToType ? ordered.find((event) => event.type === fallbackToType) : null);
    return start && end && end.timestamp >= start.timestamp ? Math.round((end.timestamp - start.timestamp) / 60000) : null;
  }).filter((value) => value !== null);
  if (!minutes.length) return "0m";
  return `${Math.round(minutes.reduce((sum, value) => sum + value, 0) / minutes.length)}m`;
}
function getLongestActiveTable() {
  const active = getActiveTables();
  if (!active.length) return "None";
  return active.map((table) => ({ table, seated: getTableState(table.id).timestamps.seated || Date.now() })).sort((a, b) => a.seated - b.seated)[0].table.name;
}
function addDemoTable() {
  const id = makeId("table");
  const table = obj(id, "New Table", "table", 140, 140, 96, 96, "square-table", 4, "server-1");
  state.layoutConfig.objects.push(table);
  state.currentShift.tables[id] = defaultTableState(table);
  markDirty(); renderAll();
}
function addDemoStation() {
  state.layoutConfig.objects.push(obj(makeId("station"), "Prep Station", "station", 360, 360, 140, 72, "prep-station", 0, null, "dessert-station", ["prep"]));
  markDirty(); renderAll();
}
if ("serviceWorker" in navigator && ["http:", "https:"].includes(window.location.protocol)) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js")
      .then(() => console.log("Service Worker Registered"))
      .catch(() => {});
  });
}
