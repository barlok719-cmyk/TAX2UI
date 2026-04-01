// 🚖 Taxi V6 стабильная версия

let db = null;
let user = null;
let role = null;
const cooldown = {};

// 🔥 Firebase init
const firebaseConfig = {
  apiKey: "AIzaSyAJqUn_fc1gKZ1MLbApQaJoCZELBceAI1w",
  authDomain: "eee2taxawaw.firebaseapp.com",
  projectId: "eee2taxawaw",
};

firebase.initializeApp(firebaseConfig);
db = firebase.firestore();

// 👤 получаем пользователя
async function initUser() {
  try {
    const res = await vkBridge.send("VKWebAppGetUserInfo");
    user = res.id;
  } catch (e) {
    alert("Ошибка VK");
  }
}

// 💰 простой прайс
function getPrice(from, to) {
  if (from === to) return 100;
  return 150;
}

// 📡 подписка на заказы
function subscribeOrders() {
  db.collection("orders")
    .orderBy("created", "desc")
    .onSnapshot((snap) => {
      let html = "<h3>🚕 Заказы</h3>";

      snap.forEach((d) => {
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

// 🎭 выбор роли
window.setRole = async function (r) {
  role = r;

  document.getElementById("roleSelect").classList.add("hidden");
  document.getElementById("topbar").classList.remove("hidden");

  document.getElementById("passengerUI").classList.add("hidden");
  document.getElementById("driverUI").classList.add("hidden");

  if (r === "passenger") {
    document.getElementById("passengerUI").classList.remove("hidden");
    alert("Вы пассажир");
  }

  if (r === "driver") {
    document.getElementById("driverUI").classList.remove("hidden");
    alert("Вы водитель");
  }
};

// 🚗 водитель онлайн
window.saveDriver = async function () {
  if (!user) await initUser();

  const callsign = document.getElementById("callsign").value.trim();
  if (!callsign) return alert("Введите позывной");

  await db.collection("drivers").add({
    vk: user,
    status: "online",
    callsign,
    created: Date.now(),
  });

  alert("Вы онлайн");
};

// 🚕 создать заказ
window.createOrder = async function () {
  if (!user) await initUser();

  const from = document.getElementById("from").value.trim();
  const to = document.getElementById("to").value.trim();

  if (!from || !to) return alert("Заполни поля");

  const price = getPrice(from, to);

  await db.collection("orders").add({
    from,
    to,
    price,
    status: "new",
    passenger: user,
    driver: null,
    created: Date.now(),
  });

  alert("Заказ создан");
};

// ✅ принять заказ
window.acceptOrder = async function (id) {
  if (cooldown[user] && Date.now() - cooldown[user] < 120000) {
    return alert("Подожди 2 минуты");
  }

  await db.collection("orders").doc(id).update({
    status: "accepted",
    driver: user,
  });

  cooldown[user] = Date.now();
};

// ❌ отмена
window.cancel = async function (id) {
  await db.collection("orders").doc(id).update({
    status: "cancelled",
  });
};

// 🚀 старт
initUser();
subscribeOrders();
