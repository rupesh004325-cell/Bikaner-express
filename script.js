
"use strict";

// Bikaner Express - Firebase Demo
const cart = {};
let customerLocation = null;
let locationSource = "";
let currentUser = null;

const FIREBASE_URL =
  "https://bikaner-express-537a2-default-rtdb.asia-southeast1.firebasedatabase.app";

const firebaseConfig = {
  apiKey: "AIzaSyDhumnH7lRnz_LVJLTMklksusBPaDAkCh4",
  authDomain: "bikaner-express-537a2.firebaseapp.com",
  databaseURL: FIREBASE_URL,
  projectId: "bikaner-express-537a2",
  storageBucket: "bikaner-express-537a2.firebasestorage.app",
  messagingSenderId: "852964791053",
  appId: "1:852964791053:web:94c129e58b72a375661644",
  measurementId: "G-2J73RVKCGD"
};

const shops = [
  {
    name: "Bikaner Express Shop A (Demo)",
    latitude: 28.7041,
    longitude: 77.1025,
    stock: true
  },
  {
    name: "Bikaner Express Shop B (Demo)",
    latitude: 28.7100,
    longitude: 77.1150,
    stock: true
  }
];

const demoAreas = {
  cp: {
    name: "Connaught Place, Delhi (Demo)",
    latitude: 28.6315,
    longitude: 77.2167
  },
  karol: {
    name: "Karol Bagh, Delhi (Demo)",
    latitude: 28.6519,
    longitude: 77.1909
  },
  dwarka: {
    name: "Dwarka, Delhi (Demo)",
    latitude: 28.5921,
    longitude: 77.0460
  }
};

const cartItemsElement = document.getElementById("cartItems");
const totalElement = document.getElementById("total");
const statusElement = document.getElementById("status");
const locationTextElement = document.getElementById("locationText");
const locationBtn = document.getElementById("locationBtn");
const areaSelect = document.getElementById("areaSelect");
const manualLocationBtn = document.getElementById("manualLocationBtn");
const customerForm = document.getElementById("customerForm");

const nameInput = document.getElementById("customerName");
const phoneInput = document.getElementById("customerPhone");
const addressInput = document.getElementById("customerAddress");

function showMessage(message, isError = false) {
  statusElement.style.display = "block";
  statusElement.classList.toggle("error", isError);
  statusElement.textContent = message;
}

function renderCart() {
  const entries = Object.entries(cart).filter(
    entry => entry[1].quantity > 0
  );

  cartItemsElement.replaceChildren();

  if (!entries.length) {
    cartItemsElement.textContent = "Abhi Cart khaali hai.";
  }

  entries.forEach(([name, item]) => {
    const line = document.createElement("div");
    line.className = "cart-line";

    const product = document.createElement("span");
    product.textContent = name + " × " + item.quantity;

    const price = document.createElement("span");
    price.textContent = "₹" + item.price * item.quantity;

    line.append(product, price);
    cartItemsElement.appendChild(line);
  });

  const total = entries.reduce(
    (sum, entry) => sum + entry[1].price * entry[1].quantity,
    0
  );

  totalElement.textContent = "₹" + total;
}

document.querySelectorAll(".add-btn").forEach(button => {
  button.addEventListener("click", () => {
    const name = button.dataset.name;
    const price = Number(button.dataset.price);

    if (!name || !Number.isFinite(price) || price < 0) {
      showMessage("Product ka naam ya price check karein.", true);
      return;
    }

    if (!cart[name]) {
      cart[name] = { price, quantity: 0 };
    }

    cart[name].quantity++;
    renderCart();
  });
});

if (locationBtn) {
  locationBtn.addEventListener("click", () => {
    if (!navigator.geolocation) {
      showMessage("GPS support nahi hai. Demo area select karein.", true);
      return;
    }

    locationBtn.disabled = true;
    locationTextElement.textContent = "Location mil rahi hai...";

    navigator.geolocation.getCurrentPosition(
      position => {
        customerLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };

        locationSource = "GPS";
        locationTextElement.textContent = "GPS location mil gayi!";
        locationBtn.disabled = false;
      },
      () => {
        customerLocation = null;
        locationBtn.disabled = false;
        locationTextElement.textContent =
          "GPS nahi mila. Demo area select karein.";
        showMessage("GPS nahi mila. Demo area select karein.", true);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  });
}

if (manualLocationBtn && areaSelect) {
  manualLocationBtn.addEventListener("click", () => {
    const area = demoAreas[areaSelect.value];

    if (!area) {
      showMessage("Pehle demo area select karein.", true);
      return;
    }

    customerLocation = {
      latitude: area.latitude,
      longitude: area.longitude
    };

    locationSource = "Demo area";
    locationTextElement.textContent = "Selected: " + area.name;
    showMessage("Demo area select ho gaya.");
  });
}

function getDistance(lat1, lon1, lat2, lon2) {
  const radians = degrees => degrees * Math.PI / 180;
  const dLat = radians(lat2 - lat1);
  const dLon = radians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(lat1)) *
    Math.cos(radians(lat2)) *
    Math.sin(dLon / 2) ** 2;

  const safeA = Math.min(1, Math.max(0, a));

  return 6371 * 2 * Math.atan2(
    Math.sqrt(safeA),
    Math.sqrt(1 - safeA)
  );
}

