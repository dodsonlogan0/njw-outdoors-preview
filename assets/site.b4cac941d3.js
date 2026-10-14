// NJW Outdoors — small site script: mobile menu + quote form.
(function () {
  'use strict';

  // ── Mobile menu ──────────────────────────────────────────────────────────
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('main-nav');
  if (toggle && nav) {
    var openIcon = toggle.innerHTML;
    var closeIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
    var setOpen = function (open) {
      nav.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      toggle.innerHTML = open ? closeIcon : openIcon;
    };
    toggle.addEventListener('click', function () { setOpen(!nav.classList.contains('open')); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.classList.contains('open')) { setOpen(false); toggle.focus(); } });
  }

  // ── Thank-you page: commercial note ──────────────────────────────────────
  var params = new URLSearchParams(location.search);
  if (document.getElementById('ty-commercial') && params.get('type') === 'commercial') {
    document.getElementById('ty-commercial').hidden = false;
  }

  // ── Quote form ───────────────────────────────────────────────────────────
  var form = document.getElementById('quote-form');
  if (!form) return;

  var MAX_FILES = 5;
  var MAX_FILE_MB = 10;
  var statusEl = document.getElementById('form-status');
  var businessField = document.getElementById('business-field');
  var businessInput = document.getElementById('businessName');
  var photos = document.getElementById('photos');
  var fileList = document.getElementById('file-list');
  var submitBtn = form.querySelector('button[type=submit]');
  var submitLabel = submitBtn.textContent;

  document.getElementById('startedAt').value = String(Date.now());
  document.getElementById('source').value = location.pathname + location.search;

  function syncType() {
    var commercial = form.querySelector('input[name=customerType]:checked').value === 'commercial';
    businessField.hidden = !commercial;
    businessInput.required = commercial;
    if (!commercial) setError('businessName', '');
  }
  form.querySelectorAll('input[name=customerType]').forEach(function (r) { r.addEventListener('change', syncType); });

  // Pre-select from the URL: /quote/?service=aeration  or  ?type=commercial
  var pre = params.get('service');
  if (pre) {
    pre.split(',').forEach(function (slug) {
      var box = form.querySelector('input[name=services][value="' + slug.replace(/[^a-z0-9-]/g, '') + '"]');
      if (box) box.checked = true;
    });
  }
  if (params.get('type') === 'commercial') {
    form.querySelector('input[name=customerType][value=commercial]').checked = true;
  }
  syncType();

  function setError(name, msg) {
    var el = document.getElementById(name + '-error');
    var input = form.querySelector('[name=' + name + ']');
    if (el) el.textContent = msg;
    if (input && input.type !== 'checkbox' && input.type !== 'file') {
      if (msg) { input.setAttribute('aria-invalid', 'true'); input.setAttribute('aria-describedby', name + '-error'); }
      else input.removeAttribute('aria-invalid');
    }
  }

  photos.addEventListener('change', function () {
    fileList.innerHTML = '';
    var files = Array.prototype.slice.call(photos.files);
    files.forEach(function (f) {
      var li = document.createElement('li');
      li.textContent = f.name + ' (' + (f.size / 1048576).toFixed(1) + ' MB)';
      fileList.appendChild(li);
    });
    setError('photos', validatePhotos());
  });

  function validatePhotos() {
    var files = Array.prototype.slice.call(photos.files || []);
    if (files.length > MAX_FILES) return 'Please choose up to ' + MAX_FILES + ' photos.';
    for (var i = 0; i < files.length; i++) {
      if (files[i].type && files[i].type.indexOf('image/') !== 0) return '"' + files[i].name + '" is not a photo.';
      if (files[i].size > MAX_FILE_MB * 1048576) return '"' + files[i].name + '" is over ' + MAX_FILE_MB + ' MB.';
    }
    return '';
  }

  function validate() {
    var errors = {};
    var val = function (n) { return (form.elements[n].value || '').trim(); };
    if (!businessField.hidden && !val('businessName')) errors.businessName = 'Please enter the business or property name.';
    if (val('name').length < 2) errors.name = 'Please enter your name.';
    var digits = val('phone').replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 11) errors.phone = 'Please enter a 10-digit phone number.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val('email'))) errors.email = 'Please enter a valid email address.';
    if (val('address').length < 5) errors.address = 'Please enter the property address.';
    if (!form.querySelector('input[name=services]:checked')) errors.services = 'Please pick at least one service.';
    var p = validatePhotos();
    if (p) errors.photos = p;
    ['businessName', 'name', 'phone', 'email', 'address', 'services', 'photos'].forEach(function (n) { setError(n, errors[n] || ''); });
    return errors;
  }

  // Re-validate a field once the user fixes it
  form.addEventListener('input', function (e) {
    if (e.target.getAttribute('aria-invalid') === 'true') validate();
  });
  form.addEventListener('change', function (e) {
    if (e.target.name === 'services' && document.getElementById('services-error').textContent) validate();
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    statusEl.className = 'form-status';
    statusEl.textContent = '';
    var errors = validate();
    var first = Object.keys(errors)[0];
    if (first) {
      statusEl.className = 'form-status error';
      statusEl.textContent = 'Please fix the highlighted fields.';
      var target = first === 'services' ? form.querySelector('input[name=services]') : form.querySelector('[name=' + first + ']');
      if (target) target.focus();
      return;
    }
    // Preview builds (npm run preview:publish) have no server behind them.
    if (document.documentElement.hasAttribute('data-preview')) {
      statusEl.className = 'form-status info';
      statusEl.textContent = 'This is a preview of the new site, so the form doesn\'t send yet. It will once the site goes live. For now, call or text (608) 769-0278.';
      return;
    }
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';
    statusEl.className = 'form-status info';
    statusEl.textContent = photos.files.length ? 'Uploading your photos…' : 'Sending…';

    fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) { return { ok: res.ok, status: res.status, data: data }; });
      })
      .then(function (r) {
        if (r.ok && r.data.ok) {
          var type = form.querySelector('input[name=customerType]:checked').value;
          location.href = (document.documentElement.getAttribute('data-base') || '') + '/thank-you/' +(type === 'commercial' ? '?type=commercial' : '');
          return;
        }
        if (r.data.errors) {
          Object.keys(r.data.errors).forEach(function (n) { setError(n, r.data.errors[n]); });
        }
        throw new Error(r.data.message || 'Something went wrong.');
      })
      .catch(function (err) {
        submitBtn.disabled = false;
        submitBtn.textContent = submitLabel;
        statusEl.className = 'form-status error';
        statusEl.textContent = (err && err.message && err.message !== 'Failed to fetch' ? err.message : 'We could not send your request.') +
          ' You can also call or text (608) 769-0278.';
      });
  });
})();
