/*

TemplateMo 595 3d coverflow
Modified for Google Apps Script dynamic data

*/

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
// Fetch data from Google Apps Script
// =====================
fetch('https://script.google.com/macros/s/AKfycbyvJ0NJ-x60hU4VTcaAvzjLnXtK2w53qQIyGHCruxC1ourHPp0tkvGuv5smsykw1UpTKg/exec')
  .then(res => res.json())
  .then(async data => {
    imageData = data;
    if (!imageData.length) return;
  
    await preloadImages(imageData); // 🚀 เร็วขึ้นชัดเจน
  
    buildCoverflow();
    initImages();
    updateCoverflow();
    startAutoplay();
  });

  .catch(err => {
    console.error(err);
    currentTitle.textContent = 'โหลดข้อมูลไม่สำเร็จ';
    currentDescription.textContent = '';
  });

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


//โหลดรูป ล่วงหน้า (Preload images)

function preloadImages(data) {
  return Promise.all(
    data.map(item => new Promise(resolve => {
      const img = new Image();
      img.src = item.image;
      img.onload = resolve;
      img.onerror = resolve;
    }))
  );
}

