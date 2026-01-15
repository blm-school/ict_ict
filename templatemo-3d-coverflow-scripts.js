// =====================
// Global variables
// =====================
const coverflow = document.getElementById('coverflow');
const dotsContainer = document.getElementById('dots');
const currentTitle = document.getElementById('current-title');
const currentDescription = document.getElementById('current-description');
const container = document.querySelector('.coverflow-container');

const playIcon = document.querySelector('.play-icon');
const pauseIcon = document.querySelector('.pause-icon');

const menuToggle = document.getElementById('menuToggle');
const mainMenu = document.getElementById('mainMenu');

let imageData = [];
let items = [];
let dots = [];

let currentIndex = 0;
let isAnimating = false;
let autoplayInterval = null;
let isPlaying = true;

// =====================
// Mobile menu
// =====================
menuToggle.addEventListener('click', () => {
  menuToggle.classList.toggle('active');
  mainMenu.classList.toggle('active');
});

document.addEventListener('click', (e) => {
  if (!menuToggle.contains(e.target) && !mainMenu.contains(e.target)) {
    menuToggle.classList.remove('active');
    mainMenu.classList.remove('active');
  }
});


// =====================
// Fetch Data & Auto-Refresh Logic (Instant Load + Update every 1 min)
// =====================
const GAS_URL = 'https://script.google.com/macros/s/AKfycbyvJ0NJ-x60hU4VTcaAvzjLnXtK2w53qQIyGHCruxC1ourHPp0tkvGuv5smsykw1UpTKg/exec';
const CACHE_KEY = 'COVERFLOW_JSON_V1';

// 1. เริ่มทำงานทันทีที่โหลดหน้าจอ
initData();

// 2. ตั้งเวลาเช็คข้อมูลใหม่จาก Google Sheets ทุกๆ 1 นาที (60,000 ms)
setInterval(fetchFreshData, 60000);

function initData() {
  // ดึงจาก LocalStorage ในเครื่องผู้ใช้มาโชว์ก่อน (เร็วระดับ 0 วินาที)
  const cachedData = localStorage.getItem(CACHE_KEY);
  if (cachedData) {
    try {
      imageData = JSON.parse(cachedData);
      console.log("🚀 Loading from Local Cache (Instant)");
      renderApp(); // วาดหน้าจอทันทีด้วยข้อมูลเก่า
    } catch (e) {
      console.error("Cache corrupted:", e);
      localStorage.removeItem(CACHE_KEY);
    }
  }
  // สั่งให้ไปดึงข้อมูลใหม่จาก Server ทันทีในพื้นหลัง
  fetchFreshData();
}

function fetchFreshData() {
  console.log("🔄 Checking for fresh data from Google Apps Script...");
  
  fetch(GAS_URL)
    .then(res => res.json())
    .then(data => {
      const dataString = JSON.stringify(data);
      const currentLocalCache = localStorage.getItem(CACHE_KEY);

      // อัปเดต UI เฉพาะเมื่อข้อมูลใน Google Sheets เปลี่ยนไปจริงๆ เท่านั้น
      if (dataString !== currentLocalCache) {
        console.log("✨ Data changed! Updating UI with new content.");
        imageData = data;
        localStorage.setItem(CACHE_KEY, dataString); // เซฟทับแคชเดิม
        renderApp(); // วาดหน้าจอใหม่
      } else {
        console.log("✅ Data is still the same. No UI update needed.");
      }
    })
    .catch(err => {
      console.error("❌ GAS Fetch Error:", err);
      // กรณีเน็ตหลุดและไม่มีแคชเลย ให้แจ้งเตือน
      if (!imageData || imageData.length === 0) {
        currentTitle.textContent = 'โหลดข้อมูลไม่สำเร็จ';
      }
    });
}

// =====================
// ฟังก์ชันสำหรับรันคำสั่งแสดงผล (วาดหน้าจอใหม่)
// =====================
function renderApp() {
  if (!imageData || imageData.length === 0) return;
  
  // 1. จำตำแหน่ง Index ปัจจุบันไว้ก่อน (เพื่อไม่ให้หน้าจอเด้งไปรูปแรกตอนอัปเดต)
  const lastIndex = currentIndex;
  
  // 2. ล้างการ Autoplay เดิมทิ้งก่อน (ป้องกันสไลด์วิ่งเร็วผิดปกติ)
  if (autoplayInterval) {
    clearInterval(autoplayInterval);
    autoplayInterval = null;
  }
  
  // 3. สั่งสร้าง HTML และสร้างจุด (Dots) ใหม่ตามข้อมูลล่าสุด
  buildCoverflow();
  initImages();

  // 4. คืนค่าตำแหน่ง Index เดิม (ถ้าข้อมูลใหม่ยังมีจำนวนรูปถึงตำแหน่งเดิม)
  currentIndex = lastIndex < imageData.length ? lastIndex : 0;
  
  // 5. อัปเดตการแสดงผลและเริ่มเล่น Autoplay ใหม่
  updateCoverflow();
  startAutoplay();
}

