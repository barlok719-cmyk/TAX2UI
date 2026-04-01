 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/app.js b/app.js
index 991029531ada35285eb14eb4494979e8a7847b1a..fd165438ba21abe6b490ae022fc588775fcf279c 100644
--- a/app.js
+++ b/app.js
@@ -1,173 +1,206 @@
-// 🔥 Firebase (НЕ module версия)
-importScripts = null;
+// Taxi V6 client logic
+// Fixes:
+// 1) deterministic Firebase script loading
+// 2) stable global handlers available immediately
+// 3) user-facing errors when initialization failed
 
-// Подключаем Firebase через window
-const script1 = document.createElement("script");
-script1.src = "https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js";
-document.head.appendChild(script1);
-
-const script2 = document.createElement("script");
-script2.src = "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js";
-document.head.appendChild(script2);
-
-script2.onload = init;
-
-function init(){
-
-const firebaseConfig = {
-  apiKey: "AIzaSyAJqUn_fc1gKZ1MLbApQaJoCZELBceAI1w",
-  authDomain: "eee2taxawaw.firebaseapp.com",
-  projectId: "eee2taxawaw"
-};
-
-firebase.initializeApp(firebaseConfig);
-const db = firebase.firestore();
-
-// ================= STATE =================
+let db = null;
 let user = null;
 let role = null;
-let cooldown = {};
-let priceCache = {};
+const cooldown = {};
+let appReady = false;
+
+function notify(msg) {
+  if (window.vkBridge && typeof window.vkBridge.send === "function") {
+    window.vkBridge.send("VKWebAppShowMessageBox", {
+      title: "Taxi V6",
+      message: msg,
+    }).catch(() => {});
+  } else {
+    alert(msg);
+  }
+}
 
-// ================= VK =================
-async function initUser(){
+async function initUser() {
   try {
     const res = await vkBridge.send("VKWebAppGetUserInfo");
     user = res.id;
-  } catch(e){
-    notify("Ошибка VK");
+  } catch (e) {
+    notify("Ошибка VK: не удалось получить пользователя");
+  }
+}
+
+function requireReady() {
+  if (!appReady || !db) {
+    notify("Приложение ещё загружается. Подождите 1-2 секунды.");
+    return false;
   }
+  return true;
 }
-initUser();
 
-// ================= NOTIFY =================
-function notify(msg){
-  vkBridge.send("VKWebAppShowMessageBox", {
-    title: "Taxi V6",
-    message: msg
+function loadScript(src) {
+  return new Promise((resolve, reject) => {
+    const s = document.createElement("script");
+    s.src = src;
+    s.async = true;
+    s.onload = resolve;
+    s.onerror = () => reject(new Error(`Не удалось загрузить: ${src}`));
+    document.head.appendChild(s);
   });
 }
 
-// ================= ROLE =================
-window.setRole = function(r){
-  role = r;
+async function initApp() {
+  try {
+    await loadScript("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
+    await loadScript("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js");
+
+    const firebaseConfig = {
+      apiKey: "AIzaSyAJqUn_fc1gKZ1MLbApQaJoCZELBceAI1w",
+      authDomain: "eee2taxawaw.firebaseapp.com",
+      projectId: "eee2taxawaw",
+    };
+
+    firebase.initializeApp(firebaseConfig);
+    db = firebase.firestore();
+
+    await initUser();
+    subscribeOrders();
+    appReady = true;
+  } catch (e) {
+    console.error(e);
+    notify("Ошибка инициализации. Проверьте интернет и перезапустите Mini App.");
+  }
+}
+
+async function getPrice() {
+  return 150;
+}
+
+function subscribeOrders() {
+  db.collection("orders")
+    .orderBy("created", "desc")
+    .onSnapshot(
+      (snap) => {
+        let html = "<h3>🚕 Заказы</h3>";
+
+        snap.forEach((d) => {
+          const o = d.data();
+
+          html += `<div class="card">
+      <b>${o.from} → ${o.to}</b><br>
+      💰 ${o.price}<br>
+      Статус: ${o.status}<br>`;
+
+          if (role === "driver" && o.status === "new") {
+            html += `<button onclick="acceptOrder('${d.id}')">Принять</button>`;
+          }
 
+          if (role === "passenger" && o.passenger === user) {
+            html += `<button onclick="cancel('${d.id}')">Отмена</button>`;
+          }
+
+          html += "</div>";
+        });
+
+        document.getElementById("orders").innerHTML = html;
+      },
+      () => {
+        notify("Ошибка чтения заказов из базы");
+      }
+    );
+}
+
+window.setRole = function (r) {
+  if (!requireReady()) return;
+
+  role = r;
   document.getElementById("roleSelect").classList.add("hidden");
   document.getElementById("topbar").classList.remove("hidden");
 
+  // скрываем обе панели и показываем только нужную
+  document.getElementById("passengerUI").classList.add("hidden");
+  document.getElementById("driverUI").classList.add("hidden");
+
   if (r === "passenger") {
     document.getElementById("passengerUI").classList.remove("hidden");
     notify("Вы пассажир 🚶");
   }
 
   if (r === "driver") {
     document.getElementById("driverUI").classList.remove("hidden");
     notify("Вы водитель 🚗");
   }
 };
 
-// ================= DRIVER =================
 window.saveDriver = async function () {
-
+  if (!requireReady()) return;
   if (!user) await initUser();
 
   const callsign = document.getElementById("callsign").value.trim();
   if (!callsign) return notify("Введите позывной");
 
   await db.collection("drivers").add({
     vk: user,
     status: "online",
     callsign,
-    created: Date.now()
+    created: Date.now(),
   });
 
   notify("Вы онлайн 🟢");
 };
 
-// ================= PRICE =================
-async function getPrice(){
-  return 150;
-}
-
-// ================= CREATE ORDER =================
 window.createOrder = async function () {
-
+  if (!requireReady()) return;
   if (!user) await initUser();
 
   const from = document.getElementById("from").value.trim();
   const to = document.getElementById("to").value.trim();
 
   if (!from || !to) return notify("Заполните поля");
 
   const price = await getPrice();
 
   await db.collection("orders").add({
     from,
     to,
     price,
     status: "new",
     passenger: user,
     driver: null,
-    created: Date.now()
+    created: Date.now(),
   });
 
   notify("Заказ создан 🚕");
 };
 
-// ================= DRIVER ACTIONS =================
 window.acceptOrder = async function (id) {
+  if (!requireReady()) return;
 
   if (cooldown[user] && Date.now() - cooldown[user] < 120000) {
     return notify("Кулдаун 2 минуты ⏳");
   }
 
   await db.collection("orders").doc(id).update({
     status: "accepted",
-    driver: user
+    driver: user,
   });
 
   cooldown[user] = Date.now();
 };
 
 window.arrived = async function (id) {
+  if (!requireReady()) return;
   await db.collection("orders").doc(id).update({ status: "arrived" });
 };
 
 window.finish = async function (id) {
+  if (!requireReady()) return;
   await db.collection("orders").doc(id).update({ status: "done" });
 };
 
 window.cancel = async function (id) {
+  if (!requireReady()) return;
   await db.collection("orders").doc(id).update({ status: "cancelled" });
 };
 
-// ================= RENDER =================
-db.collection("orders")
-.orderBy("created", "desc")
-.onSnapshot(snap => {
-
-  let html = "<h3>🚕 Заказы</h3>";
-
-  snap.forEach(d => {
-    const o = d.data();
-
-    html += `<div class="card">
-      <b>${o.from} → ${o.to}</b><br>
-      💰 ${o.price}<br>
-      Статус: ${o.status}<br>`;
-
-    if (role === "driver" && o.status === "new") {
-      html += `<button onclick="acceptOrder('${d.id}')">Принять</button>`;
-    }
-
-    if (role === "passenger" && o.passenger === user) {
-      html += `<button onclick="cancel('${d.id}')">Отмена</button>`;
-    }
-
-    html += "</div>";
-  });
-
-  document.getElementById("orders").innerHTML = html;
-});
-
-}
+initApp();
 
EOF
)
