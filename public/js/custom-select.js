/**
 * OmniBrowser Custom Select Dropdown Component
 * Replaces native OS <select> popups with modern, sleek HTML dropdowns.
 * Completely eliminates Windows OS white-on-white text rendering bugs.
 */

(function() {
  function makeCustomSelect(selectEl) {
    if (!selectEl || selectEl.dataset.customized === 'true') return;
    selectEl.dataset.customized = 'true';

    const parent = selectEl.parentNode;
    if (!parent) return;

    // Create wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'uiv-custom-select-wrapper';
    
    // Copy width styles if present
    if (selectEl.style.width) wrapper.style.width = selectEl.style.width;
    if (selectEl.style.minWidth) wrapper.style.minWidth = selectEl.style.minWidth;
    if (selectEl.id === 'filter-group-select') {
      wrapper.style.minWidth = '180px';
    } else if (selectEl.id === 'sync-master-select' || selectEl.id === 'form-kernel') {
      wrapper.style.width = '100%';
    }

    // Insert wrapper before select and move select inside
    parent.insertBefore(wrapper, selectEl);
    wrapper.appendChild(selectEl);

    // Keep select in DOM but hide it visually
    selectEl.style.position = 'absolute';
    selectEl.style.opacity = '0';
    selectEl.style.pointerEvents = 'none';
    selectEl.style.width = '1px';
    selectEl.style.height = '1px';
    selectEl.style.zIndex = '-1';

    // Create custom trigger button
    const trigger = document.createElement('div');
    trigger.className = 'uiv-custom-select-trigger';
    trigger.tabIndex = 0;

    const label = document.createElement('span');
    label.className = 'uiv-custom-select-label';

    const arrow = document.createElement('span');
    arrow.className = 'uiv-custom-select-arrow';
    arrow.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;

    trigger.appendChild(label);
    trigger.appendChild(arrow);
    wrapper.appendChild(trigger);

    // Create floating menu
    const menu = document.createElement('div');
    menu.className = 'uiv-custom-select-menu';
    wrapper.appendChild(menu);

    let isSyncing = false;

    function syncOptions() {
      if (isSyncing) return;
      isSyncing = true;

      menu.innerHTML = '';
      const options = Array.from(selectEl.options);
      const selectedIndex = selectEl.selectedIndex >= 0 ? selectEl.selectedIndex : 0;
      const currentOpt = options[selectedIndex] || options[0];

      label.innerText = currentOpt ? currentOpt.text : 'Chọn...';
      label.title = label.innerText;

      if (options.length === 0) {
        const emptyItem = document.createElement('div');
        emptyItem.className = 'uiv-custom-select-item disabled';
        emptyItem.innerText = '(Không có tùy chọn)';
        menu.appendChild(emptyItem);
        isSyncing = false;
        return;
      }

      options.forEach((opt, idx) => {
        const item = document.createElement('div');
        item.className = 'uiv-custom-select-item';
        if (idx === selectEl.selectedIndex) {
          item.classList.add('selected');
        }
        if (opt.disabled) {
          item.classList.add('disabled');
        }
        item.innerText = opt.text;
        item.title = opt.text;

        item.addEventListener('click', (e) => {
          e.stopPropagation();
          if (opt.disabled) return;

          selectEl.selectedIndex = idx;
          selectEl.value = opt.value;
          label.innerText = opt.text;
          wrapper.classList.remove('open');

          // Trigger change & input events on native select for full reactivity
          selectEl.dispatchEvent(new Event('change', { bubbles: true }));
          selectEl.dispatchEvent(new Event('input', { bubbles: true }));

          // Re-render selection highlights
          syncOptions();
        });

        menu.appendChild(item);
      });

      isSyncing = false;
    }

    // Toggle dropdown
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const wasOpen = wrapper.classList.contains('open');
      // Close all other dropdowns
      document.querySelectorAll('.uiv-custom-select-wrapper.open').forEach(w => {
        if (w !== wrapper) w.classList.remove('open');
      });
      if (!wasOpen) {
        wrapper.classList.add('open');
        syncOptions();
      } else {
        wrapper.classList.remove('open');
      }
    });

    // Keyboard support: Enter/Space toggles, Escape closes
    trigger.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        wrapper.classList.toggle('open');
      } else if (e.key === 'Escape') {
        wrapper.classList.remove('open');
      }
    });

    // Observer: auto-update when JS changes <option> elements or attributes
    const observer = new MutationObserver(() => {
      syncOptions();
    });
    observer.observe(selectEl, { childList: true, subtree: true, attributes: true, characterData: true });

    selectEl.addEventListener('change', syncOptions);

    syncOptions();
  }

  // Global close on click outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.uiv-custom-select-wrapper')) {
      document.querySelectorAll('.uiv-custom-select-wrapper.open').forEach(w => w.classList.remove('open'));
    }
  });

  // Global ESC key to close any open custom select
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.uiv-custom-select-wrapper.open').forEach(w => w.classList.remove('open'));
    }
  });

  function initAllCustomSelects() {
    const targets = [
      '#filter-group-select',
      '#sync-master-select',
      '#form-kernel',
      '#form-proxy-select',
      '#form-resolution',
      '#form-webrtc',
      '#bulk-form-group',
      '#bulk-form-os',
      '#bulk-form-webrtc',
      '#tab-proxy-hub-select'
    ];

    targets.forEach(sel => {
      const el = document.querySelector(sel);
      if (el) makeCustomSelect(el);
    });

    // Also pick up any other select.form-control
    document.querySelectorAll('select.form-control').forEach(el => {
      makeCustomSelect(el);
    });
  }

  window.makeCustomSelect = makeCustomSelect;
  window.initAllCustomSelects = initAllCustomSelects;

  // Auto-init on DOMContentLoaded and on periodic intervals for dynamically created modals
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAllCustomSelects);
  } else {
    initAllCustomSelects();
  }

  // Check periodically or after tab switches
  setInterval(initAllCustomSelects, 1000);
})();
