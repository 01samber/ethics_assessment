(() => {
  const data = window.ASSESSMENT_DATA;
  const contentEl = document.getElementById("content");
  const toggleAnswersEl = document.getElementById("toggleAnswers");
  const printBtn = document.getElementById("printBtn");
  const navTitle = document.getElementById("navTitle");
  const navIntro = document.getElementById("navIntro");
  const navPartA = document.getElementById("navPartA");
  const navPartB = document.getElementById("navPartB");

  if (!data || !contentEl) return;

  const clean = (s) => String(s ?? "").replaceAll("�", "–");
  navTitle.textContent = clean(data.title || "Assessment");

  const normalize = (s) =>
    String(s || "")
      .toLowerCase()
      .replaceAll("�", "–")
      .replace(/\s+/g, " ")
      .trim();

  function buildQuestions() {
    /** @type {Array<{id:number, part:"A"|"B", sectionHeading:string, kind:"mcq"|"tf", prompt:string, choices:string[]|null, answer:string}>} */
    const questions = [];

    (data.sections || []).forEach((section) => {
      const cols = section.columns || [];
      const sectionHeading = clean(section.heading || "Section");
      const part = normalize(sectionHeading).includes("part b") ? "B" : "A";
      const answerColIdx = cols.findIndex((c) => normalize(c).includes("correct answer"));

      (section.rows || []).forEach((row, idx) => {
        if (idx === 0 && normalize(row[0]) === "q#") return; // header guard if ever present
        const id = Number(row[0]);
        if (!Number.isFinite(id)) return;

        if (cols.length >= 7) {
          questions.push({
            id,
            part,
            sectionHeading,
            kind: "mcq",
            prompt: clean(row[1]),
            choices: [clean(row[2]), clean(row[3]), clean(row[4]), clean(row[5])],
            answer: clean(row[answerColIdx] ?? ""),
          });
        } else {
          questions.push({
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

    questions.sort((a, b) => a.id - b.id);
    return questions;
  }

  const questions = buildQuestions();
  const partAQuestions = questions.filter((q) => q.part === "A");
  const partBQuestions = questions.filter((q) => q.part === "B");

  const PROFILE_KEY = "ethics_assessment_profile_v1";

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

  let profile = loadProfile();
  let lastStepIndex = { A: 0, B: 0 };
  let lastAnimDir = "in";

  function setShowAnswersFlag() {
    const showAnswers = !!toggleAnswersEl?.checked;
    document.documentElement.dataset.showAnswers = showAnswers ? "1" : "0";
  }

  function activeIdFromHash() {
    const raw = (window.location.hash || "#/intro").replace(/^#/, "");
    const parts = raw.split("/").filter(Boolean);
    if (parts[0] === "q" && parts[1]) {
      const id = Number(parts[1]);
      if (Number.isFinite(id)) return { route: "q", id };
    }
    if (parts[0] === "part" && (parts[1] === "a" || parts[1] === "b")) {
      return { route: "part", id: parts[1].toUpperCase() };
    }
    if (parts[0] === "intro") return { route: "intro", id: null };
    return { route: "intro", id: null };
  }

  function renderIntro() {
    contentEl.innerHTML = "";

    const wrap = document.createElement("div");
    wrap.className = "glass hero-gradient p-4 p-lg-5 workbook-anim";

    wrap.innerHTML = `
      <div class="row g-4 align-items-center">
        <div class="col-12 col-lg-7">
          <div class="text-uppercase small text-body-secondary mb-2">Workbook</div>
          <h1 class="display-6 fw-semibold mb-2">${clean(data.title || "Ethics Assessment")}</h1>
          <p class="text-body-secondary mb-0">
            Fill in the details below, then open Part A or Part B. Each part is presented as an animated workbook.
          </p>
        </div>
        <div class="col-12 col-lg-5">
          <div class="glass p-3">
            <div class="row g-3">
              <div class="col-12">
                <label class="form-label">Student name</label>
                <input class="form-control" id="studentName" value="${clean(profile.studentName)}" />
              </div>
              <div class="col-12">
                <label class="form-label">Doctor name</label>
                <input class="form-control" id="doctorName" value="${clean(profile.doctorName)}" />
              </div>
              <div class="col-12">
                <label class="form-label">Date</label>
                <input class="form-control" id="workDate" type="date" value="${clean(profile.date)}" />
              </div>
              <div class="col-12 d-grid gap-2 mt-1">
                <a class="btn btn-primary btn-lg" href="#/part/a">Open Part A</a>
                <a class="btn btn-outline-dark btn-lg" href="#/part/b">Open Part B</a>
                <button class="btn btn-outline-dark" type="button" id="introPrintBtn">Print / Save PDF</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    wrap.querySelector("#introPrintBtn")?.addEventListener("click", () => window.print());
    wrap.querySelector("#studentName")?.addEventListener("input", (e) => {
      profile = { ...profile, studentName: e.target.value };
      saveProfile(profile);
    });
    wrap.querySelector("#doctorName")?.addEventListener("input", (e) => {
      profile = { ...profile, doctorName: e.target.value };
      saveProfile(profile);
    });
    wrap.querySelector("#workDate")?.addEventListener("input", (e) => {
      profile = { ...profile, date: e.target.value };
      saveProfile(profile);
    });

    const tiles = document.createElement("div");
    tiles.className = "row g-3";
    tiles.innerHTML = `
      <div class="col-12 col-md-4">
        <div class="glass p-3 h-100 workbook-anim">
          <div class="fw-semibold mb-1">3 pages</div>
          <div class="text-body-secondary small">Intro, Part A, Part B.</div>
        </div>
      </div>
      <div class="col-12 col-md-4">
        <div class="glass p-3 h-100 workbook-anim" style="animation-delay:40ms">
          <div class="fw-semibold mb-1">Animated workbook</div>
          <div class="text-body-secondary small">Smooth transitions as you move between questions.</div>
        </div>
      </div>
      <div class="col-12 col-md-4">
        <div class="glass p-3 h-100 workbook-anim" style="animation-delay:80ms">
          <div class="fw-semibold mb-1">Printable</div>
          <div class="text-body-secondary small">Use Print / Save PDF for submission.</div>
        </div>
      </div>
    `;

    contentEl.appendChild(wrap);
    contentEl.appendChild(tiles);
  }

  function renderWorkbook(part) {
    const list = part === "A" ? partAQuestions : partBQuestions;
    const total = list.length;
    const step = Math.min(Math.max(lastStepIndex[part] ?? 0, 0), Math.max(total - 1, 0));
    lastStepIndex[part] = step;
    const item = list[step];

    contentEl.innerHTML = "";

    const header = document.createElement("div");
    header.className = `glass hero-gradient p-3 p-lg-4 workbook-anim`;
    header.innerHTML = `
      <div class="workbook-stepper">
        <div>
          <div class="text-uppercase small text-body-secondary mb-1">Assessment</div>
          <div class="d-flex flex-wrap align-items-center gap-2">
            <div class="h4 mb-0">Part ${part}</div>
            <span class="badge text-bg-dark">Student: ${clean(profile.studentName)}</span>
            <span class="badge text-bg-dark">Dr: ${clean(profile.doctorName)}</span>
            <span class="badge text-bg-dark">Date: ${clean(profile.date)}</span>
          </div>
        </div>
        <div class="d-flex gap-2 no-print">
          <button class="btn btn-outline-dark btn-sm" type="button" id="backToIntro">Intro</button>
        </div>
      </div>
      <div class="mt-3">
        <div class="d-flex align-items-center justify-content-between small text-body-secondary mb-1">
          <div>Progress</div>
          <div>Question ${step + 1} of ${total}</div>
        </div>
        <div class="progress" role="progressbar" aria-label="Progress" aria-valuenow="${step + 1}" aria-valuemin="0" aria-valuemax="${total}">
          <div class="progress-bar" style="width:${total ? Math.round(((step + 1) / total) * 100) : 0}%"></div>
        </div>
      </div>
    `;

    const card = document.createElement("div");
    card.className = `glass p-3 p-lg-4 ${lastAnimDir === "left" ? "slide-left" : lastAnimDir === "right" ? "slide-right" : "workbook-anim"}`;

    const prompt = document.createElement("div");
    prompt.className = "mb-3";
    prompt.innerHTML = `
      <div class="text-uppercase small text-body-secondary mb-1">${clean(item.sectionHeading)}</div>
      <div class="d-flex align-items-center gap-2 mb-2">
        <span class="badge text-bg-primary">Q${item.id}</span>
        <span class="fw-semibold">Question</span>
      </div>
      <div class="h5 mb-0">${clean(item.prompt)}</div>
    `;

    const answers = document.createElement("div");
    answers.className = "mt-3";

    if (item.kind === "mcq") {
      const labels = ["A", "B", "C", "D"];
      const listGroup = document.createElement("div");
      listGroup.className = "list-group";
      item.choices.forEach((choice, idx) => {
        const row = document.createElement("div");
        row.className = "list-group-item d-flex gap-3 align-items-start";
        row.innerHTML = `
          <span class="badge text-bg-light border">${labels[idx]}</span>
          <div class="flex-grow-1">${clean(choice)}</div>
        `;
        listGroup.appendChild(row);
      });
      answers.appendChild(listGroup);
    } else {
      const listGroup = document.createElement("div");
      listGroup.className = "list-group";
      ["True", "False"].forEach((choice) => {
        const row = document.createElement("div");
        row.className = "list-group-item";
        row.textContent = choice;
        listGroup.appendChild(row);
      });
      answers.appendChild(listGroup);
    }

    const correct = document.createElement("div");
    correct.className = "answer mt-3";
    correct.innerHTML = `
      <div class="alert alert-info mb-0">
        <strong>Correct answer:</strong> ${clean(item.answer)}
      </div>
    `;

    const controls = document.createElement("div");
    controls.className = "d-flex flex-wrap gap-2 justify-content-between align-items-center mt-3 no-print";
    controls.innerHTML = `
      <div class="btn-group">
        <button class="btn btn-outline-dark" type="button" id="prevBtn" ${step === 0 ? "disabled" : ""}>Previous</button>
        <button class="btn btn-outline-dark" type="button" id="nextBtn" ${step === total - 1 ? "disabled" : ""}>Next</button>
      </div>
      <div class="d-flex gap-2 align-items-center">
        <label class="small text-body-secondary mb-0" for="jumpTo">Jump</label>
        <select class="form-select form-select-sm" id="jumpTo" style="max-width:140px"></select>
      </div>
    `;

    const jump = controls.querySelector("#jumpTo");
    list.forEach((q, i) => {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = `Q${q.id}`;
      if (i === step) opt.selected = true;
      jump.appendChild(opt);
    });

    card.appendChild(prompt);
    card.appendChild(answers);
    card.appendChild(correct);
    card.appendChild(controls);

    contentEl.appendChild(header);
    contentEl.appendChild(card);

    header.querySelector("#backToIntro")?.addEventListener("click", () => (window.location.hash = "#/intro"));
    controls.querySelector("#prevBtn")?.addEventListener("click", () => {
      lastAnimDir = "right";
      lastStepIndex[part] = Math.max(0, lastStepIndex[part] - 1);
      renderWorkbook(part);
    });
    controls.querySelector("#nextBtn")?.addEventListener("click", () => {
      lastAnimDir = "left";
      lastStepIndex[part] = Math.min(total - 1, lastStepIndex[part] + 1);
      renderWorkbook(part);
    });
    jump?.addEventListener("change", (e) => {
      const nextIdx = Number(e.target.value);
      lastAnimDir = nextIdx > step ? "left" : "right";
      lastStepIndex[part] = nextIdx;
      renderWorkbook(part);
    });
  }

  function renderRoute() {
    setShowAnswersFlag();

    const route = activeIdFromHash();
    if (route.route === "part" && route.id === "A") renderWorkbook("A");
    else if (route.route === "part" && route.id === "B") renderWorkbook("B");
    else renderIntro();

    const r = activeIdFromHash();
    navIntro?.classList.toggle("active", r.route === "intro");
    navPartA?.classList.toggle("active", r.route === "part" && r.id === "A");
    navPartB?.classList.toggle("active", r.route === "part" && r.id === "B");
  }

  toggleAnswersEl?.addEventListener("change", () => {
    setShowAnswersFlag();
  });

  printBtn?.addEventListener("click", () => window.print());

  window.addEventListener("hashchange", renderRoute);

  setShowAnswersFlag();
  if (!window.location.hash) window.location.hash = "#/intro";
  renderRoute();
})();

