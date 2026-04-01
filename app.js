function log(msg) {
  document.getElementById("log").innerHTML += "<br>" + msg;
}

// тест кнопки
window.test = function () {
  alert("КНОПКА РАБОТАЕТ");
  log("клик прошел");
};

// создание заказа
window.createOrder = function () {
  const from = document.getElementById("from").value;
  const to = document.getElementById("to").value;

  if (!from || !to) {
    alert("заполни поля");
    return;
  }

  log("заказ: " + from + " → " + to);
  alert("создано");
};

console.log("JS ЗАГРУЖЕН");
