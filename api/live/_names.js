// লাইভ স্কোর: বাংলা নামের ভাণ্ডার (শুধু তথ্য, কোনো হিসাব নেই)। দল, ক্লাব, প্রতিযোগিতার নাম
// বাংলাদেশের পত্রিকায় যেভাবে লেখা হয় সেভাবে। নতুন নাম যোগ করতে শুধু এই ফাইলে একটা লাইন বাড়ান।
// চাবি সব ছোট হাতের ইংরেজি; ক্লাবের চাবিতে FC/CF/AFC আর দাগ-চিহ্ন বাদ (যেমন "Al-Nassr FC" → "al nassr")।

// আরও দেশ: [পতাকার কোড, বাংলা নাম]
export const MORE_C = {
  'armenia': ['am', 'আর্মেনিয়া'], 'azerbaijan': ['az', 'আজারবাইজান'], 'cyprus': ['cy', 'সাইপ্রাস'], 'lithuania': ['lt', 'লিথুয়ানিয়া'],
  'latvia': ['lv', 'লাটভিয়া'], 'estonia': ['ee', 'এস্তোনিয়া'], 'malta': ['mt', 'মাল্টা'], 'luxembourg': ['lu', 'লুক্সেমবার্গ'],
  'bulgaria': ['bg', 'বুলগেরিয়া'], 'belarus': ['by', 'বেলারুশ'], 'moldova': ['md', 'মলদোভা'], 'kosovo': ['xk', 'কসোভো'],
  'andorra': ['ad', 'অ্যান্ডোরা'], 'san marino': ['sm', 'সান মারিনো'], 'liechtenstein': ['li', 'লিখটেনস্টাইন'], 'gibraltar': ['gi', 'জিব্রাল্টার'],
  'faroe islands': ['fo', 'ফ্যারো দ্বীপপুঞ্জ'], 'republic of ireland': ['ie', 'আয়ারল্যান্ড'], 'rep. of ireland': ['ie', 'আয়ারল্যান্ড'],
  'bosnia & herzegovina': ['ba', 'বসনিয়া'], 'bosnia': ['ba', 'বসনিয়া'], 'ir iran': ['ir', 'ইরান'], 'korea dpr': ['kp', 'উত্তর কোরিয়া'],
  'chinese taipei': ['tw', 'চাইনিজ তাইপে'], 'taiwan': ['tw', 'তাইওয়ান'], 'mongolia': ['mn', 'মঙ্গোলিয়া'], 'cambodia': ['kh', 'কম্বোডিয়া'],
  'laos': ['la', 'লাওস'], 'brunei': ['bn', 'ব্রুনাই'], 'macau': ['mo', 'ম্যাকাও'], 'macao': ['mo', 'ম্যাকাও'], 'guam': ['gu', 'গুয়াম'],
  'timor leste': ['tl', 'পূর্ব তিমুর'], 'turkmenistan': ['tm', 'তুর্কমেনিস্তান'], 'japan': ['jp', 'জাপান'],
  'rwanda': ['rw', 'রুয়ান্ডা'], 'tanzania': ['tz', 'তানজানিয়া'], 'ethiopia': ['et', 'ইথিওপিয়া'], 'sudan': ['sd', 'সুদান'],
  'south sudan': ['ss', 'দক্ষিণ সুদান'], 'libya': ['ly', 'লিবিয়া'], 'guinea': ['gn', 'গিনি'], 'guinea bissau': ['gw', 'গিনি-বিসাউ'],
  'equatorial guinea': ['gq', 'ইকুয়েটোরিয়াল গিনি'], 'togo': ['tg', 'টোগো'], 'benin': ['bj', 'বেনিন'], 'niger': ['ne', 'নাইজার'],
  'angola': ['ao', 'অ্যাঙ্গোলা'], 'mozambique': ['mz', 'মোজাম্বিক'], 'botswana': ['bw', 'বতসোয়ানা'], 'malawi': ['mw', 'মালাউই'],
  'madagascar': ['mg', 'মাদাগাস্কার'], 'mauritania': ['mr', 'মৌরিতানিয়া'], 'mauritius': ['mu', 'মরিশাস'], 'gambia': ['gm', 'গাম্বিয়া'],
  'sierra leone': ['sl', 'সিয়েরা লিওন'], 'liberia': ['lr', 'লাইবেরিয়া'], 'lesotho': ['ls', 'লেসোথো'], 'eswatini': ['sz', 'এসওয়াতিনি'],
  'burundi': ['bi', 'বুরুন্ডি'], 'comoros': ['km', 'কমোরোস'], 'somalia': ['so', 'সোমালিয়া'], 'djibouti': ['dj', 'জিবুতি'],
  'gabon': ['ga', 'গ্যাবন'], 'chad': ['td', 'চাদ'], 'congo': ['cg', 'কঙ্গো'], 'central africa': ['cf', 'মধ্য আফ্রিকা'],
  'central african republic': ['cf', 'মধ্য আফ্রিকা'], 'seychelles': ['sc', 'সেশেলস'], 'south africa': ['za', 'দক্ষিণ আফ্রিকা'],
  'suriname': ['sr', 'সুরিনাম'], 'guyana': ['gy', 'গায়ানা'], 'guatemala': ['gt', 'গুয়াতেমালা'], 'nicaragua': ['ni', 'নিকারাগুয়া'],
  'cuba': ['cu', 'কিউবা'], 'dominican republic': ['do', 'ডোমিনিকান প্রজাতন্ত্র'], 'puerto rico': ['pr', 'পুয়ের্তো রিকো'],
  'bermuda': ['bm', 'বারমুডা'], 'cayman islands': ['ky', 'কেম্যান দ্বীপপুঞ্জ'], 'barbados': ['bb', 'বার্বাডোজ'], 'belize': ['bz', 'বেলিজ'],
  'grenada': ['gd', 'গ্রেনাডা'], 'sint maarten': ['sx', 'সিন্ট মার্টেন'], 'anguilla': ['ai', 'অ্যাঙ্গুইলা'], 'aruba': ['aw', 'আরুবা'],
  'bahamas': ['bs', 'বাহামা'], 'vanuatu': ['vu', 'ভানুয়াতু'], 'samoa': ['ws', 'সামোয়া'], 'solomon islands': ['sb', 'সলোমন দ্বীপপুঞ্জ'],
  'tahiti': ['pf', 'তাহিতি'], 'saudi arabia': ['sa', 'সৌদি আরব'], 'south korea': ['kr', 'দক্ষিণ কোরিয়া'], 'costa rica': ['cr', 'কোস্টারিকা']
};

