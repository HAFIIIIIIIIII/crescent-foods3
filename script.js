// ============================================================================
// CRESCENT FOODS - CRESCENT PUBLIC SCHOOL
// Connected to Firebase Firestore Project: "crescent-foods"
// ============================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  deleteDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Your Exact Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAxglkXqdY8bzmZo55nf9C7K1NKTQIYn5k",
  authDomain: "crescent-foods.firebaseapp.com",
  projectId: "crescent-foods",
  storageBucket: "crescent-foods.firebasestorage.app",
  messagingSenderId: "253000193290",
  appId: "1:253000193290:web:b5a9d4a73da602a49896f3",
  measurementId: "G-BBSCWMCVYY"
};

// Initialize Firebase and Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Official Menu Catalog (Prices in Rupees)
const MENU_ITEMS = {
  halfBiriyani: { name: "Half Biriyani", price: 100 },
  fullBiriyani: { name: "Full Biriyani", price: 180 },
  meals: { name: "Meals", price: 60 }
};

// Application State
let authMode = "login"; // "login" or "register"
let currentStudent = null; // Stores logged-in studentId
let cart = {
  halfBiriyani: 0,
  fullBiriyani: 0,
  meals: 0
};
let allOrdersCache = [];
let ordersUnsubscribe = null;

// ============================================================================
// DOM ELEMENTS
// ============================================================================
const studentWebsiteView = document.getElementById("studentWebsiteView");
const adminPortalView = document.getElementById("adminPortalView");
const openAdminPortalBtn = document.getElementById("openAdminPortalBtn");
const backToWebsiteBtn = document.getElementById("backToWebsiteBtn");

// Student Auth Elements
const tabLoginBtn = document.getElementById("tabLoginBtn");
const tabRegisterBtn = document.getElementById("tabRegisterBtn");
const authTitle = document.getElementById("authTitle");
const authSubtitle = document.getElementById("authSubtitle");
const studentAuthForm = document.getElementById("studentAuthForm");
const studentIdInput = document.getElementById("studentIdInput");
const studentPasswordInput = document.getElementById("studentPasswordInput");
const authSubmitBtn = document.getElementById("authSubmitBtn");
const authErrorMsg = document.getElementById("authErrorMsg");
const authSuccessMsg = document.getElementById("authSuccessMsg");
const quickDemoStudentBtn = document.getElementById("quickDemoStudentBtn");

// Logged-in Menu Elements
const studentAuthWrapper = document.getElementById("studentAuthWrapper");
const foodMenuWrapper = document.getElementById("foodMenuWrapper");
const activeStudentIdText = document.getElementById("activeStudentIdText");
const studentNavBadge = document.getElementById("studentNavBadge");
const navStudentIdDisplay = document.getElementById("navStudentIdDisplay");
const studentLogoutBtn = document.getElementById("studentLogoutBtn");
const switchStudentBtn = document.getElementById("switchStudentBtn");

// Checkout Bar & Modal Elements
const checkoutPopupBar = document.getElementById("checkoutPopupBar");
const cartItemsSummaryText = document.getElementById("cartItemsSummaryText");
const cartTotalAmountText = document.getElementById("cartTotalAmountText");
const proceedToCheckoutBtn = document.getElementById("proceedToCheckoutBtn");

const checkoutModalOverlay = document.getElementById("checkoutModalOverlay");
const closeCheckoutModalBtn = document.getElementById("closeCheckoutModalBtn");
const checkoutFormView = document.getElementById("checkoutFormView");
const upiSuccessView = document.getElementById("upiSuccessView");
const modalOrderReceiptList = document.getElementById("modalOrderReceiptList");
const checkoutDetailsForm = document.getElementById("checkoutDetailsForm");
const checkoutStudentName = document.getElementById("checkoutStudentName");
const checkoutStudentClass = document.getElementById("checkoutStudentClass");
const checkoutStudentDivision = document.getElementById("checkoutStudentDivision");
const checkoutErrorMsg = document.getElementById("checkoutErrorMsg");
const confirmOrderBtn = document.getElementById("confirmOrderBtn");
const confirmBtnAmount = document.getElementById("confirmBtnAmount");
const newOrderAfterSuccessBtn = document.getElementById("newOrderAfterSuccessBtn");

