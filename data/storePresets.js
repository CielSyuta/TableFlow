// Store Presets - Add your restaurant configurations here
const STORE_PRESETS = {
  holyoke: {
    restaurantName: "Denny's | Holyoke",
    storeNumber: "",
    theme: {
      restaurantName: "Denny's | Holyoke",
      appDisplayName: "TableFlow",
      primaryColor: "#d71920",
      secondaryColor: "#f9c80e",
      accentColor: "#ff7a18",
      backgroundColor: "#160d0b",
      cardColor: "#351c16",
      buttonStyle: "rounded",
      useLogoOnGuestCheck: true,
      useLogoOnLogin: true,
      preset: "dennys"
    },
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
      pinEnabled: true,
      pinRequireOpen: true,
      pinRequireAdmin: true,
      branding: {
        restaurantName: "Denny's | Holyoke",
        appDisplayName: "TableFlow",
        primaryColor: "#d71920",
        secondaryColor: "#f9c80e",
        accentColor: "#ff7a18",
        backgroundColor: "#160d0b",
        cardColor: "#351c16",
        buttonStyle: "rounded",
        useLogoOnGuestCheck: true,
        useLogoOnLogin: true,
        preset: "dennys"
      },
      sideWork: {
        remindersEnabled: true,
        chimeEnabled: true,
        reminderStyle: "manager",
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
      },
      serviceWorkflow: {
        quickDrinkDelivery: true,
        skipDrinkDeliveryConfirm: true,
        orderReminderAfterDrinks: true,
        orderReminderAfterDrinksMinutes: 4
      },
      developer: {
        enabled: false,
        showTesterToggle: false,
        debugLogs: true,
        preview: "full"
      },
      navigation: {
        compact: false
      }
    },
    // Add your layouts array from the JSON
    layouts: [
      {
        restaurantName: "TableFlow Demo",
        objects: [
          // Copy your tables and stations from the tableflow-all-data JSON
        ]
      }
    ]
  }
};
