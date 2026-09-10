const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav-list');
if (toggle && nav) {
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
}

document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

const filterButtons = document.querySelectorAll('[data-filter]');
const galleryItems = document.querySelectorAll('[data-category]');
filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    filterButtons.forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    const filter = button.dataset.filter;
    galleryItems.forEach((item) => { item.hidden = filter !== 'all' && item.dataset.category !== filter; });
  });
});

document.querySelectorAll('.play-button').forEach((button) => {
  button.addEventListener('click', () => {
    const isPlaying = button.getAttribute('aria-pressed') === 'true';
    button.setAttribute('aria-pressed', String(!isPlaying));
    button.textContent = isPlaying ? '▶' : 'Ⅱ';
    button.setAttribute('aria-label', isPlaying ? '영상 재생' : '영상 일시정지');
  });
});