// Admin Elements
const adminLoginCard = document.getElementById("adminLoginCard");
const adminLoginForm = document.getElementById("adminLoginForm");
const adminPasscodeInput = document.getElementById("adminPasscodeInput");
const adminLoginError = document.getElementById("adminLoginError");
const adminDashboardContent = document.getElementById("adminDashboardContent");
const adminLogoutBtn = document.getElementById("adminLogoutBtn");
const adminSearchInput = document.getElementById("adminSearchInput");

const totalOrdersCountBadge = document.getElementById("totalOrdersCountBadge");
const adminTotalCash = document.getElementById("adminTotalCash");
const adminTotalHalfBiriyani = document.getElementById("adminTotalHalfBiriyani");
const adminTotalFullBiriyani = document.getElementById("adminTotalFullBiriyani");
const adminTotalMeals = document.getElementById("adminTotalMeals");
const adminOrdersEmptyState = document.getElementById("adminOrdersEmptyState");
const adminOrdersList = document.getElementById("adminOrdersList");

// ============================================================================
// 1. STUDENT LOGIN & REGISTRATION IN FIRESTORE ("students" collection)
// ============================================================================

function setAuthTabMode(mode) {
  authMode = mode;
  authErrorMsg.classList.add("hidden");
  authSuccessMsg.classList.add("hidden");

  if (mode === "login") {
    tabLoginBtn.classList.add("active");
    tabRegisterBtn.classList.remove("active");
    authTitle.textContent = "Student / Parent Login";
    authSubtitle.textContent = "Enter your Crescent Public School Student ID and Password";
    authSubmitBtn.textContent = "Login & Unlock Food Menu →";
  } else {
    tabRegisterBtn.classList.add("active");
    tabLoginBtn.classList.remove("active");
    authTitle.textContent = "Register Student ID";
    authSubtitle.textContent = "Create a new Student ID & Password in Firestore";
    authSubmitBtn.textContent = "Save Student ID & Continue →";
  }
}

tabLoginBtn.addEventListener("click", () => setAuthTabMode("login"));
tabRegisterBtn.addEventListener("click", () => setAuthTabMode("register"));

// Handle Student Login / Registration Form Submit
studentAuthForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  authErrorMsg.classList.add("hidden");
  authSuccessMsg.classList.add("hidden");

  const rawId = studentIdInput.value.trim().toUpperCase();
  const password = studentPasswordInput.value.trim();

  if (!rawId || !password) return;

  authSubmitBtn.disabled = true;
  authSubmitBtn.textContent = "Checking Firestore...";

  try {
    const studentRef = doc(db, "students", rawId);
    const studentSnap = await getDoc(studentRef);

    if (authMode === "register") {
      if (studentSnap.exists()) {
        showAuthError(`Student ID "${rawId}" is already registered. Please switch to Student Login.`);
      } else {
        await setDoc(studentRef, {
          studentId: rawId,
          password: password,
          createdAt: Date.now()
        });
        loginStudentSuccess(rawId);
      }
    } else {
      // Login Mode
      if (!studentSnap.exists()) {
        showAuthError(`Student ID "${rawId}" was not found. Click "New Student ID? Register" above to create it first.`);
      } else {
        const data = studentSnap.data();
        if (data.password !== password) {
          showAuthError("Incorrect password for this Student ID. Please try again.");
        } else {
          // Pre-fill last used student name/class/division if stored
          if (data.studentName) checkoutStudentName.value = data.studentName;
          if (data.studentClass) checkoutStudentClass.value = data.studentClass;
          if (data.studentDivision) checkoutStudentDivision.value = data.studentDivision;
          loginStudentSuccess(rawId);
        }
      }
    }
  } catch (err) {
    console.error("Firestore Auth Error:", err);
    showAuthError("Could not connect to Firestore. Make sure Firestore Database is created and Rules allow read/write.");
  } finally {
    authSubmitBtn.disabled = false;
    authSubmitBtn.textContent =
      authMode === "login" ? "Login & Unlock Food Menu →" : "Save Student ID & Continue →";
  }
});

// 1-Click Auto-Fill & Login Demo Student (CPS-101)
quickDemoStudentBtn.addEventListener("click", async () => {
  const demoId = "CPS-101";
  const demoPass = "pass123";
  studentIdInput.value = demoId;
  studentPasswordInput.value = demoPass;
  authErrorMsg.classList.add("hidden");

  quickDemoStudentBtn.textContent = "⏳ Setting up CPS-101 in Firestore...";

  try {
    const demoRef = doc(db, "students", demoId);
    const snap = await getDoc(demoRef);
    if (!snap.exists()) {
      await setDoc(demoRef, {
        studentId: demoId,
        password: demoPass,
        createdAt: Date.now()
      });
    }
    loginStudentSuccess(demoId);
  } catch (err) {
    console.error("Demo login error:", err);
    showAuthError("Firestore error: Please verify your Firestore Rules are published.");
  } finally {
    quickDemoStudentBtn.textContent = "✨ Auto-Fill Demo Student (CPS-101 / pass123)";
  }
});

