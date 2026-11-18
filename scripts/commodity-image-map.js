/**
 * Rate-GPT — Local vegetable & fruit image library
 * Commodity → image mapping source.
 *
 * Keys are normalized commodity identifiers used to match AGMARKNET
 * `record.commodity` values (English/Hindi). Each entry points at a
 * dedicated photograph stored under Images/Vegetables/<category>/.
 *
 * Commodities not listed here resolve to the neutral fallback image
 * (Images/Vegetables/other/fallback.webp) — we deliberately do NOT use
 * an unrelated vegetable photograph as a fallback.
 */

const CATEGORIES = ["vegetables", "fruits", "grains", "pulses", "spices", "other"];

// id: stable commodity identifier
// name: English display name
// hindi: Hindi name (Devanagari) when known
// category: storage sub-folder under Images/Vegetables/
// query: Wikimedia Commons search term used to locate the photograph
// source: image provider (for attribution)
const COMMODITY_IMAGE_MAP = [
  // ---------- Vegetables ----------
  { id: "potato", name: "Potato", hindi: "आलू", category: "vegetables", query: "potato vegetable raw", source: "Wikimedia Commons" },
  { id: "tomato", name: "Tomato", hindi: "टमाटर", category: "vegetables", query: "tomato vegetable red", source: "Wikimedia Commons" },
  { id: "onion", name: "Onion", hindi: "प्याज", category: "vegetables", query: "onion vegetable brown", source: "Wikimedia Commons" },
  { id: "brinjal", name: "Brinjal (Eggplant)", hindi: "बैंगन", category: "vegetables", query: "brinjal eggplant vegetable", source: "Wikimedia Commons" },
  { id: "okra", name: "Okra (Ladies Finger)", hindi: "भिंडी", category: "vegetables", query: "okra ladies finger vegetable", source: "Wikimedia Commons" },
  { id: "cauliflower", name: "Cauliflower", hindi: "फूलगोभी", category: "vegetables", query: "cauliflower vegetable white", source: "Wikimedia Commons" },
  { id: "cabbage", name: "Cabbage", hindi: "पत्तागोभी", category: "vegetables", query: "cabbage vegetable green", source: "Wikimedia Commons" },
  { id: "carrot", name: "Carrot", hindi: "गाजर", category: "vegetables", query: "carrot vegetable orange", source: "Wikimedia Commons" },
  { id: "cucumber", name: "Cucumber", hindi: "खीरा", category: "vegetables", query: "cucumber vegetable green", source: "Wikimedia Commons" },
  { id: "pumpkin", name: "Pumpkin", hindi: "कद्दू", category: "vegetables", query: "pumpkin vegetable orange", source: "Wikimedia Commons" },
  { id: "bitter-gourd", name: "Bitter Gourd", hindi: "करेला", category: "vegetables", query: "bitter gourd vegetable", source: "Wikimedia Commons" },
  { id: "bottle-gourd", name: "Bottle Gourd", hindi: "लौकी", category: "vegetables", query: "bottle gourd lauki vegetable", source: "Wikimedia Commons" },
  { id: "beans", name: "Beans", hindi: "beans", category: "vegetables", query: "green beans vegetable", source: "Wikimedia Commons" },
  { id: "green-peas", name: "Green Peas", hindi: "मटर", category: "vegetables", query: "green peas vegetable", source: "Wikimedia Commons" },
  { id: "radish", name: "Radish", hindi: "मूली", category: "vegetables", query: "radish vegetable white", source: "Wikimedia Commons" },
  { id: "spinach", name: "Spinach", hindi: "पालक", category: "vegetables", query: "spinach leafy vegetable", source: "Wikimedia Commons" },
  { id: "beetroot", name: "Beetroot", hindi: "चुकंदर", category: "vegetables", query: "beetroot vegetable", source: "Wikimedia Commons" },
  { id: "sweet-potato", name: "Sweet Potato", hindi: "शकरकंद", category: "vegetables", query: "sweet potato vegetable", source: "Wikimedia Commons" },
  { id: "green-chilli", name: "Green Chilli", hindi: "हरी मिर्च", category: "vegetables", query: "green chilli pepper vegetable", source: "Wikimedia Commons" },
  { id: "capsicum", name: "Capsicum (Bell Pepper)", hindi: "शिमला मिर्च", category: "vegetables", query: "capsicum bell pepper vegetable", source: "Wikimedia Commons" },
  { id: "garlic", name: "Garlic", hindi: "लहसुन", category: "vegetables", query: "garlic bulb vegetable", source: "Wikimedia Commons" },
  { id: "ginger", name: "Ginger", hindi: "अदरक", category: "vegetables", query: "ginger root vegetable", source: "Wikimedia Commons" },
  { id: "ridge-gourd", name: "Ridge Gourd", hindi: "तोरई", category: "vegetables", query: "ridge gourd vegetable", source: "Wikimedia Commons" },
  { id: "sponge-gourd", name: "Sponge Gourd", hindi: "तरोई", category: "vegetables", query: "sponge gourd vegetable", source: "Wikimedia Commons" },
  { id: "ash-gourd", name: "Ash Gourd", hindi: "पेठा", category: "vegetables", query: "ash gourd winter melon vegetable", source: "Wikimedia Commons" },
  { id: "pointed-gourd", name: "Pointed Gourd (Parval)", hindi: "परवल", category: "vegetables", query: "pointed gourd parwal vegetable", source: "Wikimedia Commons" },
  { id: "little-gourd", name: "Little Gourd (Kundru)", hindi: "कुंडरू", category: "vegetables", query: "little gourd ivy gourd vegetable", source: "Wikimedia Commons" },
  { id: "colocasia", name: "Colocasia (Arbi)", hindi: "अरबी", category: "vegetables", query: "colocasia arbi taro root vegetable", source: "Wikimedia Commons" },
  { id: "yam", name: "Yam", hindi: "जिमीकंद", category: "vegetables", query: "yam vegetable root", source: "Wikimedia Commons" },
  { id: "elephant-yam", name: "Elephant Yam (Suran)", hindi: "सूरन", category: "vegetables", query: "elephant yam suran vegetable", source: "Wikimedia Commons" },
  { id: "cluster-beans", name: "Cluster Beans (Guar)", hindi: "ग्वार", category: "vegetables", query: "cluster beans guar vegetable", source: "Wikimedia Commons" },
  { id: "field-bean", name: "Field Bean", hindi: "sem", category: "vegetables", query: "field bean vegetable", source: "Wikimedia Commons" },
  { id: "drumstick", name: "Drumstick (Moringa)", hindi: "सहजन", category: "vegetables", query: "drumstick moringa vegetable", source: "Wikimedia Commons" },
  { id: "curry-leaf", name: "Curry Leaf", hindi: "करी पत्ता", category: "vegetables", query: "curry leaf vegetable", source: "Wikimedia Commons" },
  { id: "amaranthus", name: "Amaranthus (Chaulai)", hindi: "चौलाई", category: "vegetables", query: "amaranth leafy vegetable", source: "Wikimedia Commons" },
  { id: "lettuce", name: "Lettuce", hindi: "lettuce", category: "vegetables", query: "lettuce vegetable green", source: "Wikimedia Commons" },
  { id: "leek", name: "Leek", hindi: "leek", category: "vegetables", query: "leek vegetable", source: "Wikimedia Commons" },
  { id: "celery", name: "Celery", hindi: "celery", category: "vegetables", query: "celery vegetable", source: "Wikimedia Commons" },
  { id: "turnip", name: "Turnip", hindi: "शलगम", category: "vegetables", query: "turnip vegetable white", source: "Wikimedia Commons" },
  { id: "knol-khol", name: "Knol Khol (Kohlrabi)", hindi: "गांथा गोभी", category: "vegetables", query: "kohlrabi knol khol vegetable", source: "Wikimedia Commons" },
  { id: "broccoli", name: "Broccoli", hindi: "ब्रॉकली", category: "vegetables", query: "broccoli vegetable green", source: "Wikimedia Commons" },
  { id: "red-cabbage", name: "Red Cabbage", hindi: "लाल पत्तागोभी", category: "vegetables", query: "red cabbage vegetable", source: "Wikimedia Commons" },
  { id: "mushroom", name: "Mushroom", hindi: "मशरूम", category: "vegetables", query: "mushroom edible white", source: "Wikimedia Commons" },
  { id: "bamboo-shoot", name: "Bamboo Shoot", hindi: "बांस का अंकुर", category: "vegetables", query: "bamboo shoot vegetable", source: "Wikimedia Commons" },
  { id: "tapioca", name: "Tapioca (Cassava)", hindi: "साबुदाना", category: "vegetables", query: "tapioca cassava root vegetable", source: "Wikimedia Commons" },
  { id: "sweet-corn", name: "Sweet Corn", hindi: "स्वीट कॉर्न", category: "vegetables", query: "sweet corn vegetable", source: "Wikimedia Commons" },
  { id: "baby-corn", name: "Baby Corn", hindi: "बेबी कॉर्न", category: "vegetables", query: "baby corn vegetable", source: "Wikimedia Commons" },
  { id: "corn", name: "Corn (Maize)", hindi: "मक्का", category: "vegetables", query: "maize corn vegetable", source: "Wikimedia Commons" },

  // ---------- Fruits ----------
  { id: "banana", name: "Banana", hindi: "केला", category: "fruits", query: "banana fruit yellow", source: "Wikimedia Commons" },
  { id: "mango", name: "Mango", hindi: "आम", category: "fruits", query: "mango fruit", source: "Wikimedia Commons" },
  { id: "apple", name: "Apple", hindi: "सेब", category: "fruits", query: "apple fruit red", source: "Wikimedia Commons" },
  { id: "guava", name: "Guava", hindi: "अमरूद", category: "fruits", query: "guava fruit", source: "Wikimedia Commons" },
  { id: "grapes", name: "Grapes", hindi: "अंगूर", category: "fruits", query: "grapes fruit bunch", source: "Wikimedia Commons" },
  { id: "pomegranate", name: "Pomegranate", hindi: "अनार", category: "fruits", query: "pomegranate fruit", source: "Wikimedia Commons" },
  { id: "papaya", name: "Papaya", hindi: "पपीता", category: "fruits", query: "papaya fruit", source: "Wikimedia Commons" },
  { id: "orange", name: "Orange", hindi: "संतरा", category: "fruits", query: "orange fruit", source: "Wikimedia Commons" },
  { id: "watermelon", name: "Watermelon", hindi: "तरबूज", category: "fruits", query: "watermelon fruit", source: "Wikimedia Commons" },
  { id: "muskmelon", name: "Muskmelon", hindi: "खरबूजा", category: "fruits", query: "muskmelon fruit", source: "Wikimedia Commons" },
  { id: "lemon", name: "Lemon", hindi: "नींबू", category: "fruits", query: "lemon fruit yellow", source: "Wikimedia Commons" },
  { id: "lime", name: "Lime", hindi: "नींबू", category: "fruits", query: "lime fruit green", source: "Wikimedia Commons" },
  { id: "custard-apple", name: "Custard Apple (Sharifa)", hindi: "शरीफा", category: "fruits", query: "custard apple fruit sitaphal", source: "Wikimedia Commons" },
  { id: "jackfruit", name: "Jackfruit", hindi: "कटहल", category: "fruits", query: "jackfruit fruit", source: "Wikimedia Commons" },
  { id: "pineapple", name: "Pineapple", hindi: "अनानास", category: "fruits", query: "pineapple fruit", source: "Wikimedia Commons" },
  { id: "chikoo", name: "Chikoo (Sapota)", hindi: "चीकू", category: "fruits", query: "sapota chikoo fruit", source: "Wikimedia Commons" },
  { id: "kiwi", name: "Kiwi Fruit", hindi: "कीवी", category: "fruits", query: "kiwi fruit", source: "Wikimedia Commons" },
  { id: "pear", name: "Pear", hindi: "नाशपाती", category: "fruits", query: "pear fruit", source: "Wikimedia Commons" },
  { id: "plum", name: "Plum", hindi: "आलूबुखारा", category: "fruits", query: "plum fruit", source: "Wikimedia Commons" },
  { id: "peach", name: "Peach", hindi: "आड़ू", category: "fruits", query: "peach fruit", source: "Wikimedia Commons" },
  { id: "apricot", name: "Apricot", hindi: "खूबानी", category: "fruits", query: "apricot fruit", source: "Wikimedia Commons" },
  { id: "cherry", name: "Cherry", hindi: "चेरी", category: "fruits", query: "cherry fruit red", source: "Wikimedia Commons" },
  { id: "strawberry", name: "Strawberry", hindi: "स्ट्रॉबेरी", category: "fruits", query: "strawberry fruit", source: "Wikimedia Commons" },
  { id: "blueberry", name: "Blueberry", hindi: "ब्लूबेरी", category: "fruits", query: "blueberry fruit", source: "Wikimedia Commons" },
  { id: "fig", name: "Fig (Anjeer)", hindi: "अंजीर", category: "fruits", query: "fig fruit anjeer", source: "Wikimedia Commons" },
  { id: "date", name: "Dates (Khajoor)", hindi: "खजूर", category: "fruits", query: "dates fruit khajoor", source: "Wikimedia Commons" },
  { id: "amla", name: "Amla (Indian Gooseberry)", hindi: "आंवला", category: "fruits", query: "amla indian gooseberry fruit", source: "Wikimedia Commons" },
  { id: "wood-apple", name: "Wood Apple (Bael)", hindi: "बेल", category: "fruits", query: "wood apple bael fruit", source: "Wikimedia Commons" },
  { id: "coconut", name: "Coconut", hindi: "नारियल", category: "fruits", query: "coconut fruit", source: "Wikimedia Commons" },
  { id: "arecanut", name: "Arecanut (Betelnut/Supari)", hindi: "सुपारी", category: "fruits", query: "areca nut betel nut supari", source: "Wikimedia Commons" },
  { id: "cashew", name: "Cashew", hindi: "काजू", category: "fruits", query: "cashew nut fruit", source: "Wikimedia Commons" },
  { id: "almond", name: "Almond (Badam)", hindi: "बादाम", category: "fruits", query: "almond nut badam", source: "Wikimedia Commons" },
  { id: "walnut", name: "Walnut", hindi: "अखरोट", category: "fruits", query: "walnut nut", source: "Wikimedia Commons" },
  { id: "pistachio", name: "Pistachio (Pista)", hindi: "पिस्ता", category: "fruits", query: "pistachio pista nut", source: "Wikimedia Commons" },
  { id: "tamarind", name: "Tamarind (Imli)", hindi: "इमली", category: "fruits", query: "tamarind fruit imli", source: "Wikimedia Commons" },
  { id: "mangosteen", name: "Mangosteen", hindi: "मंगوستीन", category: "fruits", query: "mangosteen fruit", source: "Wikimedia Commons" },
  { id: "dragon-fruit", name: "Dragon Fruit", hindi: "ड्रैगन फ्रूट", category: "fruits", query: "dragon fruit pitaya", source: "Wikimedia Commons" },
  { id: "star-fruit", name: "Star Fruit (Kamrakh)", hindi: "कमरख", category: "fruits", query: "star fruit carambola", source: "Wikimedia Commons" },
  { id: "lichi", name: "Litchi", hindi: "लीची", category: "fruits", query: "lychee litchi fruit", source: "Wikimedia Commons" },
  { id: "mousambi", name: "Mousambi (Sweet Lime)", hindi: "मौसमी", category: "fruits", query: "sweet lime mosambi fruit", source: "Wikimedia Commons" },
  { id: "kinnow", name: "Kinnow", hindi: "किन्नू", category: "fruits", query: "kinnow fruit", source: "Wikimedia Commons" },
  { id: "sweet-pumpkin", name: "Sweet Pumpkin", hindi: "मीठा कद्दू", category: "fruits", query: "sweet pumpkin fruit", source: "Wikimedia Commons" },

  // ---------- Grains ----------
  { id: "wheat", name: "Wheat", hindi: "गेहूँ", category: "grains", query: "wheat grain ear", source: "Wikimedia Commons" },
  { id: "rice", name: "Rice (Paddy)", hindi: "चावल / धान", category: "grains", query: "rice paddy grain", source: "Wikimedia Commons" },
  { id: "maize", name: "Maize (Corn)", hindi: "मक्का", category: "grains", query: "maize corn grain", source: "Wikimedia Commons" },
  { id: "bajra", name: "Bajra (Pearl Millet)", hindi: "बाजरा", category: "grains", query: "pearl millet bajra grain", source: "Wikimedia Commons" },
  { id: "jowar", name: "Jowar (Sorghum)", hindi: "ज्वार", category: "grains", query: "sorghum jowar grain", source: "Wikimedia Commons" },
  { id: "barley", name: "Barley (Jau)", hindi: "जौ", category: "grains", query: "barley grain jau", source: "Wikimedia Commons" },
  { id: "ragi", name: "Ragi (Finger Millet)", hindi: "रागी", category: "grains", query: "finger millet ragi grain", source: "Wikimedia Commons" },
  { id: "paddy", name: "Paddy (Rice)", hindi: "धान", category: "grains", query: "paddy rice field grain", source: "Wikimedia Commons" },
  { id: "millets", name: "Millets", hindi: "बाजरा", category: "grains", query: "millet grains", source: "Wikimedia Commons" },
  { id: "foxtail-millet", name: "Foxtail Millet", hindi: "कांगनी", category: "grains", query: "foxtail millet grain", source: "Wikimedia Commons" },
  { id: "kodo-millet", name: "Kodo Millet", hindi: "कोदो", category: "grains", query: "kodo millet grain", source: "Wikimedia Commons" },
  { id: "little-millet", name: "Little Millet", hindi: "कुटकी", category: "grains", query: "little millet grain", source: "Wikimedia Commons" },
  { id: "proso-millet", name: "Proso Millet", hindi: "चेना", category: "grains", query: "proso millet grain", source: "Wikimedia Commons" },
  { id: "barnyard-millet", name: "Barnyard Millet", hindi: "सांवा", category: "grains", query: "barnyard millet grain", source: "Wikimedia Commons" },
  { id: "browntop-millet", name: "Browntop Millet", hindi: "हरी कंगनी", category: "grains", query: "browntop millet grain", source: "Wikimedia Commons" },
  { id: "sajje", name: "Sajje (Pearl Millet)", hindi: "सज्जे", category: "grains", query: "pearl millet grain", source: "Wikimedia Commons" },
  { id: "quinoa", name: "Quinoa", hindi: "क्विनोआ", category: "grains", query: "quinoa grain", source: "Wikimedia Commons" },

  // ---------- Pulses ----------
  { id: "moong", name: "Green Gram (Moong)", hindi: "मूंग", category: "pulses", query: "mung bean green gram", source: "Wikimedia Commons" },
  { id: "urad", name: "Black Gram (Urad)", hindi: "उड़द", category: "pulses", query: "black gram urad bean", source: "Wikimedia Commons" },
  { id: "masur", name: "Lentil (Masur)", hindi: "मसूर", category: "pulses", query: "lentil masur bean", source: "Wikimedia Commons" },
  { id: "chana", name: "Bengal Gram (Chana)", hindi: "चना", category: "pulses", query: "chickpea bengal gram chana", source: "Wikimedia Commons" },
  { id: "arhar", name: "Red Gram (Arhar/Tur)", hindi: "अरहर", category: "pulses", query: "pigeon pea arhar tur dal", source: "Wikimedia Commons" },
  { id: "tur", name: "Tur (Pigeon Pea)", hindi: "तूर", category: "pulses", query: "pigeon pea arhar tur", source: "Wikimedia Commons" },
  { id: "soybean", name: "Soybean", hindi: "सोयाबीन", category: "pulses", query: "soybean plant bean", source: "Wikimedia Commons" },
  { id: "groundnut", name: "Groundnut (Peanut)", hindi: "मूंगफली", category: "pulses", query: "groundnut peanut pod", source: "Wikimedia Commons" },
  { id: "peas", name: "Peas", hindi: "मटर", category: "pulses", query: "green peas pod", source: "Wikimedia Commons" },
  { id: "cowpea", name: "Cowpea (Lobia)", hindi: "लोबिया", category: "pulses", query: "cowpea lobia bean", source: "Wikimedia Commons" },
  { id: "kidney-beans", name: "Kidney Beans (Rajma)", hindi: "राजमा", category: "pulses", query: "kidney beans rajma", source: "Wikimedia Commons" },
  { id: "lobia", name: "Lobia (Cowpea)", hindi: "लोबिया", category: "pulses", query: "lobia cowpea bean", source: "Wikimedia Commons" },
  { id: "matki", name: "Mataki (Moth Bean)", hindi: "मटकी", category: "pulses", query: "moth bean matki", source: "Wikimedia Commons" },
  { id: "kulthi", name: "Kulthi (Horse Gram)", hindi: "कुलथी", category: "pulses", query: "horse gram kulthi bean", source: "Wikimedia Commons" },
  { id: "masur-dal", name: "Masur Dal", hindi: "मसूर दाल", category: "pulses", query: "red lentil dal masur", source: "Wikimedia Commons" },
  { id: "moong-dal", name: "Moong Dal", hindi: "मूंग दाल", category: "pulses", query: "moong dal yellow lentil", source: "Wikimedia Commons" },
  { id: "chana-dal", name: "Chana Dal", hindi: "चना दाल", category: "pulses", query: "chana dal split chickpea", source: "Wikimedia Commons" },
  { id: "arhar-dal", name: "Arhar Dal (Tur Dal)", hindi: "अरहर दाल", category: "pulses", query: "toor dal arhar dal", source: "Wikimedia Commons" },
  { id: "soyabean", name: "Soyabean", hindi: "सोयाबीन", category: "pulses", query: "soybean bean", source: "Wikimedia Commons" },

  // ---------- Spices ----------
  { id: "turmeric", name: "Turmeric", hindi: "हल्दी", category: "spices", query: "turmeric rhizome root", source: "Wikimedia Commons" },
  { id: "dry-chilli", name: "Dry Chilli", hindi: "सूखी मिर्च", category: "spices", query: "dried red chilli pepper spice", source: "Wikimedia Commons" },
  { id: "cumin", name: "Cumin (Jeera)", hindi: "जीरा", category: "spices", query: "cumin jeera seeds spice", source: "Wikimedia Commons" },
  { id: "coriander", name: "Coriander (Dhania)", hindi: "धनिया", category: "spices", query: "coriander seeds dhania", source: "Wikimedia Commons" },
  { id: "mustard", name: "Mustard (Sarson)", hindi: "सरसों", category: "spices", query: "mustard seeds sarson spice", source: "Wikimedia Commons" },
  { id: "black-pepper", name: "Black Pepper", hindi: "काली मिर्च", category: "spices", query: "black pepper spice", source: "Wikimedia Commons" },
  { id: "cardamom", name: "Cardamom", hindi: "इलायची", category: "spices", query: "cardamom elaichi spice", source: "Wikimedia Commons" },
  { id: "fenugreek", name: "Fenugreek (Methi)", hindi: "मेथी", category: "spices", query: "fenugreek methi seeds spice", source: "Wikimedia Commons" },
  { id: "asafoetida", name: "Asafoetida (Hing)", hindi: "हींग", category: "spices", query: "asafoetida hing resin spice", source: "Wikimedia Commons" },
  { id: "fennel", name: "Fennel (Saunf)", hindi: "सौंफ", category: "spices", query: "fennel saunf seeds spice", source: "Wikimedia Commons" },
  { id: "cloves", name: "Cloves (Laung)", hindi: "लौंग", category: "spices", query: "cloves laung spice", source: "Wikimedia Commons" },
  { id: "cinnamon", name: "Cinnamon (Dalchini)", hindi: "दालचीनी", category: "spices", query: "cinnamon dalchini spice", source: "Wikimedia Commons" },
  { id: "nutmeg", name: "Nutmeg (Jaiphal)", hindi: "जायफल", category: "spices", query: "nutmeg jaiphal spice", source: "Wikimedia Commons" },
  { id: "mace", name: "Mace (Javitri)", hindi: "जावित्री", category: "spices", query: "mace javitri spice", source: "Wikimedia Commons" },
  { id: "bay-leaf", name: "Bay Leaf (Tejpatta)", hindi: "तेजपत्ता", category: "spices", query: "bay leaf tejpatta spice", source: "Wikimedia Commons" },
  { id: "ajwain", name: "Ajwain (Carom)", hindi: "अजवाइन", category: "spices", query: "Trachyspermum ammi", source: "Wikimedia Commons" },
  { id: "coriander-seed", name: "Coriander Seed (Dhania)", hindi: "धनिया", category: "spices", query: "coriander seeds dhania spice", source: "Wikimedia Commons" },
  { id: "poppy-seed", name: "Poppy Seed (Khus Khus)", hindi: "खसखस", category: "spices", query: "poppy seed khus khus spice", source: "Wikimedia Commons" },
  { id: "nigella", name: "Nigella (Kalonji)", hindi: "कलौंजी", category: "spices", query: "Nigella sativa seeds", source: "Wikimedia Commons" },
  { id: "celery-seed", name: "Celery Seed (Ajmod)", hindi: "अजमोद", category: "spices", query: "Apium graveolens seeds", source: "Wikimedia Commons" },
  { id: "dill-seed", name: "Dill Seed (Suva)", hindi: "सुवा", category: "spices", query: "Anethum graveolens seed", source: "Wikimedia Commons" },
];

