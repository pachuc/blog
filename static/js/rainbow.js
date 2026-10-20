/**
 * Rainbow text - same register/odometer effect as the site title, applied to
 * every letter inside .rainbow elements (see the rainbow shortcode).
 * Colors come from window.tuiNavConfig.titleAnimationColors.
 */

(function() {
  'use strict';

  const config = window.tuiNavConfig || {};
  const colors = config.titleAnimationColors || ['#00ff00', '#00ffff', '#ff00ff', '#ffff00'];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function getRandomColor() {
    return colors[Math.floor(Math.random() * colors.length)];
  }

  // Split each text node into words (nowrap) of per-letter slots, leaving
  // whitespace as plain text so lines still wrap between words
  function splitLetters(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => node.parentElement.closest('code, pre')
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT,
    });
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);

    textNodes.forEach((node) => {
      const fragment = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) {
          fragment.appendChild(document.createTextNode(part));
          return;
        }
        const word = document.createElement('span');
        word.className = 'rainbow-word';
        for (const char of part) {
          const wrapper = document.createElement('span');
          wrapper.className = 'rainbow-char';
          const slot = document.createElement('span');
          slot.className = 'rainbow-slot';
          slot.textContent = char;
          wrapper.appendChild(slot);
          word.appendChild(wrapper);
        }
        fragment.appendChild(word);
      });
      node.replaceWith(fragment);
    });

    return root.querySelectorAll('.rainbow-slot');
  }

  function animateLetter(slot) {
    slot.classList.add('rainbow-rolling');
    // Change color midway through the roll
    setTimeout(() => {
      slot.style.color = getRandomColor();
    }, 150);
    setTimeout(() => {
      slot.classList.remove('rainbow-rolling');
    }, 400);
  }

  function animateAll(slots, stagger) {
    slots.forEach((slot, i) => {
      setTimeout(() => animateLetter(slot), i * stagger);
    });
  }

  function start(el) {
    const slots = splitLetters(el);
    if (slots.length === 0) return;

    slots.forEach((slot) => {
      slot.style.color = getRandomColor();
    });
    if (reduceMotion) return;

    animateAll(slots, 200);

    // Animate one random letter at a time
    setInterval(() => {
      animateLetter(slots[Math.floor(Math.random() * slots.length)]);
    }, 2000);

    // Occasionally animate all letters together
    setInterval(() => animateAll(slots, 100), 8000);
  }

  function init() {
    document.querySelectorAll('.rainbow').forEach(start);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