function showAuthError(msg) {
  authErrorMsg.textContent = msg;
  authErrorMsg.classList.remove("hidden");
}

function loginStudentSuccess(studentId) {
  currentStudent = studentId;
  activeStudentIdText.textContent = studentId;
  navStudentIdDisplay.textContent = studentId;

  studentAuthWrapper.classList.add("hidden");
  foodMenuWrapper.classList.remove("hidden");
  studentNavBadge.classList.remove("hidden");

  foodMenuWrapper.scrollIntoView({ behavior: "smooth", block: "start" });
}

function logoutStudent() {
  currentStudent = null;
  cart = { halfBiriyani: 0, fullBiriyani: 0, meals: 0 };
  updateMenuUI();

  studentPasswordInput.value = "";
  foodMenuWrapper.classList.add("hidden");
  studentNavBadge.classList.add("hidden");
  studentAuthWrapper.classList.remove("hidden");
}

studentLogoutBtn.addEventListener("click", logoutStudent);
switchStudentBtn.addEventListener("click", logoutStudent);

// ============================================================================
// 2. FOOD SELECTION & POP-UP "PROCEED TO CHECKOUT" BAR
// ============================================================================

document.querySelectorAll(".qty-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const itemKey = btn.dataset.item;
    if (!itemKey) return;

    if (btn.classList.contains("plus")) {
      cart[itemKey] += 1;
    } else if (btn.classList.contains("minus") && cart[itemKey] > 0) {
      cart[itemKey] -= 1;
    }
    updateMenuUI();
  });
});

function getCartTotals() {
  let totalItems = 0;
  let totalAmount = 0;

  Object.keys(cart).forEach((key) => {
    const qty = cart[key];
    totalItems += qty;
    totalAmount += qty * MENU_ITEMS[key].price;
  });

  return { totalItems, totalAmount };
}

function updateMenuUI() {
  Object.keys(cart).forEach((key) => {
    const qtyEl = document.getElementById(`qty-${key}`);
    const cardEl = document.querySelector(`.food-card[data-id="${key}"]`);
    if (qtyEl) qtyEl.textContent = cart[key];
    if (cardEl) {
      if (cart[key] > 0) {
        cardEl.classList.add("selected-item");
      } else {
        cardEl.classList.remove("selected-item");
      }
    }
  });

  const { totalItems, totalAmount } = getCartTotals();

  if (totalItems > 0 && currentStudent) {
    cartItemsSummaryText.textContent = `${totalItems} ${totalItems === 1 ? "Food Item" : "Food Items"} Added`;
    cartTotalAmountText.textContent = `₹${totalAmount}`;
    checkoutPopupBar.classList.remove("hidden");
  } else {
    checkoutPopupBar.classList.add("hidden");
  }
}

// ============================================================================
// 3. CHECKOUT POPUP MODAL & UPI TICK ANIMATION + FIRESTORE ORDER SAVE
// ============================================================================

proceedToCheckoutBtn.addEventListener("click", () => {
  const { totalItems, totalAmount } = getCartTotals();
  if (totalItems === 0) return;

  // Build mini receipt inside modal
  let receiptHTML = "";
  Object.keys(cart).forEach((key) => {
    if (cart[key] > 0) {
      const subTotal = cart[key] * MENU_ITEMS[key].price;
      receiptHTML += `
        <div class="mini-receipt-item">
          <span>${MENU_ITEMS[key].name} × ${cart[key]}</span>
          <strong>₹${subTotal}</strong>
        </div>
      `;
    }
  });
  receiptHTML += `
    <div class="mini-receipt-total">
      <span>Total Payable</span>
      <span>₹${totalAmount}</span>
    </div>
  `;

  modalOrderReceiptList.innerHTML = receiptHTML;
  confirmBtnAmount.textContent = `₹${totalAmount}`;

  checkoutErrorMsg.classList.add("hidden");
  checkoutFormView.classList.remove("hidden");
  upiSuccessView.classList.add("hidden");
  checkoutModalOverlay.classList.remove("hidden");
});

