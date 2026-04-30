// TableFlow structured Denny's-style POS menu.
// This is the smart ordering layer: root categories, subcategories, required groups, and optional groups.
(function () {
  const group = (id, name, type, options, required = false) => ({ id, name, type, options, required });
  const item = (id, name, category, subcategory, requiredModifierGroups = [], optionalModifierGroups = [], aliases = [], extra = {}) => ({
    id,
    name,
    shortName: extra.shortName || name,
    posKey: extra.posKey || name.toUpperCase().slice(0, 20),
    category,
    subcategory,
    price: extra.price ?? null,
    colorTag: extra.colorTag || "",
    isAvailable: extra.isAvailable !== false,
    kitchenCategory: extra.kitchenCategory || category,
    requiredModifierGroups,
    optionalModifierGroups,
    aliases,
    modifiers: extra.modifiers || []
  });

  window.TableFlowStructuredPOSMenu = {
    version: "dennys-pos-structured-v1",
    rootCategories: [
      "Breakfast",
      "Lunch / Dinner",
      "Appetizers",
      "Desserts",
      "A La Carte",
      "Beverages",
      "Jr Menu",
      "LTO / Seasonal",
      "Family Packs",
      "Specials / Value",
      "Bar"
    ],
    modifierGroups: {
      "egg-style": group("egg-style", "Egg Style", "single", ["2 Eggs", "Scrambled", "Scrambled with Cheese", "Egg Whites", "Sunny Side Up", "Over Easy", "Over Medium", "Over Hard", "No Eggs"], true),
      "toast-choice": group("toast-choice", "Toast / Bread Choice", "single", ["White", "Wheat", "Rye", "Sourdough", "English Muffin", "Gluten Free English Muffin", "Biscuit", "Tortillas", "Garlic Toast", "7 Grain", "Bagel with Cream Cheese"], true),
      "side-choice": group("side-choice", "Side Choice", "single", ["Hashbrown", "Hashbrown with Cheese", "Hashbrown with Cheese, Onion, and Gravy", "Grits", "Fries, Wavy", "Fries, Seasoned", "Red Skin Potatoes", "Rice", "Mashed Potato", "Corn", "Broccoli", "Onion Rings", "Baked Mac & Cheese", "No Potato"], true),
      "protein-choice": group("protein-choice", "Protein Choice", "multi", ["Bacon", "Sausage Link, 2", "Sausage Link, 4", "Sausage Patty, 2", "Ham Slice", "Ham Diced", "Shaved Ham", "Shaved Turkey", "Chicken Breast", "Chicken Fried Chicken", "Chicken Strip, 2", "Sirloin", "Prime Rib", "Salmon", "T-Bone Steak", "Egg, 1", "No Ham", "Sub Ham for Bacon", "Sub Ham for 2 Bacon Strips", "No Meat"], true),
      "fruit-choice": group("fruit-choice", "Fruit Choice", "single", ["Banana", "Grapes", "Applesauce", "Cottage Cheese", "Apples with Caramel", "Fruit Cup"], false),
      "steak-temp": group("steak-temp", "Steak Temperature", "single", ["Rare", "Medium Rare", "Medium", "Medium Well", "Well Done"], true),
      "meat-temp": group("meat-temp", "Meat Temperature", "single", ["Rare", "Medium Rare", "Medium", "Medium Well", "Well Done"], true),
      "cheese-choice": group("cheese-choice", "Cheese Option", "single", ["American", "Cheddar", "Swiss", "Aged White Cheddar", "No Cheese"], true),
      "burger-addons": group("burger-addons", "Burger Add-ons", "multi", ["No Lettuce", "No Onion", "No Pickles", "No Tomato", "Add Bacon", "Add Avocado", "Add Extra Patty"], false),
      "pancake-toppings": group("pancake-toppings", "Topping / Fruit Options", "multi", ["Banana", "Strawberry Topping", "Fresh Strawberries", "Blueberries", "Chocolate Chips", "Caramel", "No Whipped Cream", "Extra Syrup"], false),
      "sauce-type": group("sauce-type", "Sauce", "single", ["Ranch", "BBQ", "Honey Mustard", "Nashville Hot", "Bourbon", "Mayo", "Diner Q", "5 Pepper"], true),
      "sauce-size": group("sauce-size", "Sauce Size", "single", ["2 oz", "4 oz"], true),
      "wing-sauce": group("wing-sauce", "Wing Sauce", "single", ["Plain", "BBQ", "Buffalo"], true),
      "dinner-trio-app-1": group("dinner-trio-app-1", "Dinner Trio App 1", "single", ["Cheesy Sliders", "Boneless Wings", "Bone-In Wings", "Cheese Sticks", "Onion Rings", "Chicken Tenders", "Nachos, Half", "Chips & Salsa"], true),
      "dinner-trio-app-2": group("dinner-trio-app-2", "Dinner Trio App 2", "single", ["Cheesy Sliders", "Boneless Wings", "Bone-In Wings", "Cheese Sticks", "Onion Rings", "Chicken Tenders", "Nachos, Half", "Chips & Salsa"], true),
      "dinner-trio-app-3": group("dinner-trio-app-3", "Dinner Trio App 3", "single", ["Cheesy Sliders", "Boneless Wings", "Bone-In Wings", "Cheese Sticks", "Onion Rings", "Chicken Tenders", "Nachos, Half", "Chips & Salsa"], true),
      "fry-choice": group("fry-choice", "Fry Choice", "single", ["French Fries", "Seasoned Fries"], true),
      "dressing-choice": group("dressing-choice", "Dressing", "single", ["Ranch", "Blue Cheese", "Honey Mustard", "Balsamic", "Light Italian", "No Dressing"], true),
      "drink-mods": group("drink-mods", "Drink Mods", "multi", ["No Ice", "Light Ice", "Extra Ice", "Lemon", "No Lemon", "Add Cherry", "Add Vanilla"], false),
      "shake-mods": group("shake-mods", "Shake Mods", "multi", ["No Whip", "Extra Whip", "Cherry", "No Cherry", "Extra Thick"], false),
      "app-course": group("app-course", "Send As", "single", ["Appetizer", "Entree + Side"], true),
      "special-instructions": group("special-instructions", "Special Instructions", "text", [], false)
    },
    items: [
      item("super-slam-pos", "Super Slam", "Breakfast", "Slams / Combos", ["egg-style", "protein-choice", "side-choice"], ["toast-choice", "add-beverage"], ["Super"]),
      item("everyday-value-slam-pos", "Everyday Value Slam", "Breakfast", "Slams / Combos", ["egg-style", "protein-choice"], ["side-choice", "add-beverage"], ["Value Slam"]),
      item("2-egg-breakfast-pos", "2 Egg Breakfast", "Breakfast", "Slams / Combos", ["egg-style", "toast-choice", "side-choice", "protein-choice"], ["add-beverage"], ["2 Egg"]),
      item("two-meat-scrambler-pos", "Two Meat Scrambler", "Breakfast", "Slams / Combos", ["side-choice", "toast-choice"], ["protein-choice", "add-beverage"], ["Two Meat"]),
      item("sirloin-eggs-pos", "Sirloin & Eggs", "Breakfast", "Slams / Combos", ["egg-style", "toast-choice", "side-choice", "steak-temp"], ["add-sauce", "add-beverage"], ["Sirloin/Eggs"]),
      item("grand-slam-burrito-pos", "Grand Slam Burrito", "Breakfast", "Burritos / Quesadillas", [], ["add-sauce", "add-beverage"], ["GS Burrito"]),
      item("breakfast-quesadilla-pos", "Breakfast Quesadilla", "Breakfast", "Burritos / Quesadillas", [], ["add-sauce", "protein-choice"], ["Bfast Quesadilla"]),
      item("cheese-omelet-pos", "Cheese Omelet", "Breakfast", "Omelets", ["side-choice", "toast-choice"], ["protein-choice"], ["Cheese Oml"]),
      ...["Banana Cream Pancakes", "Cinnamon Roll Pancakes", "Chococana Pancakes", "Stack Pancakes", "Double Berry Banana Pancakes", "Berry Waffle", "Liege Waffle", "Berry French Toast", "French Toast, 2 Slice", "Strawberry Vanilla Crepe", "Strawberry Vanilla Crepe, 2"].map((name, index) => item(`breakfast-sweet-${index + 1}`, name, "Breakfast", index < 5 ? "Pancakes & Waffles" : "French Toast / Crepes", [], ["pancake-toppings", "protein-choice", "add-beverage"], [])),
      ...["Classic Burger", "Triple Juicy Burger", "Brisket Melt", "Fish Sandwich"].map((name, index) => item(`lunch-burger-${index + 1}`, name, "Lunch / Dinner", index < 2 ? "Burgers" : "Sandwiches", ["meat-temp", "cheese-choice", "side-choice"], ["burger-addons", "add-sauce"], [])),
      item("chicken-tenders-fries-pos", "Chicken Tenders & Fries", "Lunch / Dinner", "Chicken", ["sauce-type"], ["side-choice"], ["Tenders Fries"]),
      item("fried-fish-platter-pos", "Fried Fish Platter", "Lunch / Dinner", "Fish", ["side-choice", "sauce-type"], ["toast-choice"], ["Fish Platter"]),
      item("cfs-dinner-1pc-pos", "Country Fried Steak Dinner, 1 Pc", "Lunch / Dinner", "Dinner Plates", ["side-choice"], ["toast-choice", "add-sauce"], ["1 Pc CFS"]),
      item("dinner-trio-appetizer-pos", "Dinner Trio Appetizer", "Appetizers", "Appetizers", ["app-course", "dinner-trio-app-1", "dinner-trio-app-2", "dinner-trio-app-3", "fry-choice"], ["sauce-type"], ["Dinner Trio", "Dinner Tip"]),
      item("cheesy-sliders-pos", "Cheesy Sliders", "Appetizers", "Appetizers", ["app-course"], ["sauce-type", "side-choice"], ["Sliders"], {
        modifiers: ["2 Half Bacon Slice", "Mini Bun Toasted On Grill", "Ranch", "Slice Of American Cheese"]
      }),
      item("bone-in-wings-pos", "Bone-In Wings", "Appetizers", "Appetizers", ["app-course", "wing-sauce"], ["side-choice"], ["Bone In Wings"], {
        defaultSelections: { "wing-sauce": "Buffalo" }
      }),
      ...["Cheese Quesadilla", "Smothered Cheese Fries", "Southwest Seasoned Fries", "Nachos, Half", "Nachos, Full", "Chicken Tenders", "Chips & Salsa", "Donut Holes", "Onion Rings", "Cheese Sticks", "Boneless Wings", "Classic Sampler"].map((name, index) => item(`app-${index + 1}-pos`, name, "Appetizers", "Appetizers", ["app-course"], ["sauce-type", "side-choice"], [])),
      ...["Slice Pecan Pie", "Whole Pecan Pie", "Slice Pumpkin Pie", "Whole Pumpkin Pie", "4 Donut Holes", "10 Donut Holes", "BYO Sundae", "Brownie Sundae", "Skillet Cookie", "Cookie Dough Pie", "Strawberry Cheesecake", "Apple Crisp"].map((name, index) => item(`dessert-${index + 1}-pos`, name, "Desserts", index < 4 ? "Pies" : index < 6 ? "Donuts" : index < 10 ? "Sundaes" : "Packs", [], ["pancake-toppings"], [])),
      ...["Liege Waffle A La Carte", "Berry Waffle A La Carte", "Banana Cream Cakes", "French Toast Banana Caramel"].map((name, index) => item(`alc-breakfast-${index + 1}`, name, "A La Carte", "Pancakes & Waffles", [], ["pancake-toppings"], [])),
      ...["Ranch", "BBQ", "Honey Mustard", "Nashville Hot", "Bourbon", "Mayo", "Diner Q", "5 Pepper"].map((name, index) => item(`sauce-${index + 1}`, name, "A La Carte", "Sauces", ["sauce-type", "sauce-size"], [], [])),
      ...["Coffee", "Decaf Coffee", "Hot Chocolate", "Herb Tea", "Hot Tea", "Cold Brew Coffee", "Mocha Cold Brew", "Salted Caramel Cold Brew"].map((name, index) => item(`bev-hot-${index + 1}`, name, "Beverages", "Coffee / Hot", [], ["drink-mods"], [])),
      ...["Lemonade", "Iced Tea", "Lemonade Iced Tea", "Mango Lemonade", "Strawberry Lemonade"].map((name, index) => item(`bev-tea-${index + 1}`, name, "Beverages", "Iced Tea / Lemonade", [], ["drink-mods"], [])),
      ...["Apple Juice", "Grapefruit Juice", "Orange Juice", "Tomato Juice", "Milk", "Chocolate Milk"].map((name, index) => item(`bev-juice-${index + 1}`, name, "Beverages", "Juice / Milk", [], ["drink-mods"], [])),
      ...["Coke", "Diet Coke", "Coke Zero", "Dr Pepper", "Sprite", "Root Beer", "Fanta Orange", "Hi-C", "Raspberry Tea", "Freestyle", "Strawberry Sparkler", "Slammin Coca Cola", "Slammin Strawberry Sprite", "Slammin Dr Pepper"].map((name, index) => item(`bev-soft-${index + 1}`, name, "Beverages", "Soft Drinks", [], ["drink-mods"], [])),
      ...["Mango Smoothie", "Strawberry Banana Smoothie", "Oreo Milkshake", "Strawberry Milkshake", "Chocolate Milkshake", "Vanilla Milkshake", "Cake Batter Milkshake", "Strawberry Cheesecake Shake", "Choco Cinnamon Milkshake", "Green Smoothie"].map((name, index) => item(`bev-shake-${index + 1}`, name, "Beverages", "Milkshakes / Smoothies", [], ["shake-mods"], [])),
      item("bottled-water-pos", "Bottled Water", "Beverages", "Water", [], [], []),
      item("tap-water-pos", "Tap Water", "Beverages", "Water", [], ["drink-mods"], []),
      ...["Jr Build Your Own", "Jr Chicken Chipper Clucks", "Jr Mac & Cheese", "Jr Chicken Tenders", "Jr Cheeseburger", "Jr Anniversary Pancakes", "Jr Spaghetti", "Jr Grand Slam", "Jr Waffle Breakfast"].map((name, index) => item(`jr-meal-${index + 1}`, name, "Jr Menu", "Jr Meals", [], ["side-choice", "drink-mods"], [])),
      ...["Jr Hot Chocolate", "Jr Iced Tea / Lemonade", "Jr Soft Drink", "Jr Juice / Milk", "Jr Tap Water", "Jr Smoothies"].map((name, index) => item(`jr-bev-${index + 1}`, name, "Jr Menu", "Jr Beverages", [], ["drink-mods"], [])),
      ...["Grand Slam Pack", "Turkey Dinner Pack", "20 Pc Boneless Wings", "Cheesecake Pack", "Take & Bake Apple Crisp", "Add 2 Strawberry Shakes", "Add 2 Oreo Shakes"].map((name, index) => item(`lto-${index + 1}`, name, "LTO / Seasonal", "Seasonal", [], ["shake-mods", "sauce-type"], [])),
      ...["Grand Slam Pack", "Turkey Dinner Pack", "Cheesecake Pack", "20 Pc Boneless Wings", "Take & Bake Apple Crisp"].map((name, index) => item(`family-${index + 1}`, name, "Family Packs", "Family Packs", [], ["sauce-type"], [])),
      ...["Super Slam", "Everyday Value Slam", "Chicken Tenders & Fries", "Classic Burger", "Two Meat Scrambler", "Country Fried Steak Dinner, 1 Pc", "2 Egg Breakfast", "Breakfast Quesadilla", "Grand Slam Burrito", "Fish Sandwich"].map((name, index) => item(`special-${index + 1}`, name, "Specials / Value", "Specials / Value", [], ["egg-style", "side-choice", "protein-choice", "sauce-type"], []))
    ]
  };
})();