// ক্লাব, ফ্র্যাঞ্চাইজি আর রাজ্য দল
export const CLUBS = {
  // ইংল্যান্ড
  'manchester city': 'ম্যানচেস্টার সিটি', 'manchester united': 'ম্যানচেস্টার ইউনাইটেড', 'liverpool': 'লিভারপুল', 'arsenal': 'আর্সেনাল',
  'chelsea': 'চেলসি', 'tottenham': 'টটেনহ্যাম', 'newcastle': 'নিউক্যাসল', 'aston villa': 'অ্যাস্টন ভিলা', 'west ham': 'ওয়েস্ট হ্যাম',
  'brighton': 'ব্রাইটন', 'everton': 'এভারটন', 'fulham': 'ফুলহ্যাম', 'crystal palace': 'ক্রিস্টাল প্যালেস', 'brentford': 'ব্রেন্টফোর্ড',
  'wolves': 'উলভস', 'nottingham forest': 'নটিংহ্যাম ফরেস্ট', 'bournemouth': 'বোর্নমাউথ', 'leicester': 'লেস্টার সিটি', 'leeds': 'লিডস ইউনাইটেড',
  'southampton': 'সাউদাম্পটন', 'burnley': 'বার্নলি', 'sunderland': 'সান্ডারল্যান্ড', 'ipswich': 'ইপসউইচ', 'sheffield utd': 'শেফিল্ড ইউনাইটেড',
  // স্পেন
  'real madrid': 'রিয়াল মাদ্রিদ', 'barcelona': 'বার্সেলোনা', 'atletico madrid': 'আতলেতিকো মাদ্রিদ', 'sevilla': 'সেভিয়া', 'valencia': 'ভ্যালেন্সিয়া',
  'villarreal': 'ভিয়ারিয়াল', 'real sociedad': 'রিয়াল সোসিয়েদাদ', 'athletic club': 'অ্যাথলেটিক বিলবাও', 'real betis': 'রিয়াল বেতিস',
  'girona': 'জিরোনা', 'celta vigo': 'সেল্তা ভিগো', 'getafe': 'গেতাফে', 'osasuna': 'ওসাসুনা', 'mallorca': 'মায়োর্কা', 'alaves': 'আলাভেস',
  'leganes': 'লেগানেস', 'eibar': 'এইবার', 'espanyol': 'এস্পানিওল', 'rayo vallecano': 'রায়ো ভায়েকানো', 'las palmas': 'লাস পালমাস',
  'valladolid': 'ভায়াদোলিদ', 'albacete': 'আলবাসেতে', 'levante': 'লেভান্তে', 'elche': 'এলচে', 'oviedo': 'রিয়াল ওভিয়েদো',
  // ইতালি
  'juventus': 'জুভেন্টাস', 'inter': 'ইন্টার মিলান', 'inter milano': 'ইন্টার মিলান', 'inter milan': 'ইন্টার মিলান', 'ac milan': 'এসি মিলান',
  'napoli': 'নাপোলি', 'as roma': 'রোমা', 'roma': 'রোমা', 'lazio': 'লাৎসিও', 'atalanta': 'আতালান্তা', 'fiorentina': 'ফিওরেন্তিনা',
  'bologna': 'বোলোনিয়া', 'torino': 'তোরিনো',
  // জার্মানি
  'bayern munich': 'বায়ার্ন মিউনিখ', 'bayern munchen': 'বায়ার্ন মিউনিখ', 'borussia dortmund': 'বরুসিয়া ডর্টমুন্ড',
  'bayer leverkusen': 'বায়ার লেভারকুসেন', 'rb leipzig': 'আরবি লাইপজিগ', 'eintracht frankfurt': 'আইনট্রাখট ফ্রাঙ্কফুর্ট',
  'vfl wolfsburg': 'ভলফসবুর্গ', 'vfb stuttgart': 'স্টুটগার্ট', 'borussia monchengladbach': 'মনশেনগ্লাডবাখ', 'werder bremen': 'ভের্ডার ব্রেমেন',
  'sc freiburg': 'ফ্রাইবুর্গ', 'union berlin': 'ইউনিয়ন বার্লিন',
  // ফ্রান্স আর বাকি ইউরোপ
  'paris saint germain': 'পিএসজি', 'marseille': 'মার্শেই', 'lyon': 'লিওঁ', 'monaco': 'মোনাকো', 'lille': 'লিল', 'nice': 'নিস', 'lens': 'লঁস',
  'rennes': 'রেন', 'paris': 'প্যারিস এফসি', 'ajax': 'আয়াক্স', 'psv eindhoven': 'পিএসভি', 'feyenoord': 'ফেইনুর্ড', 'benfica': 'বেনফিকা',
  'porto': 'পোর্তো', 'sporting cp': 'স্পোর্টিং লিসবন', 'celtic': 'সেল্টিক', 'rangers': 'রেঞ্জার্স', 'galatasaray': 'গালাতাসারাই',
  'fenerbahce': 'ফেনারবাচে', 'besiktas': 'বেসিকতাস', 'hacken': 'হ্যাকেন',
  // সৌদি, আমেরিকা, দক্ষিণ আমেরিকা
  'al nassr': 'আল নাসর', 'al hilal saudi': 'আল হিলাল', 'al hilal': 'আল হিলাল', 'al ittihad': 'আল ইত্তিহাদ', 'al ahli jeddah': 'আল আহলি',
  'inter miami': 'ইন্টার মায়ামি', 'los angeles galaxy': 'এলএ গ্যালাক্সি', 'flamengo': 'ফ্ল্যামেঙ্গো', 'palmeiras': 'পালমেইরাস',
  'santos': 'সান্তোস', 'corinthians': 'করিন্থিয়ান্স', 'sao paulo': 'সাও পাওলো', 'fluminense': 'ফ্লুমিনেন্স', 'botafogo': 'বোতাফোগো',
  'gremio': 'গ্রেমিও', 'boca juniors': 'বোকা জুনিয়র্স', 'river plate': 'রিভার প্লেট',
  // বাংলাদেশ আর ভারতের ফুটবল
  'bashundhara kings': 'বসুন্ধরা কিংস', 'abahani limited dhaka': 'ঢাকা আবাহনী', 'dhaka abahani': 'ঢাকা আবাহনী', 'abahani': 'আবাহনী',
  'mohammedan dhaka': 'ঢাকা মোহামেডান', 'mohammedan sc': 'মোহামেডান', 'sheikh jamal': 'শেখ জামাল ধানমন্ডি', 'fortis': 'ফর্টিস এফসি',
  'bangladesh police': 'বাংলাদেশ পুলিশ', 'rahmatgonj': 'রহমতগঞ্জ', 'brothers union': 'ব্রাদার্স ইউনিয়ন',
  'mohun bagan': 'মোহনবাগান', 'east bengal': 'ইস্ট বেঙ্গল', 'kerala blasters': 'কেরালা ব্লাস্টার্স', 'mumbai city': 'মুম্বাই সিটি', 'bengaluru': 'বেঙ্গালুরু এফসি',

  // ক্রিকেট: আইপিএল
  'chennai super kings': 'চেন্নাই সুপার কিংস', 'mumbai indians': 'মুম্বাই ইন্ডিয়ান্স', 'royal challengers bengaluru': 'রয়্যাল চ্যালেঞ্জার্স বেঙ্গালুরু',
  'royal challengers bangalore': 'রয়্যাল চ্যালেঞ্জার্স বেঙ্গালুরু', 'kolkata knight riders': 'কলকাতা নাইট রাইডার্স', 'sunrisers hyderabad': 'সানরাইজার্স হায়দরাবাদ',
  'rajasthan royals': 'রাজস্থান রয়্যালস', 'delhi capitals': 'দিল্লি ক্যাপিটালস', 'punjab kings': 'পাঞ্জাব কিংস', 'lucknow super giants': 'লক্ষ্ণৌ সুপার জায়ান্টস',
  'gujarat titans': 'গুজরাট টাইটান্স',
  // বিপিএল আর দেশের ঘরোয়া ক্রিকেট
  'dhaka capitals': 'ঢাকা ক্যাপিটালস', 'rangpur riders': 'রংপুর রাইডার্স', 'fortune barishal': 'ফরচুন বরিশাল', 'chittagong kings': 'চিটাগং কিংস',
  'khulna tigers': 'খুলনা টাইগার্স', 'sylhet strikers': 'সিলেট স্ট্রাইকার্স', 'durbar rajshahi': 'দুর্বার রাজশাহী', 'comilla victorians': 'কুমিল্লা ভিক্টোরিয়ান্স',
  'rajshahi warriors': 'রাজশাহী ওয়ারিয়র্স', 'sylhet titans': 'সিলেট টাইটান্স', 'noakhali express': 'নোয়াখালী এক্সপ্রেস', 'chattogram royals': 'চট্টগ্রাম রয়্যালস',
  'dhaka division': 'ঢাকা বিভাগ', 'dhaka metropolis': 'ঢাকা মেট্রো', 'rangpur division': 'রংপুর বিভাগ', 'khulna division': 'খুলনা বিভাগ',
  'rajshahi division': 'রাজশাহী বিভাগ', 'sylhet division': 'সিলেট বিভাগ', 'barisal division': 'বরিশাল বিভাগ', 'chittagong division': 'চট্টগ্রাম বিভাগ',
  'mymensingh division': 'ময়মনসিংহ বিভাগ', 'abahani limited': 'আবাহনী লিমিটেড', 'mohammedan sporting club': 'মোহামেডান স্পোর্টিং ক্লাব',
  'legends of rupganj': 'লিজেন্ডস অব রূপগঞ্জ', 'prime bank cricket club': 'প্রাইম ব্যাংক', 'gazi group cricketers': 'গাজী গ্রুপ ক্রিকেটার্স',
  // বিগ ব্যাশ আর অস্ট্রেলিয়ার রাজ্য দল
  'adelaide strikers': 'অ্যাডিলেড স্ট্রাইকার্স', 'brisbane heat': 'ব্রিসবেন হিট', 'hobart hurricanes': 'হোবার্ট হারিকেন্স',
  'melbourne renegades': 'মেলবোর্ন রেনেগেডস', 'melbourne stars': 'মেলবোর্ন স্টার্স', 'perth scorchers': 'পার্থ স্কর্চার্স',
  'sydney sixers': 'সিডনি সিক্সার্স', 'sydney thunder': 'সিডনি থান্ডার', 'new south wales': 'নিউ সাউথ ওয়েলস', 'victoria': 'ভিক্টোরিয়া',
  'queensland': 'কুইন্সল্যান্ড', 'south australia': 'সাউথ অস্ট্রেলিয়া', 'western australia': 'ওয়েস্টার্ন অস্ট্রেলিয়া', 'tasmania': 'তাসমানিয়া',
  // পিএসএল
  'karachi kings': 'করাচি কিংস', 'lahore qalandars': 'লাহোর কালান্দার্স', 'islamabad united': 'ইসলামাবাদ ইউনাইটেড',
  'peshawar zalmi': 'পেশোয়ার জালমি', 'quetta gladiators': 'কোয়েটা গ্ল্যাডিয়েটর্স', 'multan sultans': 'মুলতান সুলতানস',
  // আবুধাবি টি-১০
  'arabian aces': 'অ্যারাবিয়ান এসেস', 'yas lions': 'ইয়াস লায়ন্স', 'royal desert champions': 'রয়্যাল ডেজার্ট চ্যাম্পিয়ন্স',
  'royal desert champs': 'রয়্যাল ডেজার্ট চ্যাম্পিয়ন্স', 'emirates eagles': 'এমিরেটস ঈগলস', 'united tigers': 'ইউনাইটেড টাইগার্স', 'uae bulls': 'ইউএই বুলস',
  // ভারতের রাজ্য দল (রঞ্জি, মুশতাক আলী, বিজয় হাজারে)
  'manipur': 'মণিপুর', 'meghalaya': 'মেঘালয়', 'gujarat': 'গুজরাট', 'uttarakhand': 'উত্তরাখণ্ড', 'jammu and kashmir': 'জম্মু ও কাশ্মীর',
  'saurashtra': 'সৌরাষ্ট্র', 'karnataka': 'কর্ণাটক', 'mizoram': 'মিজোরাম', 'madhya pradesh': 'মধ্যপ্রদেশ', 'tripura': 'ত্রিপুরা',
  'haryana': 'হরিয়ানা', 'tamil nadu': 'তামিলনাড়ু', 'goa': 'গোয়া', 'mumbai': 'মুম্বাই', 'baroda': 'বরোদা', 'uttar pradesh': 'উত্তরপ্রদেশ',
  'assam': 'আসাম', 'puducherry': 'পুদুচেরি', 'punjab': 'পাঞ্জাব', 'railways': 'রেলওয়েজ', 'hyderabad': 'হায়দরাবাদ', 'vidarbha': 'বিদর্ভ',
  'chandigarh': 'চণ্ডীগড়', 'rajasthan': 'রাজস্থান', 'himachal pradesh': 'হিমাচল প্রদেশ', 'maharashtra': 'মহারাষ্ট্র', 'nagaland': 'নাগাল্যান্ড',
  'sikkim': 'সিকিম', 'arunachal pradesh': 'অরুণাচল প্রদেশ', 'services': 'সার্ভিসেস', 'andhra': 'অন্ধ্র', 'kerala': 'কেরালা', 'bengal': 'বেঙ্গল',
  'jharkhand': 'ঝাড়খণ্ড', 'bihar': 'বিহার', 'delhi': 'দিল্লি', 'chhattisgarh': 'ছত্তিশগড়', 'odisha': 'ওড়িশা',
  // দক্ষিণ আফ্রিকা আর নিউজিল্যান্ডের ঘরোয়া দল
  'lions': 'লায়ন্স', 'titans': 'টাইটান্স', 'dolphins': 'ডলফিন্স', 'warriors': 'ওয়ারিয়র্স', 'knights': 'নাইটস', 'western province': 'ওয়েস্টার্ন প্রভিন্স',
  'boland': 'বোল্যান্ড', 'rocks boland': 'বোল্যান্ড রকস', 'north west': 'নর্থ ওয়েস্ট', 'auckland': 'অকল্যান্ড', 'wellington': 'ওয়েলিংটন',
  'canterbury': 'ক্যান্টারবেরি', 'otago': 'ওটাগো', 'central districts': 'সেন্ট্রাল ডিস্ট্রিক্টস', 'northern districts': 'নর্দার্ন ডিস্ট্রিক্টস'
};

