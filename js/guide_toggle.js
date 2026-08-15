document.addEventListener('DOMContentLoaded', () => {
  const guide = document.querySelector('.usage-guide');
  const toggleButtons = document.querySelectorAll('[data-guide-toggle]');

  if (!guide || toggleButtons.length === 0) return;

  const setGuideVisibility = isVisible => {
    guide.classList.toggle('display', isVisible);
    toggleButtons.forEach(button => {
      button.setAttribute('aria-expanded', String(isVisible));
      if (guide.id) button.setAttribute('aria-controls', guide.id);
      button.classList.toggle('active', isVisible);
    });
  };

  const toggleGuide = event => {
    const isVisible = !guide.classList.contains('display');

    if (event.currentTarget.closest('#creditModal')) {
      const creditModal = document.getElementById('creditModal');
      if (creditModal) creditModal.style.display = 'none';
    }

    setGuideVisibility(isVisible);
    if (isVisible) guide.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  setGuideVisibility(guide.classList.contains('display'));

  toggleButtons.forEach(button => {
    button.addEventListener('click', event => toggleGuide(event));
    button.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      toggleGuide(event);
    });
  });
});
