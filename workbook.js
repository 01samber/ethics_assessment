(() => {
  const data = window.ASSESSMENT_DATA;
  const app = document.getElementById("app");
  const toggleAnswersEl = document.getElementById("toggleAnswers");

  if (!data || !app) return;

  const clean = (s) => String(s ?? "").replaceAll("�", "–");
  const normalize = (s) =>
    String(s || "")
      .toLowerCase()
      .replaceAll("�", "–")
      .replace(/\s+/g, " ")
      .trim();

  // Lenis smooth scrolling (subtle; safe to disable)
  let lenis = null;
  if (window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.08, wheelMultiplier: 0.9, smoothWheel: true });
    const raf = (t) => {
      lenis.raf(t);
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }

  // Three.js lightweight background (stars)
  function initThreeBg() {
    const canvas = document.getElementById("bg3d");
    if (!canvas || !window.THREE) return;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
    camera.position.z = 12;

    const starCount = 900;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      pos[i3 + 0] = (Math.random() - 0.5) * 24;
      pos[i3 + 1] = (Math.random() - 0.5) * 18;
      pos[i3 + 2] = (Math.random() - 0.5) * 18;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ size: 0.035, color: 0xbfd2ff, transparent: true, opacity: 0.75 });
    const points = new THREE.Points(geo, mat);
    scene.add(points);

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", resize, { passive: true });
    resize();

    const tick = () => {
      points.rotation.y += 0.0009;
      points.rotation.x += 0.0004;
      renderer.render(scene, camera);
      requestAnimationFrame(tick);
    };
    tick();
  }
  initThreeBg();

  // Barba + GSAP page transitions
  function initBarba() {
    if (!window.barba || !window.gsap) return;
    window.barba.init({
      transitions: [
        {
          name: "fade-slide",
          async leave({ current }) {
            await window.gsap.to(current.container, { opacity: 0, y: -10, duration: 0.22, ease: "power2.out" });
          },
          enter({ next }) {
            window.gsap.fromTo(next.container, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.28, ease: "power2.out" });
          },
        },
      ],
    });
  }
  initBarba();

  const PROFILE_KEY = "ethics_assessment_profile_v2";
  const STEP_KEY = "ethics_assessment_steps_v1";

  function loadProfile() {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return {
      studentName: "Samer Berbara",
      doctorName: "Mahmoud Samad",
      date: new Date().toISOString().slice(0, 10),
    };
  }

  function saveProfile(p) {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
    } catch {}
  }

  function loadSteps() {
    try {
      const raw = localStorage.getItem(STEP_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return { A: 0, B: 0 };
  }

  function saveSteps(s) {
    try {
      localStorage.setItem(STEP_KEY, JSON.stringify(s));
    } catch {}
  }

  let profile = loadProfile();
  let steps = loadSteps();

  function setShowAnswersFlag() {
    const show = !!toggleAnswersEl?.checked;
    document.documentElement.dataset.showAnswers = show ? "1" : "0";
  }

  const questions = (() => {
    /** @type {Array<{id:number, part:"A"|"B", sectionHeading:string, kind:"mcq"|"tf", prompt:string, choices:string[]|null, answer:string}>} */
    const out = [];
    (data.sections || []).forEach((section) => {
      const cols = section.columns || [];
      const sectionHeading = clean(section.heading || "Section");
      const part = normalize(sectionHeading).includes("part b") ? "B" : "A";
      const answerColIdx = cols.findIndex((c) => normalize(c).includes("correct answer"));
      (section.rows || []).forEach((row, idx) => {
        if (idx === 0 && normalize(row[0]) === "q#") return;
        const id = Number(row[0]);
        if (!Number.isFinite(id)) return;
        if (cols.length >= 7) {
          out.push({
            id,
            part,
            sectionHeading,
            kind: "mcq",
            prompt: clean(row[1]),
            choices: [clean(row[2]), clean(row[3]), clean(row[4]), clean(row[5])],
            answer: clean(row[answerColIdx] ?? ""),
          });
        } else {
          out.push({
            id,
            part,
            sectionHeading,
            kind: "tf",
            prompt: clean(row[1]),
            choices: ["True", "False"],
            answer: clean(row[answerColIdx] ?? row[2] ?? ""),
          });
        }
      });
    });
    out.sort((a, b) => a.id - b.id);
    return out;
  })();

  const partA = questions.filter((q) => q.part === "A");
  const partB = questions.filter((q) => q.part === "B");

  function namespace() {
    const el = document.querySelector("[data-barba-namespace]");
    return el?.getAttribute("data-barba-namespace") || "intro";
  }

  // Anime.js helper for subtle pop
  function animePop(el) {
    if (!window.anime || !el) return;
    window.anime({
      targets: el,
      translateY: [10, 0],
      opacity: [0, 1],
      duration: 420,
      easing: "easeOutCubic",
    });
  }

  function renderIntro() {
    app.innerHTML = "";

    const formatDateForCover = (iso) => {
      const s = String(iso || "").trim();
      const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!m) return clean(s);
      return `${m[2]}/${m[3]}/${m[1]}`;
    };

    const parseCoverDateToIso = (value) => {
      const s = String(value || "").trim();
      const mIso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (mIso) return `${mIso[1]}-${mIso[2]}-${mIso[3]}`;
      const mUs = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (mUs) return `${mUs[3]}-${mUs[1]}-${mUs[2]}`;
      return s;
    };

    const wrap = document.createElement("div");
    wrap.className = "glass hero-gradient p-4 p-lg-5";
    wrap.innerHTML = `
      <div class="row g-4">
        <div class="col-12">
          <div class="cover-card cover-card--full">
            <div class="cover-spine" aria-hidden="true"></div>
            <div class="cover-body">
              <div class="cover-kicker">Cover</div>
              <div class="cover-title">${clean(data.title || "Ethics Assessment")}</div>
              <div class="cover-meta">
                <div class="cover-meta-row">
                  <div class="cover-label">Name</div>
                  <div class="cover-value cover-editable" id="coverStudent" contenteditable="true" role="textbox" aria-label="Name">${clean(profile.studentName)}</div>
                </div>
                <div class="cover-meta-row">
                  <div class="cover-label">Name of Dr</div>
                  <div class="cover-value cover-editable" id="coverDoctor" contenteditable="true" role="textbox" aria-label="Name of Dr">${clean(profile.doctorName)}</div>
                </div>
                <div class="cover-meta-row">
                  <div class="cover-label">Date</div>
                  <div class="cover-value cover-editable" id="coverDate" contenteditable="true" role="textbox" aria-label="Date">${formatDateForCover(profile.date)}</div>
                </div>
              </div>
              <div class="cover-actions no-print">
                <a class="btn btn-light btn-lg" href="part-a.html">Part A</a>
                <a class="btn btn-outline-light btn-lg" href="part-b.html">Part B</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    app.appendChild(wrap);
    animePop(wrap);

    const coverStudent = wrap.querySelector("#coverStudent");
    const coverDoctor = wrap.querySelector("#coverDoctor");
    const coverDate = wrap.querySelector("#coverDate");

    const sync = () => {
      profile = {
        studentName: clean(coverStudent?.textContent || profile.studentName),
        doctorName: clean(coverDoctor?.textContent || profile.doctorName),
        date: parseCoverDateToIso(clean(coverDate?.textContent || profile.date)),
      };
      saveProfile(profile);
      if (coverStudent) coverStudent.textContent = clean(profile.studentName);
      if (coverDoctor) coverDoctor.textContent = clean(profile.doctorName);
      if (coverDate) coverDate.textContent = formatDateForCover(profile.date);
    };

    const wireEditable = (el) => {
      if (!el) return;
      el.addEventListener("blur", sync);
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          el.blur();
        }
      });
    };
    wireEditable(coverStudent);
    wireEditable(coverDoctor);
    wireEditable(coverDate);

  }

  function renderWorkbook(part) {
    app.innerHTML = "";
    const list = part === "A" ? partA : partB;
    const total = list.length;
    const step = Math.min(Math.max(Number(steps[part] || 0), 0), Math.max(total - 1, 0));
    steps[part] = step;
    saveSteps(steps);

    const item = list[step];

    const top = document.createElement("div");
    top.className = "glass hero-gradient p-3 p-lg-4";
    top.innerHTML = `
      <div class="workbook-stepper">
        <div>
          <div class="text-uppercase small text-body-secondary mb-1">Workbook</div>
          <div class="d-flex flex-wrap align-items-center gap-2">
            <div class="h4 mb-0">Part ${part}</div>
            <span class="badge text-bg-dark">${clean(profile.studentName)}</span>
            <span class="badge text-bg-dark">Dr ${clean(profile.doctorName)}</span>
            <span class="badge text-bg-dark">Date ${clean(profile.date)}</span>
          </div>
        </div>
        <div class="d-flex gap-2 no-print">
          <a class="btn btn-outline-dark btn-sm" href="intro.html">Intro</a>
          <a class="btn btn-outline-dark btn-sm" href="${part === "A" ? "part-b.html" : "part-a.html"}">Switch part</a>
        </div>
      </div>
      <div class="mt-3">
        <div class="d-flex align-items-center justify-content-between small text-body-secondary mb-1">
          <div>Progress</div>
          <div>${step + 1} / ${total}</div>
        </div>
        <div class="progress" role="progressbar" aria-label="Progress" aria-valuenow="${step + 1}" aria-valuemin="0" aria-valuemax="${total}">
          <div class="progress-bar" style="width:${total ? Math.round(((step + 1) / total) * 100) : 0}%"></div>
        </div>
      </div>
    `;

    const card = document.createElement("div");
    card.className = "glass p-3 p-lg-4";
    card.innerHTML = `
      <div class="text-uppercase small text-body-secondary mb-1">${clean(item.sectionHeading)}</div>
      <div class="d-flex align-items-center gap-2 mb-2">
        <span class="badge text-bg-primary">Q${item.id}</span>
        <span class="fw-semibold">Question</span>
      </div>
      <div class="h5 mb-3">${clean(item.prompt)}</div>
      <div id="choiceList" class="list-group"></div>
      <div class="answer mt-3">
        <div class="alert alert-info mb-0"><strong>Correct answer:</strong> ${clean(item.answer)}</div>
      </div>
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3 no-print">
        <div class="btn-group">
          <button class="btn btn-outline-dark" type="button" id="prevBtn" ${step === 0 ? "disabled" : ""}>Previous</button>
          <button class="btn btn-outline-dark" type="button" id="nextBtn" ${step === total - 1 ? "disabled" : ""}>Next</button>
        </div>
        <div class="d-flex gap-2 align-items-center">
          <label class="small text-body-secondary mb-0" for="jumpTo">Jump</label>
          <select class="form-select form-select-sm" id="jumpTo" style="max-width:140px"></select>
        </div>
      </div>
    `;

    const listEl = card.querySelector("#choiceList");
    if (item.kind === "mcq") {
      const labels = ["A", "B", "C", "D"];
      item.choices.forEach((choice, idx) => {
        const row = document.createElement("div");
        row.className = "list-group-item d-flex gap-3 align-items-start";
        row.innerHTML = `<span class="badge text-bg-light border">${labels[idx]}</span><div class="flex-grow-1">${clean(choice)}</div>`;
        listEl.appendChild(row);
      });
    } else {
      ["True", "False"].forEach((choice) => {
        const row = document.createElement("div");
        row.className = "list-group-item";
        row.textContent = choice;
        listEl.appendChild(row);
      });
    }

    const jump = card.querySelector("#jumpTo");
    list.forEach((q, i) => {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = `Q${q.id}`;
      if (i === step) opt.selected = true;
      jump.appendChild(opt);
    });

    const prevBtn = card.querySelector("#prevBtn");
    const nextBtn = card.querySelector("#nextBtn");

    const go = (nextIdx, dir) => {
      const clamped = Math.min(Math.max(nextIdx, 0), total - 1);
      steps[part] = clamped;
      saveSteps(steps);
      if (window.gsap) {
        window.gsap.fromTo(card, { x: dir === "left" ? 18 : -18, opacity: 0 }, { x: 0, opacity: 1, duration: 0.22, ease: "power2.out" });
      } else if (window.anime) {
        window.anime({ targets: card, translateX: [dir === "left" ? 18 : -18, 0], opacity: [0, 1], duration: 260, easing: "easeOutCubic" });
      }
      renderWorkbook(part);
      if (lenis) lenis.scrollTo(0, { immediate: false });
    };

    prevBtn?.addEventListener("click", () => go(step - 1, "right"));
    nextBtn?.addEventListener("click", () => go(step + 1, "left"));
    jump?.addEventListener("change", (e) => {
      const nextIdx = Number(e.target.value);
      go(nextIdx, nextIdx > step ? "left" : "right");
    });

    app.appendChild(top);
    app.appendChild(card);
    animePop(top);
    animePop(card);
  }

  // global hooks
  toggleAnswersEl?.addEventListener("change", setShowAnswersFlag);

  setShowAnswersFlag();
  const ns = namespace();
  if (ns === "partA") renderWorkbook("A");
  else if (ns === "partB") renderWorkbook("B");
  else renderIntro();
})();

