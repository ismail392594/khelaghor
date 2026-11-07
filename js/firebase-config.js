// Firebase প্রজেক্ট: khelaghor-160
// এই তথ্য গোপন না, ওয়েবসাইটে থাকার জন্যই বানানো। নিরাপত্তা আসে firestore.rules থেকে।
export const firebaseConfig = {
  apiKey: "AIzaSyDSg-ozPr4QxO1kun5gdG8S13XBHE1mFGM",
  authDomain: "khelaghor-160.firebaseapp.com",
  projectId: "khelaghor-160",
  storageBucket: "khelaghor-160.firebasestorage.app",
  messagingSenderId: "806268108252",
  appId: "1:806268108252:web:ef8f9e10dbc80c610ea319"
};

// অ্যাডমিন প্যানেলে ঢুকতে পারবে এই Gmail গুলো (firestore.rules-এও একই তালিকা রাখতে হবে)
export const ADMIN_EMAILS = ["ismail392594@gmail.com"];

// পয়েন্টের নিয়ম
export const START_POINTS = 500;
export const DAILY_BONUS = 100;

// ---- আয় ----
// Google AdSense অনুমোদন পেলে এখানে আপনার Publisher ID বসান, যেমন "ca-pub-1234567890123456"
// খালি থাকলে কোনো বিজ্ঞাপন দেখাবে না।
export const ADSENSE_CLIENT = "";
export const ADSENSE_SLOT = "";      // AdSense-এ বানানো Display ad unit-এর slot নম্বর
// বিজ্ঞাপন ছাড়া প্রিমিয়াম প্ল্যানের দাম (টাকা/মাস)
export const PREMIUM_PRICE = 49;