// ফুটবল প্রতিযোগিতা: আমাদের জমানো নাম (দেশসহ হলে "Name (Country)") → বাংলা
export const FB_COMP = {
  'world cup': 'ফিফা বিশ্বকাপ', 'uefa champions league': 'উয়েফা চ্যাম্পিয়ন্স লিগ', 'uefa europa league': 'উয়েফা ইউরোপা লিগ',
  'uefa europa conference league': 'উয়েফা কনফারেন্স লিগ', 'uefa nations league': 'উয়েফা নেশনস লিগ', 'euro championship': 'ইউরো',
  'copa america': 'কোপা আমেরিকা', 'africa cup of nations': 'আফ্রিকা কাপ অব নেশনস', 'asian cup': 'এশিয়ান কাপ', 'friendlies': 'আন্তর্জাতিক প্রীতি ম্যাচ',
  'friendlies women': 'নারী দলের প্রীতি ম্যাচ', 'club friendlies': 'ক্লাব প্রীতি ম্যাচ', 'fifa club world cup': 'ফিফা ক্লাব বিশ্বকাপ',
  'afc champions league': 'এএফসি চ্যাম্পিয়ন্স লিগ', 'afc cup': 'এএফসি কাপ', 'afc challenge league': 'এএফসি চ্যালেঞ্জ লিগ',
  'concacaf gold cup': 'কনকাকাফ গোল্ড কাপ', 'saff championship': 'সাফ চ্যাম্পিয়নশিপ', 'uefa super cup': 'উয়েফা সুপার কাপ',
  'uefa champions league women': 'নারী চ্যাম্পিয়ন্স লিগ', 'uefa europa cup - women': 'নারী ইউরোপা কাপ', "caf women's champions league": 'আফ্রিকার নারী চ্যাম্পিয়ন্স লিগ',
  'caf champions league': 'আফ্রিকান চ্যাম্পিয়ন্স লিগ', 'conmebol libertadores': 'কোপা লিবার্তাদোরেস', 'conmebol sudamericana': 'কোপা সুদামেরিকানা',
  'premier league': 'ইংলিশ প্রিমিয়ার লিগ', 'la liga': 'স্প্যানিশ লা লিগা', 'serie a': 'ইতালিয়ান সিরি আ', 'bundesliga': 'জার্মান বুন্দেসলিগা',
  'ligue 1': 'ফরাসি লিগ ওয়ান', 'fa cup': 'এফএ কাপ', 'copa del rey': 'কোপা দেল রে', 'premier league international cup': 'প্রিমিয়ার লিগ ইন্টারন্যাশনাল কাপ',
  'championship (england)': 'ইংলিশ চ্যাম্পিয়নশিপ', 'league cup (england)': 'ইংলিশ লিগ কাপ', 'efl trophy (england)': 'ইএফএল ট্রফি (ইংল্যান্ড)',
  'coppa italia (italy)': 'কোপা ইতালিয়া', 'dfb pokal (germany)': 'জার্মান কাপ', 'coupe de france (france)': 'ফরাসি কাপ',
  'eredivisie (netherlands)': 'ডাচ লিগ', 'primeira liga (portugal)': 'পর্তুগিজ লিগ', 'super lig (turkey)': 'তুর্কি সুপার লিগ',
  'pro league (saudi arabia)': 'সৌদি প্রো লিগ', 'major league soccer (usa)': 'মেজর লিগ সকার', 'serie a (brazil)': 'ব্রাজিলিয়ান লিগ',
  'liga profesional argentina (argentina)': 'আর্জেন্টাইন লিগ', 'premier league (bangladesh)': 'বাংলাদেশ প্রিমিয়ার লিগ',
  'federation cup (bangladesh)': 'ফেডারেশন কাপ', 'indian super league (india)': 'ইন্ডিয়ান সুপার লিগ', 'i-league (india)': 'আই-লিগ'
};

