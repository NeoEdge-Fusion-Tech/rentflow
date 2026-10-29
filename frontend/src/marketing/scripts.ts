// @ts-nocheck
/*
 * Behaviour for the marketing pages, ported from the website export's
 * site.js and inline page scripts. The pages are static markup, so these
 * work on the DOM directly after the page mounts. Each returns an optional
 * cleanup.
 */
import { siteConfig } from "./config";

type Init = (root: HTMLElement) => void | (() => void);

const track = (name: string, params?: object) =>
  (window as any).neoTrack?.(name, params);

/** Product tour tabs, the cost calculator and "see all" expanders. */
export const initSite: Init = (root) => {
  const tabs = root.querySelectorAll(".pt-tab[data-tab]");
  const panels = root.querySelectorAll("[data-panel]");
  const show = (n) => {
    tabs.forEach((t) => {
      const on = t.getAttribute("data-tab") === n;
      t.classList.toggle("on", on);
      t.setAttribute("aria-pressed", on ? "true" : "false");
    });
    panels.forEach((p) => (p.hidden = p.getAttribute("data-panel") !== n));
  };
  tabs.forEach((t) =>
    t.addEventListener("click", () => show(t.getAttribute("data-tab"))),
  );

  const inputs = root.querySelectorAll("[data-calc]");
  if (inputs.length) {
    const naira = (n) => "₦" + Math.round(n).toLocaleString("en-NG");
    const val = (k) => {
      const el = root.querySelector('[data-calc="' + k + '"]');
      return el ? Number(el.value) : 0;
    };
    const set = (k, v) =>
      root
        .querySelectorAll('[data-out="' + k + '"]')
        .forEach((el) => (el.textContent = v));
    const update = () => {
      const events = val("events"),
        jobValue = val("jobValue"),
        kit = val("kit"),
        hours = val("hours");
      const slip = events * jobValue * 12 * 0.05;
      const kitYear = kit * 12;
      const days = Math.round((hours * 52) / 8);
      set("eventsLabel", events + " events");
      set("valueLabel", naira(jobValue));
      set("kitLabel", naira(kit));
      set("hoursLabel", hours + " hrs");
      set("slipLabel", naira(slip));
      set("kitYearLabel", naira(kitYear));
      set("daysLabel", days + " days");
      set("totalLabel", naira(slip + kitYear));
    };
    inputs.forEach((el) => el.addEventListener("input", update));
    update();
  }

  const seeAll = (e) => {
    const b = e.target.closest && e.target.closest(".see-all");
    if (!b || !root.contains(b)) return;
    let box = b.previousElementSibling;
    if (box && box.classList.contains("collapsed") === false)
      box = box.querySelector(".collapsed") || box;
    if (box) box.classList.remove("collapsed");
    b.remove();
  };
  root.addEventListener("click", seeAll);
  return () => root.removeEventListener("click", seeAll);
};

/** Contact form: posts JSON to the configured endpoint, else opens email. */
export const initContact: Init = () => {
  const f = document.getElementById("contact-form");
  if (!f) return;
  const err = document.getElementById("c-err"),
    btn = document.getElementById("c-send"),
    ok = document.getElementById("c-ok-box");
  const fail = (m) => {
    err.textContent = m;
    err.hidden = false;
  };
  f.addEventListener("submit", (e) => {
    e.preventDefault();
    err.hidden = true;
    const d = {};
    new FormData(f).forEach((v, k) => {
      d[k] = typeof v === "string" ? v.trim() : v;
    });
    if (d.website) return;
    if (!d.name || !d.email || !d.topic || !d.message)
      return fail("Please fill in your name, email, topic and message.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email))
      return fail("That email address doesn't look right.");
    if (!document.getElementById("c-ok").checked)
      return fail("Please tick the box so we can reply to you.");
    delete d.website;
    d.consent = true;
    d.page = location.pathname;
    d.submitted_at = new Date().toISOString();
    try {
      new URLSearchParams(location.search).forEach((v, k) => {
        if (k.indexOf("utm_") === 0) d[k] = v;
      });
    } catch (x) {}
    const url = siteConfig.contactEndpoint;
    const done = () => {
      f.hidden = true;
      ok.hidden = false;
      ok.focus();
      track("contact_submit", {
        topic: d.topic,
        business_type: d.business_type || "",
      });
    };
    if (!url) {
      const body =
        "Name: " +
        d.name +
        "\nEmail: " +
        d.email +
        "\nPhone: " +
        (d.phone || "") +
        "\nBusiness: " +
        (d.business_type || "") +
        "\n\n" +
        d.message;
      location.href =
        "mailto:info@neoedgefusion.com?subject=" +
        encodeURIComponent("NeoOps: " + d.topic) +
        "&body=" +
        encodeURIComponent(body);
      ok.querySelector("p").textContent =
        "Your email app should open with the message ready. Press send there. If nothing opened, email info@neoedgefusion.com.";
      done();
      return;
    }
    btn.disabled = true;
    btn.textContent = "Sending…";
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(d),
    })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        done();
      })
      .catch(() => {
        btn.disabled = false;
        btn.textContent = "Send message";
        fail(
          "We couldn't send that. Please try again, or email info@neoedgefusion.com.",
        );
      });
  });
};