closeCheckoutModalBtn.addEventListener("click", () => {
  checkoutModalOverlay.classList.add("hidden");
});

// Play pleasant UPI-style confirmation chime using Web Audio API
function playUpiSuccessSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.09);

      gain.gain.setValueAtTime(0.15, ctx.currentTime + index * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * 0.09 + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + index * 0.09);
      osc.stop(ctx.currentTime + index * 0.09 + 0.35);
    });
  } catch (e) {
    // Audio optional if browser blocks autoplay
  }
}

checkoutDetailsForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  checkoutErrorMsg.classList.add("hidden");

  const studentName = checkoutStudentName.value.trim();
  const studentClass = checkoutStudentClass.value;
  const studentDivision = checkoutStudentDivision.value;
  const { totalItems, totalAmount } = getCartTotals();

  if (!studentName || !studentClass || !studentDivision || totalItems === 0) {
    checkoutErrorMsg.textContent = "Please fill in the Student Name, Class, and Division.";
    checkoutErrorMsg.classList.remove("hidden");
    return;
  }

  confirmOrderBtn.disabled = true;
  confirmOrderBtn.textContent = "Confirming Order...";

  try {
    const now = new Date();
    const timeFormatted = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Save order to Firestore "orders" collection
    await addDoc(collection(db, "orders"), {
      studentId: currentStudent,
      studentName: studentName,
      studentClass: studentClass,
      studentDivision: studentDivision,
      items: {
        halfBiriyani: cart.halfBiriyani,
        fullBiriyani: cart.fullBiriyani,
        meals: cart.meals
      },
      totalAmount: totalAmount,
      orderTime: timeFormatted,
      createdAt: Date.now()
    });

    // Also update student profile with their name, class & division for future convenience
    const studentRef = doc(db, "students", currentStudent);
    await setDoc(
      studentRef,
      {
        studentName,
        studentClass,
        studentDivision
      },
      { merge: true }
    );

    // Format summary string for receipt
    const orderedParts = [];
    if (cart.halfBiriyani > 0) orderedParts.push(`Half Biriyani × ${cart.halfBiriyani}`);
    if (cart.fullBiriyani > 0) orderedParts.push(`Full Biriyani × ${cart.fullBiriyani}`);
    if (cart.meals > 0) orderedParts.push(`Meals × ${cart.meals}`);

    // Populate UPI-Style Animated Confirmation Screen
    document.getElementById("upiConfirmedAmount").textContent = `₹${totalAmount}`;
    document.getElementById("receiptStudentName").textContent = studentName;
    document.getElementById("receiptStudentId").textContent = currentStudent;
    document.getElementById("receiptClassDiv").textContent = `${studentClass} - Div ${studentDivision}`;
    document.getElementById("receiptItemsText").textContent = orderedParts.join(", ");
    document.getElementById("receiptTimeText").textContent = timeFormatted;

    // Reset cart
    cart = { halfBiriyani: 0, fullBiriyani: 0, meals: 0 };
    updateMenuUI();

    // Switch modal view to UPI Tick animation & play sound
    checkoutFormView.classList.add("hidden");
    upiSuccessView.classList.remove("hidden");
    playUpiSuccessSound();
  } catch (err) {
    console.error("Order Save Error:", err);
    checkoutErrorMsg.textContent = "Failed to save order to Firestore. Please check your internet or Firestore rules.";
    checkoutErrorMsg.classList.remove("hidden");
  } finally {
    confirmOrderBtn.disabled = false;
    confirmOrderBtn.innerHTML = `✓ Confirm Order (<span id="confirmBtnAmount">₹${totalAmount}</span>)`;
  }
});

newOrderAfterSuccessBtn.addEventListener("click", () => {
  checkoutModalOverlay.classList.add("hidden");
});

// ============================================================================
// 4. ADMINISTRATIVE PORTAL & LIVE FIRESTORE ORDER STREAM (PHONE & DESKTOP)
// ============================================================================

openAdminPortalBtn.addEventListener("click", () => {
  studentWebsiteView.classList.add("hidden");
  checkoutPopupBar.classList.add("hidden");
  adminPortalView.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
});

backToWebsiteBtn.addEventListener("click", () => {
  adminPortalView.classList.add("hidden");
  studentWebsiteView.classList.remove("hidden");
  updateMenuUI();
});

adminLoginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const pass = adminPasscodeInput.value.trim();

  if (pass === "admin123") {
    adminLoginError.classList.add("hidden");
    adminLoginCard.classList.add("hidden");
    adminDashboardContent.classList.remove("hidden");
    startLiveAdminOrdersStream();
  } else {
    adminLoginError.classList.remove("hidden");
  }
});

adminLogoutBtn.addEventListener("click", () => {
  if (ordersUnsubscribe) {
    ordersUnsubscribe();
    ordersUnsubscribe = null;
  }
  adminPasscodeInput.value = "";
  adminDashboardContent.classList.add("hidden");
  adminLoginCard.classList.remove("hidden");
});

function startLiveAdminOrdersStream() {
  if (ordersUnsubscribe) return;

  const ordersRef = collection(db, "orders");
  ordersUnsubscribe = onSnapshot(
    ordersRef,
    (snapshot) => {
      const orders = [];
      snapshot.forEach((docSnap) => {
        orders.push({ id: docSnap.id, ...docSnap.data() });
      });

      // Sort newest orders first
      orders.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      allOrdersCache = orders;
      renderAdminDashboard();
    },
    (error) => {
      console.error("Admin Live Stream Error:", error);
    }
  );
}

adminSearchInput.addEventListener("input", renderAdminDashboard);

function renderAdminDashboard() {
  const queryText = adminSearchInput.value.trim().toLowerCase();

  let totalCash = 0;
  let totalHalfBiriyani = 0;
  let totalFullBiriyani = 0;
  let totalMeals = 0;

  // Calculate grand totals across all orders
  allOrdersCache.forEach((order) => {
    totalCash += Number(order.totalAmount || 0);
    if (order.items) {
      totalHalfBiriyani += Number(order.items.halfBiriyani || 0);
      totalFullBiriyani += Number(order.items.fullBiriyani || 0);
      totalMeals += Number(order.items.meals || 0);
    }
  });

  totalOrdersCountBadge.textContent = allOrdersCache.length;
  adminTotalCash.textContent = `₹${totalCash}`;
  adminTotalHalfBiriyani.textContent = totalHalfBiriyani;
  adminTotalFullBiriyani.textContent = totalFullBiriyani;
  adminTotalMeals.textContent = totalMeals;

  // Filter orders for search input
  const filteredOrders = allOrdersCache.filter((o) => {
    if (!queryText) return true;
    const target = `${o.studentName} ${o.studentId} ${o.studentClass} ${o.studentDivision}`.toLowerCase();
    return target.includes(queryText);
  });

  if (filteredOrders.length === 0) {
    adminOrdersEmptyState.classList.remove("hidden");
    adminOrdersList.innerHTML = "";
    return;
  }

  adminOrdersEmptyState.classList.add("hidden");
  adminOrdersList.innerHTML = filteredOrders
    .map((order) => {
      const pills = [];
      if (order.items?.halfBiriyani > 0) {
        pills.push(`<span class="item-pill">🍗 Half Biriyani × ${order.items.halfBiriyani}</span>`);
      }
      if (order.items?.fullBiriyani > 0) {
        pills.push(`<span class="item-pill">🍲 Full Biriyani × ${order.items.fullBiriyani}</span>`);
      }
      if (order.items?.meals > 0) {
        pills.push(`<span class="item-pill">🍛 Meals × ${order.items.meals}</span>`);
      }

      return `
        <div class="admin-order-card">
          <div class="order-card-top">
            <div>
              <div class="order-student-name">${escapeHTML(order.studentName || "Student")}</div>
              <span class="order-class-badge">
                ${escapeHTML(order.studentClass || "-")} • Div ${escapeHTML(order.studentDivision || "-")}
              </span>
            </div>
            <div class="order-amount-tag">₹${Number(order.totalAmount || 0)}</div>
          </div>

          <div class="order-items-pills">
            ${pills.join("")}
          </div>

          <div class="order-card-footer">
            <span>ID: <strong>${escapeHTML(order.studentId || "-")}</strong> • 🕒 ${escapeHTML(order.orderTime || "")}</span>
            <button class="btn-delete-order" data-delete-id="${order.id}">Clear</button>
          </div>
        </div>
      `;
    })
    .join("");

  // Attach delete/clear listeners
  adminOrdersList.querySelectorAll(".btn-delete-order").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const orderId = btn.getAttribute("data-delete-id");
      if (!orderId) return;
      try {
        await deleteDoc(doc(db, "orders", orderId));
      } catch (err) {
        console.error("Failed to delete order:", err);
      }
    });
  });
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
