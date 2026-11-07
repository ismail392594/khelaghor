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