/** Event budget and profit calculator. */
export const initBudget: Init = () => {
  const rows = [
    ["Vendors and suppliers", 450000],
    ["Crew and staff", 180000],
    ["Transport and logistics", 60000],
    ["Equipment rental", 150000],
    ["Venue and permits", 0],
    ["Other", 30000],
  ];
  const box = document.getElementById("costs");
  if (!box) return;
  box.innerHTML = "";
  const byId = (id) => document.getElementById(id);
  const num = (v) => {
    v = Number(v);
    return isFinite(v) && v > 0 ? v : 0;
  };
  function calc() {
    const cur = byId("cur").value;
    const f = (n) =>
      (n < 0 ? "−" : "") +
      cur +
      Math.round(Math.abs(n)).toLocaleString("en-US");
    const price = num(byId("price").value),
      cont = Math.min(num(byId("cont").value), 100),
      target = Math.min(num(byId("target").value), 95);
    let costs = 0;
    box
      .querySelectorAll(".cost-row")
      .forEach((r) => (costs += num(r.children[1].value)));
    const c = (costs * cont) / 100,
      total = costs + c,
      profit = price - total,
      margin = price > 0 ? (profit / price) * 100 : 0,
      suggest = total / (1 - target / 100);
    byId("oProfit").textContent = f(profit);
    byId("oCosts").textContent = f(costs);
    byId("oCont").textContent = f(c);
    byId("oTotal").textContent = f(total);
    byId("oMargin").textContent = price > 0 ? margin.toFixed(1) + "%" : "–";
    byId("oSuggest").textContent = f(suggest);
    const s = byId("oStatus");
    if (price <= 0) {
      s.textContent = "Enter what the client pays";
      s.style.cssText = "background:rgba(255,255,255,.12);color:#fff";
    } else if (profit < 0) {
      s.textContent = "Loss-making: raise the price or cut costs";
      s.style.cssText = "background:#FDECEC;color:#B42318";
    } else if (margin < 15) {
      s.textContent = "Thin margin: one surprise could wipe it out";
      s.style.cssText = "background:#FFF4E6;color:#9A5B12";
    } else if (margin < target) {
      s.textContent = "Profitable, but below your target";
      s.style.cssText = "background:#FFF4E6;color:#9A5B12";
    } else {
      s.textContent = "Healthy margin";
      s.style.cssText = "background:#E6F4EA;color:#1E7A3C";
    }
  }
  function row(name, amt) {
    const d = document.createElement("div");
    d.className = "cost-row";
    const n = document.createElement("input");
    n.type = "text";
    n.value = name;
    n.setAttribute("aria-label", "Cost name");
    const a = document.createElement("input");
    a.type = "number";
    a.min = "0";
    a.step = "1000";
    a.value = amt;
    a.setAttribute("aria-label", "Amount for " + (name || "cost"));
    a.inputMode = "numeric";
    const x = document.createElement("button");
    x.type = "button";
    x.className = "icon-btn no-print";
    x.textContent = "×";
    x.setAttribute("aria-label", "Remove this cost");
    x.onclick = () => {
      d.remove();
      calc();
    };
    n.oninput = calc;
    a.oninput = calc;
    d.append(n, a, x);
    box.appendChild(d);
  }
  rows.forEach((r) => row(r[0], r[1]));
  byId("addCost").onclick = () => {
    row("", 0);
    box.lastChild.firstChild.focus();
  };
  ["price", "cont", "target", "cur"].forEach((id) =>
    byId(id).addEventListener("input", calc),
  );
  calc();
};

