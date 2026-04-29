// Denny's-style demo menu data. This is not an official menu.
// Replace POS keys and items with the store's real POS configuration when available.

window.TableFlowLegacyMenuConfig = {
  categories: [
    "APPT",
    "SOUP/SAL",
    "ENTREE",
    "VEG/POT",
    "DESSERT",
    "BEV",
    "KIDS",
    "SIDES",
    "MODS"
  ],

  items: [
    // =========================
    // BEVERAGES
    // =========================
    item("coffee", "COFFEE", "Coffee", "Coffee", "BEV", "Hot Drinks", null, false, null, ["Cream", "Sugar", "Decaf"], 1),
    item("hot-tea", "HOT TEA", "Hot Tea", "Hot Tea", "BEV", "Hot Drinks", null, false, null, ["Lemon", "Honey"], 2),
    item("hot-chocolate", "HOT CHOC", "Hot Chocolate", "Hot Choc", "BEV", "Hot Drinks", null, false, null, ["Whipped cream", "No whip"], 3),

    item("coke", "COKE", "Coke", "Coke", "BEV", "Soft Drinks", null, false, null, ["No ice", "Lemon"], 10),
    item("diet-coke", "DIET COKE", "Diet Coke", "Diet Coke", "BEV", "Soft Drinks", null, false, null, ["No ice", "Lemon"], 11),
    item("sprite", "SPRITE", "Sprite", "Sprite", "BEV", "Soft Drinks", null, false, null, ["No ice"], 12),
    item("dr-pepper", "DR PEPPER", "Dr Pepper", "Dr Pepper", "BEV", "Soft Drinks", null, false, null, ["No ice"], 13),
    item("root-beer", "ROOT BEER", "Root Beer", "Root Beer", "BEV", "Soft Drinks", null, false, null, ["No ice"], 14),
    item("lemonade", "LEMONADE", "Lemonade", "Lemonade", "BEV", "Soft Drinks", null, false, null, ["No ice"], 15),
    item("iced-tea", "ICED TEA", "Iced Tea", "Iced Tea", "BEV", "Tea", null, false, null, ["Sweet", "Unsweet", "Lemon", "No ice"], 16),
    item("water", "WATER", "Water", "Water", "BEV", "Water", null, false, null, ["No ice", "Lemon"], 17),
    item("no-drink", "NO DRINK", "No Drink", "No Drink", "BEV", "Water", null, false, null, [], 18),

    item("orange-juice", "OJ", "Orange Juice", "OJ", "BEV", "Juice", null, false, null, ["Small", "Large", "No ice"], 20),
    item("apple-juice", "APPLE JUICE", "Apple Juice", "Apple Juice", "BEV", "Juice", null, false, null, ["Small", "Large", "No ice"], 21),
    item("milk", "MILK", "Milk", "Milk", "BEV", "Milk", null, false, null, ["White", "Chocolate", "Small", "Large"], 22),

    item("vanilla-ms", "VANILLA MS", "Vanilla Milkshake", "Vanilla MS", "BEV", "Milkshakes", null, true, "milkshakes", ["No whip", "Extra whip", "Cherry", "No cherry"], 30),
    item("chocolate-ms", "CHOC MS", "Chocolate Milkshake", "Choc MS", "BEV", "Milkshakes", null, true, "milkshakes", ["No whip", "Extra whip", "Cherry", "No cherry"], 31),
    item("strawberry-ms", "STRAW MS", "Strawberry Milkshake", "Straw MS", "BEV", "Milkshakes", null, true, "milkshakes", ["No whip", "Extra whip", "Cherry", "No cherry"], 32),
    item("oreo-ms", "OREO MS", "Oreo Milkshake", "Oreo MS", "BEV", "Milkshakes", null, true, "milkshakes", ["No whip", "Extra whip", "Cherry", "No cherry"], 33),

    // =========================
    // APPETIZERS / STARTERS
    // =========================
    item("mozz-sticks", "MOZZ STICKS", "Mozzarella Sticks", "Mozz Sticks", "APPT", "Starters", null, true, "sauces", ["Marinara", "Ranch"], 100, true),
    item("zesty-nachos", "NACHOS", "Zesty Nachos", "Nachos", "APPT", "Starters", null, true, "sauces", ["No jalapenos", "Extra cheese", "Sour cream side", "Salsa side"], 101, true),
    item("boneless-wings", "BONELESS WINGS", "Boneless Wings", "Wings", "APPT", "Starters", null, true, "sauces", ["BBQ", "Buffalo", "Ranch", "Blue cheese"], 102, true),
    item("premium-chicken-tenders-app", "TENDERS APP", "Premium Chicken Tenders Appetizer", "Tenders App", "APPT", "Starters", null, true, "sauces", ["Ranch", "BBQ", "Honey mustard", "Buffalo"], 103, true),
    item("loaded-bacon-cheddar-tots", "LOADED TOTS", "Loaded Bacon Cheddar Tots", "Loaded Tots", "APPT", "Starters", null, true, "sauces", ["Ranch", "Sour cream side", "No bacon"], 104, true),
    item("classic-sampler", "SAMPLER", "Classic Sampler", "Sampler", "APPT", "Starters", null, true, "sauces", ["Ranch", "BBQ", "Marinara", "Honey mustard"], 105, true),

    // =========================
    // CLASSIC SLAMS / BREAKFAST
    // =========================
    item("original-grand-slam", "ORG GRAND SLAM", "Original Grand Slam", "Grand Slam", "ENTREE", "Classic Slams", null, false, null, ["Eggs", "Bacon", "Sausage", "Ham", "Hash browns", "Toast"], 200),
    item("build-your-own-grand-slam", "BYO GRAND SLAM", "Build Your Own Grand Slam", "BYO Slam", "ENTREE", "Classic Slams", null, false, null, ["Pancakes", "French toast", "Eggs", "Bacon", "Sausage", "Hash browns"], 201),
    item("all-american-slam", "ALL AM SLAM", "All-American Slam", "All American", "ENTREE", "Classic Slams", null, false, null, ["Eggs", "Cheese eggs", "Bacon", "Sausage", "Hash browns", "Toast"], 202),
    item("lumberjack-slam", "LUMBERJACK", "Lumberjack Slam", "Lumberjack", "ENTREE", "Classic Slams", null, false, null, ["Eggs", "Bacon", "Sausage", "Ham", "Hash browns", "Toast"], 203),
    item("french-toast-slam", "FT SLAM", "French Toast Slam", "FT Slam", "ENTREE", "Classic Slams", null, false, null, ["Eggs", "Bacon", "Sausage", "No powdered sugar"], 204),
    item("fit-slam", "FIT SLAM", "Fit Slam", "Fit Slam", "ENTREE", "Fit Fare", null, false, null, ["Egg whites", "Turkey bacon", "Fruit", "No toast"], 205),
    item("super-slam", "SUPER SLAM", "Super Slam", "Super Slam", "ENTREE", "Classic Slams", null, false, null, ["Eggs", "Bacon", "Sausage", "Hash browns", "Pancakes"], 206),
    item("everyday-value-slam", "VALUE SLAM", "Everyday Value Slam", "Value Slam", "ENTREE", "Classic Slams", null, false, null, ["Eggs", "Bacon", "Sausage", "Pancakes"], 207),

    // =========================
    // PANCAKES / CREPES / WAFFLES
    // =========================
    item("buttermilk-pancakes", "PANCAKES", "Buttermilk Pancakes", "Pancakes", "ENTREE", "Pancakes", null, false, null, ["Butter", "No butter", "Extra syrup", "Sugar-free syrup"], 250),
    item("double-berry-banana-pancakes", "DBB PANCAKES", "Double Berry Banana Pancake Breakfast", "Berry Banana", "ENTREE", "Pancakes", null, false, null, ["No banana", "No berries", "Extra topping", "Eggs", "Bacon", "Sausage"], 251),
    item("cinnamon-roll-pancakes", "CIN ROLL PAN", "Cinnamon Roll Pancake Breakfast", "Cinn Pancakes", "ENTREE", "Pancakes", null, false, null, ["No icing", "Extra icing", "Eggs", "Bacon", "Sausage"], 252),
    item("choconana-pancakes", "CHOCONANA", "Choconana Pancake Breakfast", "Choconana", "ENTREE", "Pancakes", null, false, null, ["No chocolate", "No banana", "Extra topping"], 253),
    item("strawberry-vanilla-crepe", "STRAW CREPE", "Strawberry Vanilla Crepe Breakfast", "Straw Crepe", "ENTREE", "Crepes", null, false, null, ["No topping", "Extra topping", "Eggs", "Bacon", "Sausage"], 254),
    item("berry-waffle-slam", "BERRY WAFFLE", "Berry Waffle Slam", "Berry Waffle", "ENTREE", "Waffles", null, false, null, ["No berries", "Extra topping", "Eggs", "Bacon", "Sausage"], 255),

    // =========================
    // OMELETTES
    // =========================
    item("philly-cheesesteak-omelette", "PHILLY OML", "Philly Cheesesteak Omelette", "Philly Oml", "ENTREE", "Omelettes", null, false, null, ["No onions", "No peppers", "No cheese", "Hash browns", "Toast"], 300),
    item("ultimate-omelette", "ULT OML", "Ultimate Omelette", "Ultimate Oml", "ENTREE", "Omelettes", null, false, null, ["No onions", "No peppers", "No sausage", "No bacon", "Hash browns", "Toast"], 301),
    item("loaded-veggie-omelette", "VEG OML", "Loaded Veggie Omelette", "Veggie Oml", "ENTREE", "Omelettes", null, false, null, ["No mushrooms", "No onions", "No peppers", "No cheese", "Hash browns", "Toast"], 302),
    item("my-hammy-spice-omelette", "HAMMY OML", "My Hammy Spice Omelette", "Hammy Oml", "ENTREE", "Omelettes", null, false, null, ["No jalapenos", "No cheese", "Hash browns", "Toast"], 303),
    item("build-your-own-omelette", "BYO OML", "Build Your Own Omelette", "BYO Oml", "ENTREE", "Omelettes", null, false, null, ["Cheese", "Ham", "Bacon", "Sausage", "Onions", "Peppers", "Mushrooms"], 304),

    // =========================
    // BREAKFAST SKILLETS / SIGNATURE BREAKFAST
    // =========================
    item("grand-slamwich", "SLAMWICH", "Grand Slamwich", "Slamwich", "ENTREE", "Signature Breakfasts", null, false, null, ["No mayo", "No cheese", "Hash browns", "Fruit"], 350),
    item("moons-over-my-hammy", "MOONS HAMMY", "Moons Over My Hammy", "Moons Hammy", "ENTREE", "Signature Breakfasts", null, false, null, ["No Swiss", "No American cheese", "Hash browns", "Fruit"], 351),
    item("country-fried-steak-eggs", "CFS EGGS", "Country-Fried Steak & Eggs", "CFS Eggs", "ENTREE", "Signature Breakfasts", null, false, null, ["Gravy side", "No gravy", "Eggs", "Hash browns", "Toast"], 352),
    item("tbone-steak-eggs", "TBONE EGGS", "T-Bone Steak & Eggs", "T-Bone Eggs", "ENTREE", "Signature Breakfasts", null, false, null, ["Rare", "Medium rare", "Medium", "Medium well", "Well done", "Eggs"], 353),
    item("sirloin-steak-eggs", "SIRLOIN EGGS", "Sirloin Steak & Eggs", "Sirloin Eggs", "ENTREE", "Signature Breakfasts", null, false, null, ["Rare", "Medium rare", "Medium", "Medium well", "Well done", "Eggs"], 354),
    item("hearty-breakfast-skillet", "HEARTY SKIL", "Hearty Breakfast Skillet", "Hearty Skil", "ENTREE", "Skillets", null, false, null, ["Eggs", "No cheese", "No onions", "No peppers"], 355),
    item("supreme-sizzlin-skillet", "SUPREME SKIL", "Supreme Sizzlin' Skillet", "Supreme Skil", "ENTREE", "Skillets", null, false, null, ["Eggs", "No cheese", "No mushrooms", "No onions"], 356),
    item("vegetable-skillet", "VEG SKIL", "Vegetable Skillet", "Veg Skil", "ENTREE", "Skillets", null, false, null, ["Eggs", "No cheese", "No mushrooms", "No onions"], 357),

    // =========================
    // BURGERS
    // =========================
    item("single-cheeseburger", "CHEESEBURGER", "Single Cheeseburger", "Cheeseburger", "ENTREE", "Burgers", null, false, null, ["No onion", "No pickle", "No tomato", "Add bacon", "Fries"], 400),
    item("double-cheeseburger", "DBL CHEESE", "Double Cheeseburger", "Dbl Cheese", "ENTREE", "Burgers", null, false, null, ["No onion", "No pickle", "No tomato", "Add bacon", "Fries"], 401),
    item("bacon-avocado-burger", "BAC AVO BURG", "Bacon Avocado Cheeseburger", "Bacon Avo", "ENTREE", "Burgers", null, false, null, ["No avocado", "No bacon", "No onion", "Fries"], 402),
    item("flamin-five-pepper-burger", "5 PEPPER BURG", "Flamin' 5-Pepper Burger", "5 Pepper", "ENTREE", "Burgers", null, false, null, ["No jalapenos", "No spicy sauce", "No cheese", "Fries"], 403),
    item("bourbon-bacon-burger", "BOURBON BURG", "Bourbon Bacon Burger", "Bourbon Burg", "ENTREE", "Burgers", null, false, null, ["No bourbon sauce", "No bacon", "No onions", "Fries"], 404),
    item("slamburger", "SLAMBURGER", "Slamburger", "Slamburger", "ENTREE", "Burgers", null, false, null, ["Egg over easy", "Egg scrambled", "No bacon", "No hash browns", "Fries"], 405),

    // =========================
    // MELTS / HANDHELDS
    // =========================
    item("super-bird", "SUPER BIRD", "Super Bird", "Super Bird", "ENTREE", "Melts & Handhelds", null, false, null, ["No tomato", "No Swiss", "Fries", "Hash browns"], 450),
    item("nashville-hot-chicken-melt", "HOT CHIX MELT", "Nashville Hot Chicken Melt", "Hot Chix Melt", "ENTREE", "Melts & Handhelds", null, false, null, ["Sauce side", "No pickles", "No cheese", "Fries"], 451),
    item("brisk-it-all-melt", "BRISK MELT", "Brisk-It-All Melt", "Brisk Melt", "ENTREE", "Melts & Handhelds", null, false, null, ["No egg", "No cheese", "No sauce", "Fries"], 452),
    item("classic-patty-melt", "PATTY MELT", "Classic Patty Melt", "Patty Melt", "ENTREE", "Melts & Handhelds", null, false, null, ["No onions", "No cheese", "Fries"], 453),
    item("cali-club", "CALI CLUB", "Cali Club Sandwich", "Cali Club", "ENTREE", "Melts & Handhelds", null, false, null, ["No avocado", "No bacon", "No tomato", "Fries"], 454),
    item("chicken-addiction-bowl", "CHIX BOWL", "Chicken Addiction Bowl", "Chix Bowl", "ENTREE", "Bowls", null, false, null, ["Sauce side", "No cheese", "No bacon"], 455),

    // =========================
    // DINNERS / ENTREES
    // =========================
    item("chicken-tenders", "TENDERS", "Chicken Tenders", "Tenders", "ENTREE", "Entrees", null, true, "sauces", ["Ranch", "BBQ", "Honey mustard", "Buffalo"], 500),
    item("country-fried-steak-dinner", "CFS DINNER", "Country-Fried Steak Dinner", "CFS Dinner", "ENTREE", "Dinners", null, false, null, ["Gravy side", "No gravy", "Mashed potatoes", "Fries", "Broccoli"], 501),
    item("sirloin-steak-dinner", "SIRLOIN", "Sirloin Steak Dinner", "Sirloin", "ENTREE", "Dinners", null, false, null, ["Rare", "Medium rare", "Medium", "Medium well", "Well done", "Mashed potatoes", "Broccoli"], 502),
    item("tbone-steak-dinner", "TBONE", "T-Bone Steak Dinner", "T-Bone", "ENTREE", "Dinners", null, false, null, ["Rare", "Medium rare", "Medium", "Medium well", "Well done", "Mashed potatoes", "Broccoli"], 503),
    item("wild-alaska-salmon", "SALMON", "Wild Alaska Salmon", "Salmon", "ENTREE", "Dinners", null, false, null, ["No seasoning", "Lemon", "Broccoli", "Rice"], 504),
    item("mama-fried-chicken", "MAMA CHIX", "Mama's Fried Chicken", "Mama Chix", "ENTREE", "Dinners", null, false, null, ["Gravy side", "No gravy", "Mashed potatoes", "Fries", "Broccoli"], 505),
    item("fried-fish-dinner", "FISH DINNER", "Fried Fish Dinner", "Fish Dinner", "ENTREE", "Dinners", null, false, null, ["Tartar side", "No tartar", "Fries", "Broccoli"], 506),
    item("plate-lickin-chicken-fried-chicken", "PLATE CHIX", "Plate Lickin' Chicken Fried Chicken", "Plate Chix", "ENTREE", "Dinners", null, false, null, ["Gravy side", "No gravy", "Mashed potatoes", "Broccoli"], 507),
    item("premium-chicken-tenders-dinner", "TENDERS DIN", "Premium Chicken Tenders Dinner", "Tenders Din", "ENTREE", "Dinners", null, true, "sauces", ["Ranch", "BBQ", "Honey mustard", "Buffalo", "Fries"], 508),

    // =========================
    // SOUPS / SALADS
    // =========================
    item("house-salad", "HOUSE SALAD", "House Salad", "House Salad", "SOUP/SAL", "Salads", null, false, null, ["Ranch", "Blue cheese", "Italian", "Dressing side", "No croutons"], 600),
    item("cobb-salad", "COBB SALAD", "Cobb Salad", "Cobb", "SOUP/SAL", "Salads", null, false, null, ["Grilled chicken", "Fried chicken", "No bacon", "No egg", "Dressing side"], 601),
    item("salmon-salad", "SALMON SALAD", "Salmon Salad Your Way", "Salmon Salad", "SOUP/SAL", "Salads", null, false, null, ["No croutons", "Dressing side", "Lemon"], 602),
    item("fried-chicken-house-salad", "FRIED CHIX SALAD", "Fried Chicken House Salad", "Fried Chix Salad", "SOUP/SAL", "Salads", null, false, null, ["No croutons", "Dressing side", "No cheese"], 603),
    item("bowl-of-soup", "SOUP BOWL", "Bowl of Soup", "Soup Bowl", "SOUP/SAL", "Soup", null, false, null, ["Cup", "Bowl", "Crackers"], 604),
    item("soup-and-salad", "SOUP SALAD", "Soup & Salad", "Soup Salad", "SOUP/SAL", "Soup", null, false, null, ["Cup soup", "Bowl soup", "Dressing side", "No croutons"], 605),

    // =========================
    // SIDES / VEG / POTATO
    // =========================
    item("fries", "FRIES", "Fries", "Fries", "SIDES", "Sides", null, false, null, ["Crispy", "No salt", "Ranch"], 700, true),
    item("seasoned-fries", "SEASONED FRIES", "Seasoned Fries", "Seasoned Fries", "SIDES", "Sides", null, false, null, ["Crispy", "No salt", "Ranch"], 701, true),
    item("hash-browns", "HASH BROWNS", "Hash Browns", "Hash Browns", "VEG/POT", "Potatoes", null, false, null, ["Crispy", "Light", "Cheese", "Onions"], 702),
    item("red-skinned-potatoes", "RED POTATO", "Red-Skinned Potatoes", "Red Potato", "VEG/POT", "Potatoes", null, false, null, ["No seasoning", "Extra seasoning"], 703),
    item("mashed-potatoes", "MASHED", "Mashed Potatoes", "Mashed", "VEG/POT", "Potatoes", null, false, null, ["Gravy", "No gravy", "Gravy side"], 704),
    item("broccoli", "BROCCOLI", "Broccoli", "Broccoli", "VEG/POT", "Vegetables", null, false, null, ["No butter", "Lemon"], 705),
    item("seasonal-fruit", "FRUIT", "Seasonal Fruit", "Fruit", "SIDES", "Fruit", null, false, null, [], 706),
    item("garden-side-salad", "SIDE SALAD", "Garden Side Salad", "Side Salad", "SOUP/SAL", "Salads", null, false, null, ["Ranch", "Blue cheese", "Italian", "Dressing side", "No croutons"], 707),
    item("toast", "TOAST", "Toast", "Toast", "SIDES", "Breakfast Sides", null, false, null, ["White", "Wheat", "Sourdough", "Rye", "Butter", "Dry"], 708),
    item("english-muffin", "ENG MUFFIN", "English Muffin", "Eng Muffin", "SIDES", "Breakfast Sides", null, false, null, ["Butter", "Dry"], 709),
    item("biscuit", "BISCUIT", "Biscuit", "Biscuit", "SIDES", "Breakfast Sides", null, false, null, ["Butter", "Gravy", "No gravy"], 710),
    item("bacon", "BACON", "Bacon", "Bacon", "SIDES", "Breakfast Sides", null, false, null, ["Crispy", "Soft"], 711),
    item("sausage-links", "SAUSAGE", "Sausage Links", "Sausage", "SIDES", "Breakfast Sides", null, false, null, [], 712),
    item("ham", "HAM", "Ham", "Ham", "SIDES", "Breakfast Sides", null, false, null, [], 713),
    item("eggs", "EGGS", "Eggs", "Eggs", "SIDES", "Breakfast Sides", null, false, null, ["Over easy", "Over medium", "Over hard", "Scrambled", "Sunny side up"], 714),

    // =========================
    // KIDS
    // =========================
    item("kids-jr-grand-slam", "KIDS SLAM", "Kids Jr. Grand Slam", "Kids Slam", "KIDS", "Kids Breakfast", null, false, null, ["Eggs", "Bacon", "Sausage", "Pancakes"], 800),
    item("kids-pancakes", "KIDS PANCAKES", "Kids Pancakes", "Kids Pancakes", "KIDS", "Kids Breakfast", null, false, null, ["Chocolate chips", "No butter", "Extra syrup"], 801),
    item("kids-french-toast", "KIDS FT", "Kids French Toast", "Kids FT", "KIDS", "Kids Breakfast", null, false, null, ["No powdered sugar", "Extra syrup"], 802),
    item("kids-chicken-tenders", "KIDS TENDERS", "Kids Chicken Tenders", "Kids Tenders", "KIDS", "Kids Meals", null, true, "sauces", ["Ranch", "BBQ", "Honey mustard"], 803),
    item("kids-cheeseburger", "KIDS BURGER", "Kids Cheeseburger", "Kids Burger", "KIDS", "Kids Meals", null, false, null, ["No cheese", "No pickle", "Fries", "Fruit"], 804),
    item("kids-grilled-cheese", "KIDS GRILL CHEESE", "Kids Grilled Cheese", "Kids Grilled", "KIDS", "Kids Meals", null, false, null, ["Fries", "Fruit"], 805),
    item("kids-mac-cheese", "KIDS MAC", "Kids Mac & Cheese", "Kids Mac", "KIDS", "Kids Meals", null, false, null, ["Fries", "Fruit"], 806),
    item("kids-spaghetti", "KIDS SPAG", "Kids Spaghetti", "Kids Spag", "KIDS", "Kids Meals", null, false, null, ["No sauce", "Extra sauce"], 807),
    item("kids-beverage", "KIDS BEV", "Kids Beverage", "Kids Bev", "KIDS", "Kids Drinks", null, false, null, ["Milk", "Chocolate milk", "Apple juice", "Orange juice", "Soft drink"], 808),

    // =========================
    // 55+ MENU
    // =========================
    item("55-starter", "55 STARTER", "55+ Starter", "55 Starter", "ENTREE", "55+", null, false, null, ["Eggs", "Bacon", "Sausage", "Toast"], 850),
    item("55-scrambled-eggs-cheddar", "55 SCRAM", "55+ Scrambled Eggs & Cheddar", "55 Scram", "ENTREE", "55+", null, false, null, ["No cheese", "Hash browns", "Toast"], 851),
    item("55-omelette", "55 OML", "55+ Omelette", "55 Oml", "ENTREE", "55+", null, false, null, ["No cheese", "Hash browns", "Toast"], 852),
    item("55-country-fried-steak", "55 CFS", "55+ Country-Fried Steak", "55 CFS", "ENTREE", "55+", null, false, null, ["Gravy side", "No gravy", "Potatoes", "Broccoli"], 853),
    item("55-salmon", "55 SALMON", "55+ Wild Alaska Salmon", "55 Salmon", "ENTREE", "55+", null, false, null, ["No seasoning", "Lemon", "Broccoli", "Rice"], 854),
    item("55-grilled-chicken", "55 GR CHIX", "55+ Grilled Chicken", "55 Gr Chix", "ENTREE", "55+", null, false, null, ["No seasoning", "Broccoli", "Potatoes"], 855),

    // =========================
    // DESSERTS
    // =========================
    item("new-york-cheesecake", "CHEESECAKE", "New York Style Cheesecake", "Cheesecake", "DESSERT", "Desserts", null, true, "desserts", ["Strawberry topping", "No topping"], 900),
    item("cookie-dough-pie", "COOKIE PIE", "Cookie Dough Lover's Pie", "Cookie Pie", "DESSERT", "Desserts", null, true, "desserts", ["Whipped cream", "No whip"], 901),
    item("brownie-sundae", "BROWNIE SUN", "Brownie Sundae", "Brownie Sun", "DESSERT", "Desserts", null, true, "desserts", ["No whip", "Extra chocolate", "Cherry", "No cherry"], 902),
    item("lava-cookie-skillet", "LAVA COOKIE", "Lava Cookie Skillet", "Lava Cookie", "DESSERT", "Desserts", null, true, "desserts", ["No ice cream", "Extra chocolate"], 903),
    item("ice-cream", "ICE CREAM", "Ice Cream", "Ice Cream", "DESSERT", "Desserts", null, true, "desserts", ["Vanilla", "Chocolate", "Strawberry", "No topping"], 904),

    // =========================
    // COMMON MODS
    // =========================
    item("mod-no-onion", "NO ONION", "No Onion", "No Onion", "MODS", "Mods", null, false, null, [], 1000, true),
    item("mod-no-tomato", "NO TOMATO", "No Tomato", "No Tomato", "MODS", "Mods", null, false, null, [], 1001, true),
    item("mod-no-cheese", "NO CHEESE", "No Cheese", "No Cheese", "MODS", "Mods", null, false, null, [], 1002, true),
    item("mod-add-cheese", "ADD CHEESE", "Add Cheese", "Add Cheese", "MODS", "Mods", null, false, null, [], 1003, true),
    item("mod-add-bacon", "ADD BACON", "Add Bacon", "Add Bacon", "MODS", "Mods", null, false, null, [], 1004, true),
    item("mod-sauce-side", "SAUCE SIDE", "Sauce on Side", "Sauce Side", "MODS", "Mods", null, false, null, [], 1005, true),
    item("mod-extra-sauce", "EXTRA SAUCE", "Extra Sauce", "Extra Sauce", "MODS", "Mods", null, false, null, [], 1006, true),
    item("mod-no-ice", "NO ICE", "No Ice", "No Ice", "MODS", "Mods", null, false, null, [], 1007, true)
  ]
};

function item(
  id,
  posKey,
  name,
  shortName,
  category,
  subcategory,
  price,
  requiresPrepStation,
  prepCapability,
  modifiers,
  sortOrder,
  canBeTableShare = false
) {
  return {
    id,
    posKey,
    name,
    shortName,
    category,
    subcategory,
    price,
    requiresSeat: !canBeTableShare,
    canBeTableShare,
    requiresPrepStation,
    prepCapability,
    prepStationId:
      prepCapability === "milkshakes" || prepCapability === "desserts"
        ? "dessert-station"
        : prepCapability === "sauces"
          ? "sauce-station"
          : "",
    modifiers,
    active: true,
    orderable: category !== "MODS",
    sortOrder
  };
}