// =====================
// Build DOM
// =====================
function buildCoverflow() {
  coverflow.innerHTML = '';
  dotsContainer.innerHTML = '';

  imageData.forEach((item, index) => {

    const div = document.createElement('div');
    div.className = 'coverflow-item';
    div.dataset.index = index;

    div.innerHTML = `
      <div class="cover image-loading">
        <img src="${item.image}" alt="${item.title}" loading="lazy">
      </div>
      <div class="reflection"></div>
    `;

    div.addEventListener('click', () => {
      goToIndex(index);
      handleUserInteraction();
    });

    coverflow.appendChild(div);

    // dots
    const dot = document.createElement('div');
    dot.className = 'dot';
    dot.addEventListener('click', () => {
      goToIndex(index);
      handleUserInteraction();
    });
    dotsContainer.appendChild(dot);
  });

  items = document.querySelectorAll('.coverflow-item');
  dots = document.querySelectorAll('.dot');
}

// =====================
// Image loading & reflection
// =====================
function initImages() {
  items.forEach(item => {
    const img = item.querySelector('img');
    const reflection = item.querySelector('.reflection');

    img.onload = function () {
      this.parentElement.classList.remove('image-loading');
      reflection.style.backgroundImage = `url(${this.src})`;
      reflection.style.backgroundSize = 'cover';
      reflection.style.backgroundPosition = 'center';
    };

    img.onerror = function () {
      this.parentElement.classList.add('image-loading');
    };
  });
}

// =====================
// Coverflow logic
// =====================
function updateCoverflow() {
  if (!imageData.length || !items.length) return;
  if (!imageData[currentIndex]) return;

  if (isAnimating) return;
  isAnimating = true;

  items.forEach((item, index) => {
    let offset = index - currentIndex;

    if (offset > items.length / 2) offset -= items.length;
    if (offset < -items.length / 2) offset += items.length;

    const absOffset = Math.abs(offset);
    const sign = Math.sign(offset);

    let translateX = offset * 220;
    let translateZ = -absOffset * 200;
    let rotateY = -sign * Math.min(absOffset * 60, 60);
    let scale = 1 - absOffset * 0.1;
    let opacity = 1 - absOffset * 0.2;

    if (absOffset > 3) {
      opacity = 0;
      translateX = sign * 800;
    }

    item.style.transform = `
      translateX(${translateX}px)
      translateZ(${translateZ}px)
      rotateY(${rotateY}deg)
      scale(${scale})
    `;
    item.style.opacity = opacity;
    item.style.zIndex = 100 - absOffset;
    item.classList.toggle('active', index === currentIndex);
  });

  dots.forEach((dot, index) => {
    dot.classList.toggle('active', index === currentIndex);
  });

  // ✅ จุดที่พัง → ป้องกันแล้ว
  const currentData = imageData[currentIndex];
  currentTitle.textContent = currentData.title || '';
  currentDescription.textContent = currentData.description || '';

  setTimeout(() => isAnimating = false, 600);
}


// =====================
// Navigation
// =====================
function navigate(direction) {
  if (!items.length) return;

  currentIndex = (currentIndex + direction + items.length) % items.length;
  updateCoverflow();
}

function goToIndex(index) {
  if (isAnimating || index === currentIndex) return;
  currentIndex = index;
  updateCoverflow();
}

// expose for HTML buttons
window.navigate = navigate;

// =====================
// Keyboard
// =====================
container.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft') {
    navigate(-1);
    handleUserInteraction();
  }
  if (e.key === 'ArrowRight') {
    navigate(1);
    handleUserInteraction();
  }
});

// =====================
// Touch swipe
// =====================
let touchStartX = 0;

container.addEventListener('touchstart', e => {
  touchStartX = e.changedTouches[0].screenX;
}, { passive: true });

container.addEventListener('touchend', e => {
  const diff = touchStartX - e.changedTouches[0].screenX;
  if (Math.abs(diff) > 40) {
    handleUserInteraction();
    diff > 0 ? navigate(1) : navigate(-1);
  }
}, { passive: true });

// =====================
// Autoplay (CLEAN VERSION)
// =====================

function startAutoplay() {
  if (autoplayInterval) return;

  autoplayInterval = setInterval(() => {
    navigate(1);
  }, 4000);

  isPlaying = true;
  updatePlayPauseButton();
}

function stopAutoplay() {
  if (autoplayInterval) {
    clearInterval(autoplayInterval);
    autoplayInterval = null;
  }

  isPlaying = false;
  updatePlayPauseButton();
}

function toggleAutoplay() {
  isPlaying ? stopAutoplay() : startAutoplay();
}

function updatePlayPauseButton() {
  if (!playIcon || !pauseIcon) return;

  if (isPlaying) {
    playIcon.style.display = 'none';
    pauseIcon.style.display = 'block';
  } else {
    playIcon.style.display = 'block';
    pauseIcon.style.display = 'none';
  }
}

// เริ่มต้น
updatePlayPauseButton();