const CHECKLIST_TEXT =
  "EVENT CHECKLIST (NeoOps)\n\nBEFORE THE EVENT\n[ ] Confirm the details with the client: date, venue, access and set-up times, and who your contact is on the day\n[ ] Send the quote and collect the deposit: nothing goes on the calendar until the deposit lands\n[ ] Check stock for the date: make sure nothing is already promised to another client\n[ ] Assign the crew: who is loading, driving, setting up and running each item\n[ ] Test every item: power on screens, sound and booths; set aside anything faulty\n[ ] Label, pack and count: so you know exactly what is leaving\n[ ] Print the waybill: a list of every item going out, for the driver and the venue\n[ ] Plan transport and power: route, vehicle, fuel, and whether you need a generator\n[ ] Share the run sheet: timings and roles, sent to every crew member\n[ ] Prepare a Plan B: a spare for anything the event cannot run without\n\nON THE DAY\n[ ] Arrive early and check in: with the venue manager and the client contact\n[ ] Unload against the waybill: tick off every item as it comes off the vehicle\n[ ] Set up and test: sound check, screen check, booth test run\n[ ] Brief the crew: timings, who handles what, and who to call if something fails\n[ ] Walk the client through the set-up: and get their sign-off before guests arrive\n[ ] Watch the equipment: keep an eye on high-value items throughout\n[ ] Note any damage or incidents: with photos, while it is fresh\n[ ] Capture content: photos and video of your set-up for your portfolio\n\nAFTER THE EVENT\n[ ] Strike and pack: carefully, in the reverse order of set-up\n[ ] Count every item back: against the waybill, before you leave the venue\n[ ] Flag damaged or missing items: and agree with the client who pays\n[ ] Collect the balance: send the final invoice and a receipt\n[ ] Send a feedback form: while the event is still fresh for the client\n[ ] Clean and service the kit: so it is ready for the next booking\n[ ] Log every cost: and work out what the event actually made\n[ ] Debrief the crew: what went well, and what to fix for next time";

/** Interactive checklist; progress is kept in this browser. */
export const initChecklist: Init = (root) => {
  const KEY = "neoops-checklist";
  const boxes = [].slice.call(root.querySelectorAll("[data-ck]"));
  if (!boxes.length) return;
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch (e) {}
  const update = () => {
    let n = 0;
    boxes.forEach((b) => {
      b.parentNode.classList.toggle("done", b.checked);
      if (b.checked) n++;
    });
    document.getElementById("ckCount").textContent =
      n + " of " + boxes.length + " done";
    document.getElementById("ckBar").style.width =
      (n / boxes.length) * 100 + "%";
    const s = {};
    boxes.forEach((b) => {
      if (b.checked) s[b.dataset.ck] = 1;
    });
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch (e) {}
  };
  boxes.forEach((b) => {
    b.checked = !!saved[b.dataset.ck];
    b.addEventListener("change", update);
  });
  update();
  document.getElementById("ckReset").onclick = () => {
    boxes.forEach((b) => (b.checked = false));
    update();
  };
  document.getElementById("ckPrint").onclick = () => window.print();
  document.getElementById("ckCopy").onclick = function () {
    const btn = this;
    try {
      navigator.clipboard.writeText(CHECKLIST_TEXT).then(
        () => (btn.textContent = "Copied"),
        () => (btn.textContent = "Copy failed"),
      );
    } catch (e) {
      btn.textContent = "Copy failed";
    }
  };
};

/** Glossary search filter. */
export const initGlossary: Init = (root) => {
  const q = document.getElementById("glq");
  if (!q) return;
  q.addEventListener("input", () => {
    const v = q.value.trim().toLowerCase();
    let shown = 0;
    root.querySelectorAll(".gl-term").forEach((t) => {
      const m = !v || t.textContent.toLowerCase().indexOf(v) > -1;
      t.hidden = !m;
      if (m) shown++;
    });
    root.querySelectorAll(".gl-group").forEach((g) => {
      g.hidden = !g.querySelector(".gl-term:not([hidden])");
    });
    document.getElementById("glEmpty").hidden = shown > 0;
  });
};

