import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  updateDoc,
  doc,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 🔥 ТВОЙ НОВЫЙ FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyAJqUn_fc1gKZ1MLbApQaJoCZELBceAI1w",
  authDomain: "eee2taxawaw.firebaseapp.com",
  projectId: "eee2taxawaw",
  storageBucket: "eee2taxawaw.firebasestorage.app",
  messagingSenderId: "363185394019",
  appId: "1:363185394019:web:4a256088c4f16a274a8356"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ================= STATE =================
let user = null;
let role = null;
let cooldown = {};
let priceCache = {};

// ================= VK USER (ФИКС) =================
async function initUser(){
  try {
    const res = await vkBridge.send("VKWebAppGetUserInfo");
    user = res.id;
    console.log("USER:", user);
  } catch(e){
    notify("Ошибка VK");
  }
}

initUser();

// ================= NOTIFY =================
function notify(msg){
  vkBridge.send("VKWebAppShowMessageBox", {
    title: "Taxi V6",
    message: msg
  });
}

// ================= ROLE =================
window.setRole = function(r){
  role = r;

  document.getElementById("roleSelect").classList.add("hidden");
  document.getElementById("topbar").classList.remove("hidden");

  if (r === "passenger") {
    document.getElementById("passengerUI").classList.remove("hidden");
    notify("Вы пассажир 🚶");
  }

  if (r === "driver") {
    document.getElementById("driverUI").classList.remove("hidden");
    notify("Вы водитель 🚗");
  }
};

// ================= DRIVER =================
window.saveDriver = async function () {

  if (!user) {
    notify("Загрузка VK...");
    await initUser();
    if (!user) return notify("Ошибка VK");
  }

  const callsign = document.getElementById("callsign").value.trim();
  if (!callsign) return notify("Введите позывной");

  await addDoc(collection(db, "drivers"), {
    vk: user,
    status: "online",
    callsign,
    created: Date.now()
  });

  notify("Вы онлайн 🟢");
};

// ================= PRICE TXT =================
async function loadCityPrices(city){

  if (priceCache[city]) return priceCache[city];

  try {
    const res = await fetch(`prices/${city}.txt`);
    const text = await res.text();

    const map = {};

    text.split("\n").forEach(line => {
      const [to, price] = line.split("=");
      if (to && price) map[to.trim()] = Number(price.trim());
    });

    priceCache[city] = map;
    return map;

  } catch(e){
    return {};
  }
}

async function getPrice(from, to){
  const prices = await loadCityPrices(from);
  return prices[to] || 150;
}

// ================= CREATE ORDER =================
window.createOrder = async function () {

  if (!user) {
    await initUser();
    if (!user) return notify("Ошибка VK");
  }

  const from = document.getElementById("from").value.trim();
  const to = document.getElementById("to").value.trim();

  if (!from || !to) return notify("Заполните поля");

  const price = await getPrice(from, to);

  await addDoc(collection(db, "orders"), {
    from,
    to,
    price,
    status: "new",
    passenger: user,
    driver: null,
    created: Date.now()
  });

  notify("Заказ создан 🚕 " + price + "₽");
};

// ================= DRIVER ACTIONS =================
window.acceptOrder = async function (id) {

  if (cooldown[user] && Date.now() - cooldown[user] < 120000) {
    return notify("Кулдаун 2 минуты ⏳");
  }

  await updateDoc(doc(db, "orders", id), {
    status: "accepted",
    driver: user
  });

  cooldown[user] = Date.now();
  notify("Заказ принят 🚖");
};

window.arrived = async function (id) {
  await updateDoc(doc(db, "orders", id), { status: "arrived" });
  notify("Вы на месте 📍");
};

window.finish = async function (id) {
  await updateDoc(doc(db, "orders", id), { status: "done" });
  notify("Поездка завершена ✅");
};

window.cancel = async function (id) {
  await updateDoc(doc(db, "orders", id), { status: "cancelled" });
  notify("Отмена ❌");
};

// ================= RENDER =================
onSnapshot(query(collection(db, "orders"), orderBy("created", "desc")), snap => {

  let html = "<h3>🚕 Заказы</h3>";

  snap.forEach(d => {
    const o = d.data();

    let style = "";
    if (o.status === "accepted") style = "opacity:0.6;";
    if (o.status === "done" || o.status === "cancelled")
      style = "opacity:0.3; filter:grayscale(1);";

    html += `<div class="card" style="${style}">
      <b>📍 ${o.from} → ${o.to}</b><br>
      💰 ${o.price || 150}₽<br>
      Статус: ${o.status}<br>`;

    if (role === "driver") {

      if (o.status === "new") {
        html += `<button onclick="acceptOrder('${d.id}')">Принять 🚖</button>`;
      }

      if (o.driver === user && o.status === "accepted") {
        html += `
          <button onclick="arrived('${d.id}')">На месте 📍</button>
          <button onclick="finish('${d.id}')">Завершить ✅</button>
          <button onclick="cancel('${d.id}')">Отмена ❌</button>
        `;
      }
    }

    if (role === "passenger" && o.passenger === user) {

      if (o.status === "accepted") html += "🚖 Водитель едет...";
      if (o.status === "arrived") html += "📍 Машина на месте";
      if (o.status === "done") html += "✅ Завершено";

      if (o.status !== "done") {
        html += `<br><button onclick="cancel('${d.id}')">Отмена ❌</button>`;
      }
    }

    html += "</div>";
  });

  document.getElementById("orders").innerHTML = html;
});
