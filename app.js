// 🚖 Taxi V6 LOCAL VERSION (без Firebase)

let user = "user_" + Math.floor(Math.random() * 100000);
let role = null;
let driverOnline = false;

// 📦 хранилище
function getOrders() {
  return JSON.parse(localStorage.getItem("orders") || "[]");
}

function saveOrders(data) {
  localStorage.setItem("orders", JSON.stringify(data));
}

// 💰 прайс
function getPrice(from, to) {
  if (from === to) return 100;
  return 150;
}

// 🎨 рендер
function renderOrders() {
  const orders = getOrders();
  let html = "<h3>🚕 Заказы</h3>";

  orders.reverse().forEach((o, index) => {
    html += `<div class="card">
      <b>${o.from} → ${o.to}</b><br>
      💰 ${o.price}<br>
      Статус: ${o.status}<br>`;

    if (role === "driver" && o.status === "new" && driverOnline) {
      html += `<button onclick="acceptOrder(${index})">Принять</button>`;
    }

    if (role === "passenger" && o.user === user && o.status === "new") {
      html += `<button onclick="cancelOrder(${index})">Отмена</button>`;
    }

    html += "</div>";
  });

  document.getElementById("orders").innerHTML = html;
}

// 🎭 выбор роли
window.setRole = function (r) {
  role = r;

  document.getElementById("roleSelect").classList.add("hidden");
  document.getElementById("topbar").classList.remove("hidden");

  if (r === "passenger") {
    document.getElementById("passengerUI").classList.remove("hidden");
    alert("Ты пассажир");
  }

  if (r === "driver") {
    document.getElementById("driverUI").classList.remove("hidden");
    alert("Ты водитель");
  }

  renderOrders();
};

// 🚗 водитель онлайн
window.saveDriver = function () {
  const callsign = document.getElementById("callsign").value.trim();
  if (!callsign) return alert("Введите позывной");

  driverOnline = true;
  localStorage.setItem("driver", callsign);

  alert("Ты онлайн");
  renderOrders();
};

// 🚕 создать заказ
window.createOrder = function () {
  const from = document.getElementById("from").value.trim();
  const to = document.getElementById("to").value.trim();

  if (!from || !to) return alert("Заполни поля");

  const orders = getOrders();

  orders.push({
    from,
    to,
    price: getPrice(from, to),
    status: "new",
    user: user
  });

  saveOrders(orders);
  alert("Заказ создан");

  renderOrders();
};

// ✅ принять
window.acceptOrder = function (index) {
  const orders = getOrders();

  if (!orders[index]) return;

  orders[index].status = "accepted";
  orders[index].driver = user;

  saveOrders(orders);
  renderOrders();
};

// ❌ отмена
window.cancelOrder = function (index) {
  const orders = getOrders();

  if (!orders[index]) return;

  orders[index].status = "cancelled";

  saveOrders(orders);
  renderOrders();
};

// 🚀 старт
renderOrders();