// ক্রিকেট প্রতিযোগিতা (সাল বাদ দিয়ে নাম) → বাংলা
export const CR_COMP = {
  'syed mushtaq ali trophy': 'সৈয়দ মুশতাক আলী ট্রফি', 'syed mushtaq ali trophy elite': 'সৈয়দ মুশতাক আলী ট্রফি (এলিট)',
  'syed mushtaq ali trophy plate': 'সৈয়দ মুশতাক আলী ট্রফি (প্লেট)', 'ranji trophy': 'রঞ্জি ট্রফি', 'ranji trophy elite': 'রঞ্জি ট্রফি (এলিট)',
  'ranji trophy plate': 'রঞ্জি ট্রফি (প্লেট)', 'vijay hazare trophy': 'বিজয় হাজারে ট্রফি', 'duleep trophy': 'দুলীপ ট্রফি',
  'abu dhabi t10 league': 'আবুধাবি টি-১০ লিগ', 'abu dhabi t10': 'আবুধাবি টি-১০ লিগ', 'womens big bash league': 'নারী বিগ ব্যাশ লিগ',
  "women's big bash league": 'নারী বিগ ব্যাশ লিগ', 'big bash league': 'বিগ ব্যাশ লিগ', 'sheffield shield': 'শেফিল্ড শিল্ড',
  'one-day cup': 'অস্ট্রেলিয়ার ওয়ানডে কাপ', 'australia domestic one-day cup': 'অস্ট্রেলিয়ার ওয়ানডে কাপ', 'ford trophy': 'ফোর্ড ট্রফি',
  'plunket shield': 'প্লাঙ্কেট শিল্ড', 'super smash': 'সুপার স্ম্যাশ', 'csa t20 challenge': 'সিএসএ টি-টোয়েন্টি চ্যালেঞ্জ',
  'pro50 championship': 'প্রো-৫০ চ্যাম্পিয়নশিপ', "acc men's u19 asia cup": 'অনূর্ধ্ব-১৯ এশিয়া কাপ', 'asia cup': 'এশিয়া কাপ',
  "icc women's emerging nations trophy": 'আইসিসি নারী ইমার্জিং নেশনস ট্রফি', 'indian premier league': 'আইপিএল', 'bangladesh premier league': 'বিপিএল',
  'pakistan super league': 'পিএসএল', 'lanka premier league': 'লঙ্কা প্রিমিয়ার লিগ', 'caribbean premier league': 'সিপিএল', 'sa20': 'এসএ টোয়েন্টি',
  'international league t20': 'আইএল টি-টোয়েন্টি', 'the hundred': 'দ্য হান্ড্রেড', 'national cricket league': 'জাতীয় ক্রিকেট লিগ',
  'bangladesh cricket league': 'বাংলাদেশ ক্রিকেট লিগ', 'dhaka premier division cricket league': 'ঢাকা প্রিমিয়ার লিগ', 'nepal premier league': 'নেপাল প্রিমিয়ার লিগ',
  'icc cricket world cup': 'ওয়ানডে বিশ্বকাপ', "icc men's t20 world cup": 'টি-টোয়েন্টি বিশ্বকাপ', "icc women's t20 world cup": 'নারী টি-টোয়েন্টি বিশ্বকাপ',
  'icc champions trophy': 'চ্যাম্পিয়ন্স ট্রফি', 'icc world test championship': 'টেস্ট চ্যাম্পিয়নশিপ', "icc under-19 world cup": 'অনূর্ধ্ব-১৯ বিশ্বকাপ',
  // পর্বের নাম
  'regular season': 'লিগ পর্ব', 'play offs': 'প্লে-অফ', 'playoffs': 'প্লে-অফ', 'play-offs': 'প্লে-অফ', 'super eight': 'সুপার এইট', 'super eights': 'সুপার এইট',
  'super six': 'সুপার সিক্স', 'super four': 'সুপার ফোর', 'group stage': 'গ্রুপ পর্ব', 'knockout': 'নকআউট পর্ব', 'final': 'ফাইনাল', 'finals': 'ফাইনাল',
  'semi final': 'সেমিফাইনাল', 'semi finals': 'সেমিফাইনাল', 'quarter finals': 'কোয়ার্টার ফাইনাল', 'qualifier': 'কোয়ালিফায়ার', 'eliminator': 'এলিমিনেটর'
};
