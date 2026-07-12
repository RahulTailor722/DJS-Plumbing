/* ============================================================
   DJS Plumbing and Heating — main.js
   Vanilla JS + GSAP/ScrollTrigger + Lenis smooth scroll.
   ============================================================ */
(function () {
  'use strict';

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.documentElement.classList.remove('no-js');

  /* ----------------------------------------------------------
     MOBILE NAV
     ---------------------------------------------------------- */
  (function nav() {
    var toggle = document.getElementById('navToggle');
    var closeBtn = document.getElementById('navClose');
    var navEl = document.getElementById('nav');
    if (!toggle || !navEl) return;

    // Overlay element
    var overlay = document.createElement('div');
    overlay.className = 'nav-overlay';
    document.body.appendChild(overlay);

    function open() {
      navEl.classList.add('is-open');
      overlay.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }
    function close() {
      navEl.classList.remove('is-open');
      overlay.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }

    toggle.addEventListener('click', open);
    if (closeBtn) closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', close);
    navEl.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', close);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });
  })();

  /* ----------------------------------------------------------
     STICKY HEADER SHADOW ON SCROLL
     ---------------------------------------------------------- */
  (function headerScroll() {
    var header = document.getElementById('header');
    if (!header) return;
    function update(y) {
      header.classList.toggle('is-scrolled', y > 10);
    }
    update(window.scrollY);
    window.addEventListener('scroll', function () { update(window.scrollY); }, { passive: true });
    // Also update from Lenis (set below)
    window.__djsHeaderUpdate = update;
  })();

  /* ----------------------------------------------------------
     LENIS SMOOTH SCROLL  (mandatory, synced to GSAP ScrollTrigger)
     ---------------------------------------------------------- */
  var lenis = null;
  var hasGSAP = typeof window.gsap !== 'undefined';
  var hasST = hasGSAP && typeof window.ScrollTrigger !== 'undefined';

  if (hasST) gsap.registerPlugin(ScrollTrigger);

  if (typeof window.Lenis !== 'undefined' && !prefersReduced) {
    lenis = new Lenis({
      duration: 1.1,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true
    });

    // Keep ScrollTrigger in sync with Lenis
    if (hasST) {
      lenis.on('scroll', ScrollTrigger.update);
    }
    lenis.on('scroll', function (e) {
      if (window.__djsHeaderUpdate) window.__djsHeaderUpdate(e.scroll || window.scrollY);
    });

    // Single shared requestAnimationFrame loop driving both Lenis and GSAP
    if (hasGSAP) {
      gsap.ticker.add(function (time) {
        lenis.raf(time * 1000); // gsap ticker time is in seconds
      });
      gsap.ticker.lagSmoothing(0);
    } else {
      // Fallback rAF loop if GSAP is unavailable
      var raf = function (t) { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }

  /* ----------------------------------------------------------
     ANCHOR LINKS — smooth scroll via Lenis (accounts for sticky header)
     ---------------------------------------------------------- */
  (function anchorScroll() {
    var headerH = 70;
    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        var id = link.getAttribute('href');
        if (id === '#' || id.length < 2) return;
        var target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        if (lenis) {
          lenis.scrollTo(target, { offset: -headerH });
        } else {
          var y = target.getBoundingClientRect().top + window.scrollY - headerH;
          window.scrollTo({ top: y, behavior: prefersReduced ? 'auto' : 'smooth' });
        }
      });
    });
  })();

  /* ----------------------------------------------------------
     GSAP ENTRANCE ANIMATIONS
     ---------------------------------------------------------- */
  if (hasST && !prefersReduced) {
    // Now that GSAP is confirmed loaded, allow the [data-anim] hide rule to apply,
    // then animate elements in. (Elements were visible until this point.)
    document.documentElement.classList.add('gsap-ready');

    // Generic reveal-on-scroll for every [data-anim] element
    gsap.utils.toArray('[data-anim]').forEach(function (el) {
      var type = el.getAttribute('data-anim');
      var from = { opacity: 0, y: 40 };
      if (type === 'fade-in') from = { opacity: 0, y: 0, scale: 0.98 };

      gsap.fromTo(el, from, {
        opacity: 1, y: 0, scale: 1, duration: 0.8, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' }
      });
    });

    // Stagger the service / why / process / review cards within their grids
    ['.services__grid', '.why__grid', '.process__flow', '.testimonials__grid'].forEach(function (sel) {
      var grid = document.querySelector(sel);
      if (!grid) return;
      var items = grid.querySelectorAll('[data-anim]');
      gsap.fromTo(items, { opacity: 0, y: 46 }, {
        opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.12,
        scrollTrigger: { trigger: grid, start: 'top 82%' }
      });
    });

    // Subtle parallax on hero background
    var heroBg = document.querySelector('.hero__bg');
    if (heroBg) {
      gsap.to(heroBg, {
        yPercent: 18, ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
      });
    }
  } else {
    // No GSAP or reduced motion → just show everything
    document.querySelectorAll('[data-anim]').forEach(function (el) { el.style.opacity = 1; });
  }

  /* ----------------------------------------------------------
     STAT COUNT-UP ON SCROLL
     ---------------------------------------------------------- */
  (function statCounters() {
    var nums = document.querySelectorAll('.stat__num[data-count]');
    if (!nums.length) return;

    function animate(el) {
      var target = parseInt(el.getAttribute('data-count'), 10) || 0;
      var suffix = el.getAttribute('data-suffix') || '';
      if (prefersReduced) { el.textContent = target + suffix; return; }
      var obj = { v: 0 };
      if (hasGSAP) {
        gsap.to(obj, {
          v: target, duration: 1.6, ease: 'power2.out',
          onUpdate: function () { el.textContent = Math.round(obj.v) + suffix; }
        });
      } else {
        el.textContent = target + suffix;
      }
    }

    if (hasST && !prefersReduced) {
      nums.forEach(function (el) {
        ScrollTrigger.create({
          trigger: el, start: 'top 90%', once: true,
          onEnter: function () { animate(el); }
        });
      });
    } else {
      // Fallback: IntersectionObserver
      if ('IntersectionObserver' in window && !prefersReduced) {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            if (en.isIntersecting) { animate(en.target); io.unobserve(en.target); }
          });
        }, { threshold: 0.5 });
        nums.forEach(function (el) { io.observe(el); });
      } else {
        nums.forEach(function (el) {
          el.textContent = (el.getAttribute('data-count') || '') + (el.getAttribute('data-suffix') || '');
        });
      }
    }
  })();

  /* ----------------------------------------------------------
     TRUST STRIP — seamless infinite loop
     ---------------------------------------------------------- */
  (function trustLoop() {
    var track = document.getElementById('trustTrack');
    if (!track || prefersReduced) return;

    // Duplicate content so the loop is seamless
    track.innerHTML += track.innerHTML;

    if (hasGSAP) {
      var half = track.scrollWidth / 2;
      gsap.to(track, {
        x: -half, duration: 22, ease: 'none', repeat: -1,
        modifiers: { x: function (x) { return (parseFloat(x) % half) + 'px'; } }
      });
    }
  })();

  /* ----------------------------------------------------------
     OUR WORK — full-image slider (arrows, dots, swipe, keyboard, autoplay)
     ---------------------------------------------------------- */
  (function workSlider() {
    var root = document.getElementById('workSlider');
    var track = document.getElementById('sliderTrack');
    var viewport = document.getElementById('sliderViewport');
    var prevBtn = document.getElementById('sliderPrev');
    var nextBtn = document.getElementById('sliderNext');
    var dotsWrap = document.getElementById('sliderDots');
    if (!root || !track || !dotsWrap) return;

    var slides = Array.prototype.slice.call(track.children);
    var count = slides.length;
    var index = 0;
    var dots = [];

    for (var i = 0; i < count; i++) {
      (function (i) {
        var dot = document.createElement('button');
        dot.className = 'slider__dot';
        dot.type = 'button';
        dot.setAttribute('role', 'tab');
        dot.setAttribute('aria-label', 'Go to project ' + (i + 1));
        dot.addEventListener('click', function () { goTo(i); });
        dotsWrap.appendChild(dot);
        dots.push(dot);
      })(i);
    }

    function update() {
      track.style.transform = 'translateX(' + (-index * 100) + '%)';
      dots.forEach(function (d, i) {
        var active = i === index;
        d.classList.toggle('is-active', active);
        d.setAttribute('aria-selected', active ? 'true' : 'false');
      });
    }
    function goTo(i) { index = (i + count) % count; update(); }
    function nextSlide() { goTo(index + 1); }
    function prevSlide() { goTo(index - 1); }

    if (nextBtn) nextBtn.addEventListener('click', function () { nextSlide(); restart(); });
    if (prevBtn) prevBtn.addEventListener('click', function () { prevSlide(); restart(); });

    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { nextSlide(); restart(); }
      else if (e.key === 'ArrowLeft') { prevSlide(); restart(); }
    });

    // Touch swipe (without blocking a tap that should open the lightbox)
    var startX = 0, dx = 0, dragging = false;
    if (viewport) {
      viewport.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; dx = 0; dragging = true; }, { passive: true });
      viewport.addEventListener('touchmove', function (e) { if (dragging) dx = e.touches[0].clientX - startX; }, { passive: true });
      viewport.addEventListener('touchend', function () {
        if (!dragging) return; dragging = false;
        if (Math.abs(dx) > 40) { dx < 0 ? nextSlide() : prevSlide(); restart(); }
      });
    }

    // Autoplay (paused on hover/focus, disabled for reduced motion)
    var timer = null;
    function start() { if (prefersReduced) return; stop(); timer = setInterval(nextSlide, 5000); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function restart() { stop(); start(); }
    root.addEventListener('mouseenter', stop);
    root.addEventListener('mouseleave', start);
    root.addEventListener('focusin', stop);
    root.addEventListener('focusout', start);

    update();
    start();
  })();

  /* ----------------------------------------------------------
     LIGHTBOX — opens the full-resolution project image
     ---------------------------------------------------------- */
  (function lightbox() {
    var box = document.getElementById('lightbox');
    var boxImg = document.getElementById('lightboxImg');
    var closeBtn = document.getElementById('lightboxClose');
    var triggers = document.querySelectorAll('.slide__btn[data-full]');
    if (!box || !boxImg || !triggers.length) return;

    function open(full, alt) {
      boxImg.src = full;
      boxImg.alt = alt || '';
      box.hidden = false;
      box.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      closeBtn.focus();
    }
    function close() {
      box.hidden = true;
      box.setAttribute('aria-hidden', 'true');
      boxImg.src = '';
      document.body.style.overflow = '';
    }

    triggers.forEach(function (item) {
      item.addEventListener('click', function () {
        var img = item.querySelector('img');
        open(item.getAttribute('data-full'), img ? img.alt : '');
      });
    });
    closeBtn.addEventListener('click', close);
    box.addEventListener('click', function (e) { if (e.target === box) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !box.hidden) close(); });
  })();

  /* ----------------------------------------------------------
     FORM VALIDATION + SUCCESS STATE
     ----------------------------------------------------------
     NOTE FOR CLIENT / DEV:
     These forms do NOT yet send anywhere. To capture leads, wire up
     one of the following inside `submitForm()`:
       (a) Formspree — set the <form> action to your Formspree endpoint
           and change this to a real fetch() POST; OR
       (b) mailto: — build a mailto link to derek@djsplumbingheating.ca; OR
       (c) your own backend / CRM endpoint.
     Until then, submissions only show the success message locally.
     ---------------------------------------------------------- */
  (function forms() {
    var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    var phoneRe = /[0-9]{7,}/; // at least 7 digits

    function setError(field, msg) {
      field.classList.add('has-error');
      var err = field.querySelector('[data-error]');
      if (err) err.textContent = msg;
    }
    function clearError(field) {
      field.classList.remove('has-error');
      var err = field.querySelector('[data-error]');
      if (err) err.textContent = '';
    }

    function validate(form) {
      var valid = true;
      form.querySelectorAll('.field').forEach(function (field) {
        var input = field.querySelector('input, select, textarea');
        if (!input) return;
        clearError(field);
        var val = (input.value || '').trim();

        if (input.required && !val) {
          setError(field, 'This field is required.'); valid = false; return;
        }
        if (val && input.type === 'email' && !emailRe.test(val)) {
          setError(field, 'Please enter a valid email.'); valid = false; return;
        }
        if (val && input.type === 'tel' && !phoneRe.test(val.replace(/\D/g, ''))) {
          setError(field, 'Please enter a valid phone number.'); valid = false; return;
        }
      });
      return valid;
    }

    function submitForm(form, successEl) {
      // ---- PLACEHOLDER: replace with real submission (Formspree/backend/mailto) ----
      // Example (Formspree):
      //   fetch('https://formspree.io/f/XXXX', { method:'POST', body:new FormData(form),
      //     headers:{Accept:'application/json'} }).then(...);
      // For now we just simulate success so no lead flow is lost during testing:
      form.hidden = true;
      if (successEl) {
        successEl.hidden = false;
        // Move focus for accessibility
        successEl.setAttribute('tabindex', '-1');
        successEl.focus();
      }
      // Log captured data to console so the client's dev can see the payload shape.
      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = v; });
      console.log('[DJS lead captured — wire up a real endpoint]', data);
    }

    ['quoteForm', 'contactForm'].forEach(function (id) {
      var form = document.getElementById(id);
      if (!form) return;
      var successEl = document.getElementById(id === 'quoteForm' ? 'quoteSuccess' : 'contactSuccess');

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (validate(form)) submitForm(form, successEl);
      });

      // Clear a field's error as the user fixes it
      form.querySelectorAll('input, select, textarea').forEach(function (input) {
        input.addEventListener('input', function () {
          var field = input.closest('.field');
          if (field && field.classList.contains('has-error')) clearError(field);
        });
      });
    });
  })();

  /* ----------------------------------------------------------
     Refresh ScrollTrigger once everything (images/fonts) settled
     ---------------------------------------------------------- */
  if (hasST) {
    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  }
})();