// Duplicate id entries (same image, different AGMARKNET spelling variants) are
// resolved at runtime by the normalizer; they share one image file.
const ALIAS_MAP = {
  // Common mandi / Hindi transliterations
  "aloo": "potato",
  "aaloo": "potato",
  "alu": "potato",
  "aal": "potato",
  "आलू": "potato",
  "baingan": "brinjal",
  "बैंगन": "brinjal",
  "baigan": "brinjal",
  "kheera": "cucumber",
  "khira": "cucumber",
  "खीरा": "cucumber",
  "kakdi": "cucumber",
  // vegetables aliases
  "ladies finger": "okra",
  "bhindi": "okra",
  "eggplant": "brinjal",
  "aubergine": "brinjal",
  "green chili": "green-chilli",
  "green chilly": "green-chilli",
  "shimla mirch": "capsicum",
  "bell pepper": "capsicum",
  "sweet pepper": "capsicum",
  "lauki": "bottle-gourd",
  "dudhi": "bottle-gourd",
  "karela": "bitter-gourd",
  "parwal": "pointed-gourd",
  "kundru": "little-gourd",
  "tinda": "round-gourd",
  "arbi": "colocasia",
  "suran": "elephant-yam",
  "jimikand": "elephant-yam",
  "guar": "cluster-beans",
  "gawar": "cluster-beans",
  "moringa": "drumstick",
  "shegva": "drumstick",
  "chilli": "green-chilli",
  "chili": "green-chilli",
  "mirch": "green-chilli",
  "hari mirch": "green-chilli",
  // fruits aliases
  "kela": "banana",
  "aam": "mango",
  "seb": "apple",
  "amrood": "guava",
  "angoor": "grapes",
  "anar": "pomegranate",
  "papita": "papaya",
  "santra": "orange",
  "tarbooj": "watermelon",
  "kharbooj": "muskmelon",
  "nimbu": "lemon",
  "sitaphal": "custard-apple",
  "kathal": "jackfruit",
  "ananas": "pineapple",
  "chiku": "chikoo",
  "nashpati": "pear",
  "aaloobukhara": "plum",
  "aadu": "peach",
  "khubani": "apricot",
  "anjeer": "fig",
  "khajoor": "date",
  "aamla": "amla",
  "bael": "wood-apple",
  "narial": "coconut",
  "supari": "arecanut",
  "kaju": "cashew",
  "badam": "almond",
  "akhrot": "walnut",
  "pista": "pistachio",
  "imli": "tamarind",
  "nellikai": "amla",
  "dragon fruit": "dragon-fruit",
  "kamrakh": "star-fruit",
  "lichi": "lichi",
  "lychee": "lichi",
  "mosambi": "mousambi",
  "sweet lime": "mousambi",
  "kinnoo": "kinnow",
  // grains aliases
  "gehun": "wheat",
  "chawal": "rice",
  "dhan": "paddy",
  "makka": "maize",
  "bajra": "bajra",
  "jwar": "jowar",
  "jau": "barley",
  "nachni": "ragi",
  "madua": "ragi",
  "bajri": "bajra",
  "jola": "jowar",
  // pulses aliases
  "mung": "moong",
  "moong bean": "moong",
  "udid": "urad",
  "urad bean": "urad",
  "masoor": "masur",
  "lentil": "masur",
  "chole": "chana",
  "channa": "chana",
  "gram": "chana",
  "kabuli chana": "chana",
  "chickpea": "chana",
  "tur dal": "arhar",
  "toor": "arhar",
  "arhar dal": "arhar",
  "red gram": "arhar",
  "pigeon pea": "arhar",
  "soya bean": "soybean",
  "moong dal": "moong-dal",
  "masur dal": "masur-dal",
  "chana dal": "chana-dal",
  "rajma": "kidney-beans",
  "lobia": "lobia",
  "moth": "matki",
  "horse gram": "kulthi",
  "kulth": "kulthi",
  "ground nut": "groundnut",
  "peanut": "groundnut",
  // spices aliases
  "haldi": "turmeric",
  "sabut lal mirch": "dry-chilli",
  "lal mirch": "dry-chilli",
  "jeera": "cumin",
  "dhania": "coriander",
  "dhaniya": "coriander",
  "sarson": "mustard",
  "rai": "mustard",
  "kali mirch": "black-pepper",
  "golu mirch": "black-pepper",
  "elaichi": "cardamom",
  "ilaichi": "cardamom",
  "methi": "fenugreek",
  "hing": "asafoetida",
  "saunf": "fennel",
  "laung": "cloves",
  "dalchini": "cinnamon",
  "jaiphal": "nutmeg",
  "javitri": "mace",
  "tejpatta": "bay-leaf",
  "ajmo": "ajwain",
  "kalonji": "nigella",
  "khas khas": "poppy-seed",
  "suva": "dill-seed",
  "ajmod": "celery-seed",
};

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("en-IN")
    // Keep Unicode letters (incl. Devanagari) while dropping punctuation.
    .replace(/[^\p{L}0-9\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveId(commodity) {
  const key = normalizeKey(commodity);
  if (!key) return null;
  // Direct id match
  const direct = COMMODITY_IMAGE_MAP.find((c) => c.id === key);
  if (direct) return direct.id;
  // Name-based match (English name or Hindi name)
  const byName = COMMODITY_IMAGE_MAP.find(
    (c) =>
      normalizeKey(c.name) === key ||
      key.includes(normalizeKey(c.name)) ||
      (c.hindi && normalizeKey(c.hindi) === key) ||
      (c.hindi && key.includes(normalizeKey(c.hindi))),
  );
  if (byName) return byName.id;
  // Alias (exact or substring match so "Bhindi(Ladies Finger)" -> "bhindi")
  for (const [alias, target] of Object.entries(ALIAS_MAP)) {
    if (key === alias || key.includes(alias) || alias.includes(key)) return target;
  }
  return null;
}

export {
  COMMODITY_IMAGE_MAP,
  ALIAS_MAP,
  CATEGORIES,
  resolveId,
  normalizeKey,
};