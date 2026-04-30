// Diner-style demo menu. Replace with your store's real POS keys.
// This is not an official menu for any restaurant brand.

(function () {
  const categories = [
    "FAVORITES", "VALUE MEALS", "STARTER", "BEV", "APPT", "SIDES", "SOUP/SAL", "ENTREE", "BREAKFAST", "SLAMS",
    "OMELETTES", "SKILLETS", "PANCAKES", "BURGERS", "SANDWICHES", "DINNERS",
    "VEG/POT", "DESSERT", "KIDS", "MODS"
  ];

  const items = [];

  function add(id, posKey, name, shortName, category, subcategory, sortOrder, modifiers = [], options = {}) {
    items.push({
      id,
      restaurantId: "demo-restaurant",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: "system",
      posKey,
      name,
      shortName,
      category,
      subcategory,
      price: options.price ?? null,
      modifiers,
      requiresPrepStation: Boolean(options.requiresPrepStation),
      prepCapability: options.prepCapability || "",
      prepStationId: options.prepStationId || "",
      canBeTableShare: false,
      active: options.active !== false,
      orderable: category !== "MODS",
      sortOrder
    });
  }

  const drinkMods = ["No Ice", "Light Ice", "Extra Ice", "Lemon", "No Lemon"];
  const eggMods = ["Over Easy", "Over Medium", "Over Hard", "Scrambled", "Sunny Side Up", "Egg Whites"];
  const sideMods = ["Hash Browns", "Toast", "Pancakes", "Fruit", "Fries", "Broccoli"];
  const burgerMods = ["No Onion", "No Pickle", "No Tomato", "No Cheese", "Add Cheese", "Add Bacon", "Fries"];
  const shakeMods = ["No whip", "Extra whip", "Cherry", "No cherry"];
  const sauceMods = ["Ranch", "BBQ", "Honey mustard", "Buffalo", "Marinara", "Sauce side"];

  [
    ["coffee", "COFFEE", "Coffee", "Coffee", "Hot Drinks", ["Cream", "Sugar", "Decaf"]],
    ["decaf-coffee", "DECAF", "Decaf Coffee", "Decaf", "Hot Drinks", ["Cream", "Sugar"]],
    ["hot-tea", "HOT TEA", "Hot Tea", "Hot Tea", "Hot Drinks", ["Lemon", "Honey"]],
    ["hot-chocolate", "HOT CHOC", "Hot Chocolate", "Hot Choc", "Hot Drinks", ["No whip", "Extra whip"]],
    ["coke", "COKE", "Coke", "Coke", "Soft Drinks", drinkMods],
    ["diet-coke", "DIET COKE", "Diet Coke", "Diet Coke", "Soft Drinks", drinkMods],
    ["sprite", "SPRITE", "Sprite", "Sprite", "Soft Drinks", drinkMods],
    ["dr-pepper", "DR PEPPER", "Dr Pepper", "Dr Pepper", "Soft Drinks", drinkMods],
    ["root-beer", "ROOT BEER", "Root Beer", "Root Beer", "Soft Drinks", drinkMods],
    ["lemonade", "LEMONADE", "Lemonade", "Lemonade", "Soft Drinks", drinkMods],
    ["iced-tea", "ICED TEA", "Iced Tea", "Iced Tea", "Tea", ["Sweet", "Unsweet", "Lemon", "No Ice"]],
    ["water", "WATER", "Water", "Water", "Water", drinkMods],
    ["no-drink", "NO DRINK", "No Drink", "No Drink", "Water", []],
    ["orange-juice", "OJ", "Orange Juice", "OJ", "Juice", ["Small", "Large", "No Ice"]],
    ["apple-juice", "APPLE JUICE", "Apple Juice", "Apple Juice", "Juice", ["Small", "Large", "No Ice"]],
    ["milk", "MILK", "Milk", "Milk", "Milk", ["White", "Chocolate", "Small", "Large"]],
    ["vanilla-ms", "VANILLA MS", "Vanilla Milkshake", "Vanilla MS", "Milkshakes", shakeMods],
    ["chocolate-ms", "CHOC MS", "Chocolate Milkshake", "Choc MS", "Milkshakes", shakeMods],
    ["strawberry-ms", "STRAW MS", "Strawberry Milkshake", "Straw MS", "Milkshakes", shakeMods]
  ].forEach((row, index) => add(row[0], row[1], row[2], row[3], "BEV", row[4], index + 1, row[5], row[4] === "Milkshakes" ? { requiresPrepStation: true, prepCapability: "milkshakes", prepStationId: "dessert-station" } : {}));

  [
    "Mozzarella Sticks", "Loaded Tots", "Boneless Wings", "Sampler Plate", "Seasoned Fries",
    "Onion Rings", "Cheese Quesadilla", "Chicken Tender App", "Nachos", "Fried Pickles",
    "Side Salad", "Soup Cup"
  ].forEach((name, index) => add(`appt-${index + 1}`, name.toUpperCase().slice(0, 16), name, name.replace("Mozzarella", "Mozz").slice(0, 16), index < 10 ? "APPT" : "STARTER", "Starters", 100 + index, sauceMods, { requiresPrepStation: true, prepCapability: "sauces", prepStationId: "sauce-station" }));

  [
    "Classic Two Egg Breakfast", "Build Your Own Breakfast", "Country Breakfast", "Steak and Eggs",
    "French Toast Breakfast", "Fit Breakfast Plate", "Breakfast Sandwich", "Biscuits and Gravy",
    "Breakfast Burrito", "Corned Beef Hash", "Sausage Gravy Bowl", "Ham and Eggs",
    "Bacon and Eggs", "Turkey Bacon Breakfast", "Value Breakfast Plate", "Breakfast Skillet"
  ].forEach((name, index) => add(`breakfast-${index + 1}`, `BRKFST ${index + 1}`, name, name.slice(0, 18), "BREAKFAST", "Breakfast Plates", 200 + index, [...eggMods, ...sideMods]));

  [
    "Buttermilk Pancakes", "Berry Banana Pancakes", "Cinnamon Roll Pancakes", "Chocolate Chip Pancakes",
    "Strawberry Pancakes", "French Toast Stack", "Stuffed French Toast", "Waffle Breakfast",
    "Berry Waffle", "Banana Nut Pancakes", "Silver Dollar Pancakes", "Pancake Combo"
  ].forEach((name, index) => add(`pancake-${index + 1}`, `PAN ${index + 1}`, name, name.slice(0, 18), "PANCAKES", "Pancakes and Waffles", 300 + index, ["No butter", "Extra syrup", "Sugar-free syrup", "No topping", "Extra topping", ...eggMods]));

  [
    "Ultimate Omelette", "Veggie Omelette", "Ham and Cheese Omelette", "Cheesesteak Omelette",
    "Build Your Own Omelette", "Southwest Omelette", "Mushroom Swiss Omelette", "Bacon Avocado Omelette",
    "Meat Lover Skillet", "Veggie Skillet", "Country Skillet", "Loaded Potato Skillet"
  ].forEach((name, index) => add(`omelette-${index + 1}`, `OML ${index + 1}`, name, name.slice(0, 18), "OMELETTES", index > 7 ? "Skillets" : "Omelettes", 400 + index, ["No cheese", "No onions", "No peppers", "No mushrooms", "Hash Browns", "Toast", ...eggMods]));

  [
    "Classic Cheeseburger", "Double Cheeseburger", "Bacon Avocado Burger", "Spicy Pepper Burger",
    "Patty Melt", "Turkey Club", "Chicken Sandwich", "Grilled Cheese", "BLT Sandwich",
    "Melted Chicken Sandwich", "Breakfast Burger", "Veggie Burger"
  ].forEach((name, index) => add(`sandwich-${index + 1}`, `SAND ${index + 1}`, name, name.slice(0, 18), index < 5 || index === 10 || index === 11 ? "BURGERS" : "SANDWICHES", "Burgers and Sandwiches", 500 + index, burgerMods));

  [
    "Chicken Tenders Dinner", "Country Fried Steak", "Sirloin Steak Dinner", "T-Bone Steak Dinner",
    "Grilled Salmon", "Fried Fish Dinner", "Chicken Fried Chicken", "Pot Roast Plate",
    "Turkey Dinner", "Meatloaf Plate", "Pasta Bowl", "Grilled Chicken Dinner"
  ].forEach((name, index) => add(`dinner-${index + 1}`, `DIN ${index + 1}`, name, name.slice(0, 18), index < 4 ? "ENTREE" : "DINNERS", "Dinner Plates", 600 + index, ["Gravy side", "No gravy", "Rare", "Medium", "Well done", ...sideMods], index === 0 ? { requiresPrepStation: true, prepCapability: "sauces", prepStationId: "sauce-station" } : {}));

  [
    "Fries", "Seasoned Fries", "Hash Browns", "Mashed Potatoes", "Red Potatoes", "Broccoli",
    "Seasonal Fruit", "Toast", "English Muffin", "Biscuit", "Bacon", "Sausage Links", "Ham", "Eggs"
  ].forEach((name, index) => add(`side-${index + 1}`, name.toUpperCase().slice(0, 16), name, name.slice(0, 18), index >= 2 && index <= 5 ? "VEG/POT" : "SIDES", "Sides", 700 + index, index === 13 ? eggMods : ["Crispy", "No salt", "Butter", "Dry"]));

  [
    "Cheesecake", "Brownie Sundae", "Cookie Pie", "Ice Cream Scoop", "Chocolate Cake",
    "Apple Pie", "Strawberry Shortcake", "Dessert Sampler", "Kids Sundae"
  ].forEach((name, index) => add(`dessert-${index + 1}`, `DES ${index + 1}`, name, name.slice(0, 18), "DESSERT", "Desserts", 800 + index, ["No whip", "Extra chocolate", "Cherry", "No cherry"], { requiresPrepStation: true, prepCapability: "desserts", prepStationId: "dessert-station" }));

  [
    "Kids Pancakes", "Kids French Toast", "Kids Egg Breakfast", "Kids Chicken Tenders",
    "Kids Cheeseburger", "Kids Grilled Cheese", "Kids Mac and Cheese", "Kids Spaghetti",
    "Kids Milk", "Kids Juice", "Kids Sundae"
  ].forEach((name, index) => add(`kids-${index + 1}`, `KIDS ${index + 1}`, name, name.slice(0, 18), "KIDS", "Kids", 900 + index, [...drinkMods, ...sideMods, ...sauceMods]));

  [
    "No Ice", "Light Ice", "Extra Ice", "Lemon", "No Lemon", "No Onion", "No Tomato", "No Pickle",
    "No Cheese", "Add Cheese", "Add Bacon", "Sauce on Side", "Extra Sauce", "No Sauce", "No Whip",
    "Extra Whip", "Cherry", "No Cherry", "No Butter", "Extra Syrup", "Sugar Free Syrup", "Crispy",
    "No Salt", "Ranch", "BBQ", "Honey Mustard", "Buffalo", "Marinara", "Gravy Side", "No Gravy",
    "Rare", "Medium Rare", "Medium", "Medium Well", "Well Done", "Over Easy", "Over Medium",
    "Over Hard", "Scrambled", "Egg Whites"
  ].forEach((name, index) => add(`mod-${index + 1}`, name.toUpperCase().slice(0, 18), name, name, "MODS", "Common Mods", 1000 + index, [], { active: true }));

  const locationMenu = normalizeLocationMenu(window.TableFlowLocationMenuConfig);

  if (locationMenu) {
    categories.splice(0, categories.length, ...mergeCategoryList(locationMenu.categories));
    items.splice(0, items.length, ...locationMenu.items);
    applyDennyMenuEnhancements(items, categories);
    applyStructuredPOSMenu(items, categories);
    window.TableFlowMenuConfig = {
      ...locationMenu,
      version: locationMenu.version || "dennys-7614-public-menu",
      label: `${locationMenu.label || "Public Denny's location menu snapshot."} Only priced location items are shown in service ordering.`,
      categories,
      items
    };
  } else {
    mergeLegacyMenu(window.TableFlowLegacyMenuConfig);
    applyDennyMenuEnhancements(items, categories);
    applyStructuredPOSMenu(items, categories);
    window.TableFlowMenuConfig = {
      version: "demo-menu-v3-combined",
      label: "Combined diner-style demo menu. Replace with your store's real POS keys.",
      categories,
      items
    };
  }

  function normalizeLocationMenu(locationConfig) {
    if (!locationConfig || !Array.isArray(locationConfig.items) || !locationConfig.items.length) return null;
    return {
      ...locationConfig,
      categories: mergeCategoryList(locationConfig.categories),
      items: locationConfig.items.map((item, index) => ({
        restaurantId: "dennys-7614",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: "official-public-menu-import",
        requiresSeat: item.requiresSeat !== false,
        requiresPrepStation: Boolean(item.requiresPrepStation),
        prepCapability: item.prepCapability || "",
        prepStationId: item.prepStationId || prepStationForCapability(item.prepCapability),
        modifiers: Array.isArray(item.modifiers) ? item.modifiers : [],
        active: item.active !== false,
        orderable: item.orderable !== false && item.category !== "MODS",
        ...item,
        canBeTableShare: false,
        category: normalizeLocationCategory(item),
        sortOrder: Number(item.sortOrder) || index + 1
      })).filter((item) => (Number(item.price) > 0 || item.category === "BEV") && item.category !== "MODS")
    };
  }

  function mergeCategoryList(sourceCategories = []) {
    return [...new Set([...categories, ...sourceCategories].filter(Boolean))];
  }

  function mergeLegacyMenu(legacyMenu) {
    if (!legacyMenu || !Array.isArray(legacyMenu.items)) return;
    legacyMenu.categories?.forEach((category) => {
      if (category && !categories.includes(category)) categories.push(category);
    });
    const existingIds = new Set(items.map((entry) => entry.id));
    const existingFingerprints = new Set(items.map((entry) => menuFingerprint(entry)));
    legacyMenu.items.forEach((legacyItem, index) => {
      if (!legacyItem?.id || existingIds.has(legacyItem.id)) return;
      const category = normalizeLegacyCategory(legacyItem);
      const fingerprint = menuFingerprint({ ...legacyItem, category });
      if (existingFingerprints.has(fingerprint)) return;
      if (!categories.includes(category)) categories.push(category);
      items.push({
        restaurantId: "demo-restaurant",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: "legacy-menu",
        requiresSeat: legacyItem.requiresSeat !== false,
        requiresPrepStation: Boolean(legacyItem.requiresPrepStation),
        prepCapability: legacyItem.prepCapability || "",
        prepStationId: legacyItem.prepStationId || prepStationForCapability(legacyItem.prepCapability),
        modifiers: Array.isArray(legacyItem.modifiers) ? legacyItem.modifiers : [],
        active: legacyItem.active !== false,
        orderable: legacyItem.orderable !== false && category !== "MODS",
        ...legacyItem,
        canBeTableShare: false,
        category,
        sortOrder: Number(legacyItem.sortOrder) || 2000 + index
      });
      existingIds.add(legacyItem.id);
      existingFingerprints.add(fingerprint);
    });
  }

  function normalizeLegacyCategory(item) {
    const subcategory = String(item.subcategory || "").toLowerCase();
    const category = String(item.category || "").toUpperCase();
    if (subcategory.includes("dinner")) return "DINNERS";
    if (subcategory.includes("burger")) return "BURGERS";
    if (subcategory.includes("sandwich") || subcategory.includes("melt") || subcategory.includes("handheld")) return "SANDWICHES";
    if (/^skillets?$/.test(subcategory.trim()) || String(item.name || item.shortName || "").toLowerCase().includes("skillet")) return "SKILLETS";
    if (subcategory.includes("omelette")) return "OMELETTES";
    if (subcategory.includes("pancake") || subcategory.includes("waffle") || subcategory.includes("crepe")) return "PANCAKES";
    if (subcategory.includes("slam")) return "SLAMS";
    if (subcategory.includes("breakfast") || subcategory.includes("55+")) return "BREAKFAST";
    return categories.includes(category) ? category : "ENTREE";
  }

  function normalizeLocationCategory(item) {
    const name = String(item.name || item.shortName || "").toLowerCase();
    const subcategory = String(item.subcategory || "").toLowerCase();
    const category = String(item.category || "").toUpperCase();
    if (subcategory.includes("denny's deals") || subcategory.includes("value")) return "VALUE MEALS";
    if (name.includes("skillet") || /^skillets?$/.test(subcategory.trim())) return "SKILLETS";
    return category || "ENTREE";
  }

  function applyStructuredPOSMenu(menuItems, categoryList) {
    const config = window.TableFlowStructuredPOSMenu;
    if (!config?.items?.length) return;
    config.rootCategories?.forEach((category) => {
      if (category && !categoryList.includes(category)) categoryList.unshift(category);
    });
    config.items.forEach((posItem, index) => {
      const modifierLabels = [
        ...(posItem.modifiers || []),
        ...labelsForGroups(posItem.requiredModifierGroups, config),
        ...labelsForGroups(posItem.optionalModifierGroups, config)
      ];
      addStructuredItem(menuItems, {
        id: `pos-${posItem.id}`,
        posKey: posItem.posKey || posItem.name.toUpperCase().slice(0, 20),
        name: posItem.name,
        shortName: posItem.shortName || posItem.name,
        category: posItem.category,
        subcategory: posItem.subcategory,
        price: posItem.price,
        colorTag: posItem.colorTag || "",
        isAvailable: posItem.isAvailable !== false,
        kitchenCategory: posItem.kitchenCategory || posItem.category,
        requiredModifierGroups: posItem.requiredModifierGroups || [],
        optionalModifierGroups: posItem.optionalModifierGroups || [],
        defaultSelections: posItem.defaultSelections || {},
        aliases: posItem.aliases || [],
        modifiers: modifierLabels,
        sortOrder: 5000 + index
      });
    });
  }

  function addStructuredItem(menuItems, item) {
    if (menuItems.some((entry) => entry.id === item.id)) return;
    const fingerprint = `${normalizeWords(item.category)}|${normalizeWords(item.subcategory)}|${normalizeWords(item.name)}`;
    if (menuItems.some((entry) => `${normalizeWords(entry.category)}|${normalizeWords(entry.subcategory)}|${normalizeWords(entry.name)}` === fingerprint)) return;
    menuItems.push({
      restaurantId: "dennys-7614",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: "tableflow-structured-pos",
      requiresSeat: true,
      requiresPrepStation: false,
      prepCapability: "",
      prepStationId: "",
      active: true,
      orderable: true,
      canBeTableShare: false,
      sortOrder: menuItems.length + 1,
      ...item
    });
  }

  function labelsForGroups(groupIds = [], config) {
    return groupIds.flatMap((groupId) => config.modifierGroups?.[groupId]?.options || []);
  }

  function applyDennyMenuEnhancements(menuItems, categoryList) {
    ["FAVORITES", "VALUE MEALS", "SKILLETS", "BEV"].forEach((category) => {
      if (!categoryList.includes(category)) categoryList.unshift(category);
    });
    addEnhancedItem(menuItems, {
      id: "dennys-local-tap-water",
      posKey: "TAP WATER",
      name: "Tap Water",
      shortName: "Tap Water",
      category: "BEV",
      subcategory: "Water",
      price: 0,
      modifiers: ["No Ice", "Light Ice", "Extra Ice", "Lemon", "No Lemon"]
    });
    addEnhancedItem(menuItems, {
      id: "dennys-local-hi-c-fruit-punch",
      posKey: "HI-C FRUIT PUNCH",
      name: "Hi-C Fruit Punch",
      shortName: "Hi-C",
      category: "BEV",
      subcategory: "Soft Drinks",
      price: 3.49,
      modifiers: ["No Ice", "Light Ice", "Extra Ice", "Lemon", "No Lemon"]
    });
    [
      ["dennys-local-mozzarella-sticks-app", "MOZZ STICKS", "Mozzarella Sticks", "Mozz Sticks", 8.99, ["Marinara Sauce", "Ranch", "No Sauce"]],
      ["dennys-local-boneless-wings-app", "BONELESS WINGS", "Boneless Wings", "Boneless Wings", 11.99, ["8ct Wings", "16ct Wings", "BBQ Sauce", "Buffalo Sauce", "Honey Mustard", "Ranch", "Blue Cheese", "No Sauce"]],
      ["dennys-local-premium-chicken-tenders-app", "TENDERS APP", "Premium Chicken Tenders Appetizer", "Tenders App", 10.99, ["BBQ Sauce", "Buffalo Sauce", "Honey Mustard", "Ranch", "Blue Cheese", "No Sauce"]],
      ["dennys-local-classic-sampler-app", "SAMPLER", "Classic Sampler", "Sampler", 13.99, ["Marinara Sauce", "Ranch", "BBQ Sauce", "Honey Mustard", "No Sauce"]],
      ["dennys-local-onion-rings-app", "ONION RINGS APP", "Beer-Battered Onion Rings Appetizer", "Onion Rings App", 7.99, ["Ranch", "BBQ Sauce", "No Sauce"]]
    ].forEach(([id, posKey, name, shortName, price, modifiers], index) => addEnhancedItem(menuItems, {
      id,
      posKey,
      name,
      shortName,
      category: "APPT",
      subcategory: "Starters",
      price,
      modifiers,
      requiresPrepStation: true,
      prepCapability: "sauces",
      prepStationId: "sauce-station",
      sortOrder: 2500 + index
    }));
    [
      ["dennys-local-braised-beef-skillet", "BRAISED BEEF SKIL", "Braised Beef Skillet", "Braised Beef Skil", 15.99, ["Scrambled", "Sunny Side Up", "Over Easy", "Over Medium", "Over Hard", "No Eggs", "Extra Fire-Roasted Bell Peppers and Onions", "Add Mushrooms", "White Toast", "English Muffin", "7-Grain Toast"]],
      ["dennys-local-cali-taco-skillet", "CALI TACO SKIL", "Cali Taco Skillet", "Cali Taco Skil", 14.99, ["Scrambled", "Sunny Side Up", "Over Easy", "Over Medium", "Over Hard", "No Eggs", "Add Avocado", "Extra Pico", "Extra Queso", "Flour Tortillas (2)"]],
      ["dennys-local-hearty-breakfast-skillet", "HEARTY SKILLET", "Hearty Breakfast Skillet", "Hearty Skillet", 14.49, ["Scrambled", "Sunny Side Up", "Over Easy", "Over Medium", "Over Hard", "No Eggs", "Add Sausage", "Add Bacon Strips", "White Toast", "English Muffin", "7-Grain Toast"]],
      ["dennys-local-ultimate-skillet", "ULTIMATE SKILLET", "Ultimate Skillet", "Ultimate Skillet", 15.49, ["Scrambled", "Sunny Side Up", "Over Easy", "Over Medium", "Over Hard", "No Eggs", "Add Mushrooms", "Extra Cheddar Cheese", "White Toast", "English Muffin", "7-Grain Toast"]],
      ["dennys-local-meat-lovers-skillet", "MEAT LOVERS SKIL", "Meat Lover's Skillet", "Meat Lovers Skil", 15.49, ["Scrambled", "Sunny Side Up", "Over Easy", "Over Medium", "Over Hard", "No Eggs", "Bacon Strips (2)", "Sausage Links (2)", "Ham", "White Toast", "English Muffin", "7-Grain Toast"]],
      ["dennys-local-bourbon-chicken-sizzlin-skillet", "BOURBON CHIX SKIL", "Bourbon Chicken Sizzlin' Skillet", "Bourbon Chix Skil", 15.99, ["Add Flour Tortillas (2)", "No Bourbon Glaze", "Bourbon Glaze on Side", "Extra Fire-Roasted Bell Peppers and Onions", "Add Mushrooms", "Broccoli", "Seasoned Red-Skinned Potatoes"]],
      ["dennys-local-crazy-spicy-sizzlin-skillet", "CRAZY SPICY SKIL", "Crazy Spicy Sizzlin' Skillet", "Crazy Spicy Skil", 15.99, ["Scrambled", "Sunny Side Up", "Over Easy", "Over Medium", "Over Hard", "No Eggs", "No Jalapenos", "Extra Jalapenos", "No 5-Pepper Sauce", "5-Pepper Sauce on Side", "No Queso", "Add Flour Tortillas (2)"]]
    ].forEach(([id, posKey, name, shortName, price, modifiers], index) => addEnhancedItem(menuItems, {
      id,
      posKey,
      name,
      shortName,
      category: "SKILLETS",
      subcategory: "Breakfast Skillets",
      price,
      modifiers,
      sortOrder: 3000 + index
    }));
    enhanceBreakfastChoices(menuItems);
    addFavoriteCopies(menuItems);
  }

  function enhanceBreakfastChoices(menuItems) {
    const breakfastCategories = new Set(["BREAKFAST", "SLAMS", "PANCAKES", "OMELETTES", "SKILLETS", "VALUE MEALS"]);
    menuItems.forEach((item) => {
      if (!breakfastCategories.has(String(item.category || "").toUpperCase())) return;
      const name = String(item.name || "").toLowerCase();
      const additions = [
        "2 Eggs",
        "Scrambled",
        "Scrambled with cheese",
        "Egg Whites",
        "Sunny Side Up",
        "Over Easy",
        "Over Medium",
        "Over Hard",
        "No Eggs",
        "Hash Browns",
        "Hash Browns with Cheese",
        "Seasoned Red-Skinned Potatoes",
        "Red Rustic Mashed Potatoes",
        "Fresh Seasonal Fruit",
        "No Side",
        "2 Bacon Strips + 2 Sausage Links",
        "4 Bacon Strips",
        "4 Sausage Links",
        "Turkey Bacon Strips (2)",
        "Ham",
        "No Meat",
        "No Ham",
        "Sub Ham for Bacon",
        "Add Bacon Strips"
      ];
      if (name.includes("lumberjack")) additions.push("Keep Ham", "No Ham", "Sub Ham for 2 Bacon Strips", "Sub Ham for 2 Sausage Links", "Extra Ham");
      item.modifiers = uniqueModifiers([...(item.modifiers || []), ...additions]);
    });
  }

  function uniqueModifiers(list) {
    return [...new Set(list.map((value) => String(value || "").trim()).filter(Boolean))];
  }

  function addEnhancedItem(menuItems, item) {
    if (menuItems.some((entry) => entry.id === item.id || normalizeWords(entry.name) === normalizeWords(item.name))) return;
    menuItems.push({
      restaurantId: "dennys-7614",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: "tableflow-menu-enhancement",
      requiresSeat: true,
      requiresPrepStation: false,
      prepCapability: "",
      prepStationId: "",
      active: true,
      orderable: true,
      canBeTableShare: false,
      sortOrder: menuItems.length + 1,
      ...item
    });
  }

  function addFavoriteCopies(menuItems) {
    const favoriteNames = [
      "Original Grand Slam", "Build Your Own Grand Slam", "Lumberjack Slam", "All-American Slam",
      "Super Slam", "Grand Slamwich", "Moons Over My Hammy", "Santa Fe Skillet", "Slamburger",
      "Premium Chicken Tenders Dinner", "Classic Burger with Fries"
    ];
    favoriteNames.forEach((name, index) => {
      const source = menuItems.find((item) => normalizeWords(item.name).includes(normalizeWords(name)));
      if (!source || menuItems.some((item) => item.id === `${source.id}-favorite`)) return;
      menuItems.push({
        ...source,
        id: `${source.id}-favorite`,
        category: "FAVORITES",
        subcategory: "Popular Dishes - MA / US",
        createdBy: "tableflow-favorites",
        sortOrder: 100 + index
      });
    });
  }

  function prepStationForCapability(capability) {
    if (capability === "milkshakes" || capability === "desserts") return "dessert-station";
    if (capability === "sauces") return "sauce-station";
    return "";
  }

  function menuFingerprint(item) {
    return [
      normalizeWords(item.category || ""),
      normalizeWords(item.name || item.shortName || "")
    ].join("|");
  }

  function normalizeWords(value) {
    return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "");
  }
})();