/** Marketplace waitlist (renter or vendor). */
export const initWaitlist: Init = (root) => {
  const WAITLIST_ENDPOINT = siteConfig.waitlistEndpoint;
  // Off the live domain nothing is sent, so test sign-ups stay out of the list.
  const PREVIEW = !/getneoops\.com$/.test(location.hostname);

  const form = document.getElementById("waitlist");
  if (!form) return;
  const role = document.getElementById("role");
  const tabRent = document.getElementById("tabRent");
  const tabList = document.getElementById("tabList");
  const err = document.getElementById("err");
  const submit = document.getElementById("submit");

  function setRole(r) {
    role.value = r;
    tabRent.setAttribute("aria-pressed", r === "renter" ? "true" : "false");
    tabList.setAttribute("aria-pressed", r === "vendor" ? "true" : "false");
    root
      .querySelectorAll(".vendor-only")
      .forEach((el) => (el.hidden = r !== "vendor"));
    root
      .querySelectorAll(".renter-only")
      .forEach((el) => (el.hidden = r !== "renter"));
    document.getElementById("business").required = r === "vendor";
    document.getElementById("catLegend").textContent =
      r === "vendor" ? "What do you rent out?" : "What do you usually rent?";
    submit.firstChild.nodeValue =
      r === "vendor" ? "Join as a vendor " : "Join the waitlist ";
  }
  tabRent.addEventListener("click", () => setRole("renter"));
  tabList.addEventListener("click", () => setRole("vendor"));
  document
    .getElementById("vendorCta")
    .addEventListener("click", () => setRole("vendor"));
  if (location.hash === "#vendors-join") setRole("vendor");

  function utm() {
    const out = {};
    try {
      const q = new URLSearchParams(location.search);
      [
        "utm_source",
        "utm_medium",
        "utm_campaign",
        "utm_content",
        "utm_term",
      ].forEach((k) => {
        if (q.get(k)) out[k] = q.get(k);
      });
    } catch (e) {}
    return out;
  }
  function invalid(el, msg) {
    el.setAttribute("aria-invalid", "true");
    err.textContent = msg;
    el.focus();
    return false;
  }
  function validate() {
    form
      .querySelectorAll("[aria-invalid]")
      .forEach((el) => el.removeAttribute("aria-invalid"));
    err.textContent = "";
    const name = document.getElementById("name"),
      city = document.getElementById("city"),
      email = document.getElementById("email");
    const business = document.getElementById("business"),
      consent = document.getElementById("consent");
    if (!name.value.trim()) return invalid(name, "Add your name.");
    if (!city.value.trim()) return invalid(city, "Add your city.");
    if (role.value === "vendor" && !business.value.trim())
      return invalid(business, "Add your business name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim()))
      return invalid(
        email,
        "Enter a valid email address, like you@example.com.",
      );
    if (!consent.checked)
      return invalid(
        consent,
        "Tick the box so we can email you when early access opens.",
      );
    return true;
  }
  function payload() {
    const fd = new FormData(form);
    const data = {
      role: role.value,
      page: "marketplace",
      submitted_at: new Date().toISOString(),
      categories: fd.getAll("categories"),
    };
    [
      "name",
      "city",
      "business",
      "email",
      "phone",
      "event_type",
      "item_count",
      "uses_neoops",
      "consent",
    ].forEach((k) => {
      const v = fd.get(k);
      if (v) data[k] = String(v).trim();
    });
    Object.assign(data, utm());
    return data;
  }
  function showDone(data) {
    document.getElementById("formView").hidden = true;
    const done = document.getElementById("doneView");
    done.hidden = false;
    const first = data.name.split(" ")[0];
    document.getElementById("doneMsg").textContent =
      data.role === "vendor"
        ? "Thanks, " +
          first +
          ". We'll email " +
          data.email +
          " when vendors can start listing."
        : "Thanks, " +
          first +
          ". We'll email " +
          data.email +
          " when early access opens.";
    if (PREVIEW)
      document.getElementById("shareNote").textContent =
        "Preview: this sign-up was not sent anywhere. On the live site it goes to your waitlist.";
    done.focus();
  }
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!validate()) return;
    const data = payload();
    if (PREVIEW) {
      showDone(data);
      return;
    }
    if (!WAITLIST_ENDPOINT) {
      err.textContent =
        "Sign-ups aren't switched on yet. Email info@neoedgefusion.com and we'll add you.";
      return;
    }
    submit.disabled = true;
    submit.firstChild.nodeValue = "Joining… ";
    fetch(WAITLIST_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        showDone(data);
        track("waitlist_submit", { role: data.role });
      })
      .catch(() => {
        err.textContent =
          "That didn't go through. Check your connection and try again, or email info@neoedgefusion.com.";
        submit.disabled = false;
        setRole(role.value);
      });
  });

  document.getElementById("copyBtn").addEventListener("click", function () {
    const input = document.getElementById("shareUrl"),
      btn = this;
    const selectIt = () => {
      input.focus();
      input.select();
      btn.textContent = "Now copy it";
    };
    try {
      navigator.clipboard
        .writeText(input.value)
        .then(() => (btn.textContent = "Copied"), selectIt);
    } catch (e) {
      selectIt();
    }
  });
};
