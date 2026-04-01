// 🔥 Firebase (НЕ module версия)
importScripts = null;

// Подключаем Firebase через window
const script1 = document.createElement("script");
script1.src = "https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js";
document.head.appendChild(script1);

const script2 = document.createElement("script");
script2.src = "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js";
document.head.appendChild(script2);

script2.onload = init;

function init(){

const firebaseConfig = {
  apiKey: "AIzaSyAJqUn_fc1gKZ1MLbApQaJoCZELBceAI1w",
  authDomain: "eee2taxawaw.firebaseapp.com",
  projectId: "eee2taxawaw"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ================= STATE =================
let user = null;
let role = null;
let cooldown = {};
let priceCache = {};

// ================= VK =================
async function initUser(){
  try {
    const res = await vkBridge.send("VKWebAppGetUserInfo");
    user = res.id;
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

  if (!user) await initUser();

  const callsign = document.getElementById("callsign").value.trim();
  if (!callsign) return notify("Введите позывной");

  await db.collection("drivers").add({
    vk: user,
    status: "online",
    callsign,
    created: Date.now()
  });

  notify("Вы онлайн 🟢");
};

// ================= PRICE =================
async function getPrice(){
  return 150;
}

// ================= CREATE ORDER =================
window.createOrder = async function () {

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
    created: Date.now()
  });

  notify("Заказ создан 🚕");
};

// ================= DRIVER ACTIONS =================
window.acceptOrder = async function (id) {

  if (cooldown[user] && Date.now() - cooldown[user] < 120000) {
    return notify("Кулдаун 2 минуты ⏳");
  }

  await db.collection("orders").doc(id).update({
    status: "accepted",
    driver: user
  });

  cooldown[user] = Date.now();
};

window.arrived = async function (id) {
  await db.collection("orders").doc(id).update({ status: "arrived" });
};

window.finish = async function (id) {
  await db.collection("orders").doc(id).update({ status: "done" });
};

window.cancel = async function (id) {
  await db.collection("orders").doc(id).update({ status: "cancelled" });
};

// ================= RENDER =================
db.collection("orders")
.orderBy("created", "desc")
.onSnapshot(snap => {

  let html = "<h3>🚕 Заказы</h3>";

  snap.forEach(d => {
    const o = d.data();

    html += `<div class="card">
      <b>${o.from} → ${o.to}</b><br>
      💰 ${o.price}<br>
      Статус: ${o.status}<br>`;

    if (role === "driver" && o.status === "new") {
      html += `<button onclick="acceptOrder('${d.id}')">Принять</button>`;
    }

    if (role === "passenger" && o.passenger === user) {
      html += `<button onclick="cancel('${d.id}')">Отмена</button>`;
    }

    html += "</div>";
  });

  document.getElementById("orders").innerHTML = html;
});

}
