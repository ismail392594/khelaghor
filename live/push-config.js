// লাইভ স্কোর: ফোনে নোটিফিকেশনের জন্য Firebase-এর Web Push "public key" (গোপন নয়, সবাই দেখতে পারে)।
// Firebase Console → Project settings → Cloud Messaging → Web Push certificates → Generate key pair থেকে পাওয়া লম্বা লেখা।
// খালি থাকলে নোটিফিকেশনের বোতাম দেখায় না।
export const VAPID_KEY = '';