function findNearestShop() {
  if (!customerLocation) return null;

  const availableShops = shops.filter(shop => shop.stock);

  if (!availableShops.length) return null;

  return availableShops.map(shop => ({
    name: shop.name,
    distance: getDistance(
      customerLocation.latitude,
      customerLocation.longitude,
      shop.latitude,
      shop.longitude
    )
  })).sort((a, b) => a.distance - b.distance)[0];
}

// Firebase taiyaar karo
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.database();

async function startCustomerSession() {
  try {
    if (auth.currentUser) {
      currentUser = auth.currentUser;
    } else {
      const result = await auth.signInAnonymously();
      currentUser = result.user;
    }

    showMessage("Firebase ready hai. Demo order test kar sakte hain.");
  } catch (error) {
    console.error("Firebase login error:", error);
    showMessage(
      "Firebase login nahi hua. Internet aur Anonymous Auth check karein.",
      true
    );
  }
}

startCustomerSession();

// Form submit hone par order online bhejo
customerForm.addEventListener("submit", async event => {
  event.preventDefault();

  const entries = Object.entries(cart).filter(
    entry => entry[1].quantity > 0
  );

  if (!entries.length) {
    showMessage("Pehle Cart mein mithai ya namkeen daalein.", true);
    return;
  }

  if (!customerLocation) {
    showMessage("Pehle GPS lo ya Demo Area select karein.", true);
    return;
  }

  const shop = findNearestShop();

  if (!shop) {
    showMessage("Koi available demo shop nahi mili.", true);
    return;
  }

  const name = nameInput.value.trim();
  const phone = phoneInput.value.trim();
  const address = addressInput.value.trim();

  if (name.length < 2) {
    showMessage("Apna sahi naam bharein.", true);
    return;
  }

  if (!/^[6-9][0-9]{9}$/.test(phone)) {
    showMessage("Sahi 10 digit mobile number bharein.", true);
    return;
  }

  if (address.length < 8) {
    showMessage("Poora delivery address bharein.", true);
    return;
  }

  if (!currentUser) {
    showMessage("Firebase login ho raha hai. Thodi der baad try karein.", true);
    await startCustomerSession();
    return;
  }

  const orderLines = entries.map(([productName, item]) => ({
    name: productName,
    quantity: item.quantity,
    price: item.price,
    subtotal: item.price * item.quantity
  }));

  const total = entries.reduce(
    (sum, entry) => sum + entry[1].price * entry[1].quantity,
    0
  );

  const order = {
    id: "BE-" + Date.now(),
    name,
    phone,
    address,
    items: orderLines,
    shop: shop.name,
    distanceKm: shop.distance.toFixed(2),
    total,
    locationSource,
    status: "New",
    createdAt: new Date().toISOString()
  };

  const submitButton = document.getElementById("orderBtn");
  submitButton.disabled = true;

  try {
    // Har anonymous customer ka apna folder
    const orderRef = db.ref("orders/" + currentUser.uid).push();

    await orderRef.set(order);

    showMessage(
      "✅ Demo Order Firebase mein save ho gaya!\n" +
      "Order ID: " + order.id + "\n" +
      "Total: ₹" + total + "\n" +
      "Shop: " + shop.name + "\n\n" +
      "Yeh abhi demo order hai; delivery automatically nahi bheji gayi."
    );

    console.log("Firebase order saved:", order);

  } catch (error) {
    console.error("Firebase order save error:", error);

    showMessage(
      "Order save nahi hua. Firebase Database Rules ya login permission check karni hogi.",
      true
    );
  } finally {
    submitButton.disabled = false;
  }
});

renderCart();
