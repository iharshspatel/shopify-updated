// Frame behaviour shared by every page: mobile nav, top-bar search,
// index-table tabs and clickable rows. No dependencies.
(function () {
  // Add new posts here so they show up in the top-bar search.
  var POSTS = [
    {
      title: "Shopify's GraphQL rate limit is a leaky bucket",
      url: "/writing/shopify-graphql-rate-limits/",
      meta: "Explainer · Oct 2026",
    },
  ];

  var PAGES = [
    { title: "Home", url: "/", meta: "Page" },
    { title: "Writing", url: "/writing/", meta: "Page" },
    {
      title: "AltMaster",
      url: "https://apps.shopify.com/alt-text-optimizer",
      meta: "Project · Shopify app",
    },
  ];

  // Mobile nav
  var menu = document.querySelector(".nav-menu");
  var scrim = document.querySelector(".nav-scrim");
  function setNav(open) {
    document.body.classList.toggle("nav-open", open);
    if (menu) menu.setAttribute("aria-expanded", String(open));
  }
  if (menu) {
    menu.addEventListener("click", function () {
      setNav(!document.body.classList.contains("nav-open"));
    });
  }
  if (scrim) scrim.addEventListener("click", function () { setNav(false); });

  // Desktop sidebar collapse to an icon rail. The class is applied early by an
  // inline script in <head> so the rail doesn't flash open on navigation.
  var root = document.documentElement;
  var collapse = document.querySelector(".nav-collapse");
  function setCollapsed(on) {
    root.classList.toggle("nav-collapsed", on);
    if (collapse) {
      collapse.setAttribute("aria-pressed", String(on));
      collapse.setAttribute("aria-label", on ? "Expand sidebar" : "Collapse sidebar");
    }
    document.querySelectorAll(".nav .nav-item").forEach(function (item) {
      var label = item.querySelector(".nav-label");
      if (on && label) item.title = label.textContent.trim();
      else item.removeAttribute("title");
    });
    var brand = document.querySelector(".nav-top .brand");
    if (brand) {
      brand.setAttribute("aria-label", on ? "Expand sidebar" : "Harsh Patel, home");
      if (on) brand.title = "Expand sidebar";
      else brand.removeAttribute("title");
    }
    try { localStorage.setItem("nav", on ? "collapsed" : "open"); } catch (e) {}
  }
  setCollapsed(root.classList.contains("nav-collapsed"));
  if (collapse) {
    collapse.addEventListener("click", function () {
      setCollapsed(!root.classList.contains("nav-collapsed"));
    });
  }

  // In the rail, the logo expands the sidebar instead of going home.
  var navBrand = document.querySelector(".nav-top .brand");
  if (navBrand) {
    navBrand.addEventListener("click", function (e) {
      if (!root.classList.contains("nav-collapsed")) return;
      if (window.matchMedia("(max-width: 768px)").matches) return;
      e.preventDefault();
      setCollapsed(false);
    });
  }

  // Start keyboard scrolling in the content panel, not the sidebar.
  var main = document.getElementById("main");
  if (main && !location.hash && document.activeElement === document.body) {
    main.focus({ preventScroll: true });
  }

  // Email links: mailto only works when a mail app is set up, so also copy
  // the address and confirm with a toast.
  function toast(message) {
    var el = document.querySelector(".toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "toast";
      el.setAttribute("role", "status");
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add("is-visible");
    clearTimeout(el._timer);
    el._timer = setTimeout(function () { el.classList.remove("is-visible"); }, 2400);
  }
  document.querySelectorAll('a[href^="mailto:"]').forEach(function (link) {
    link.addEventListener("click", function () {
      var address = link.getAttribute("href").replace(/^mailto:/, "").split("?")[0];
      if (!navigator.clipboard) return;
      navigator.clipboard.writeText(address).then(function () {
        toast("Copied " + address);
      }, function () {});
    });
  });

  // Search
  var input = document.getElementById("site-search");
  var searchBtn = document.querySelector(".nav-search-btn");
  if (searchBtn && input) {
    searchBtn.addEventListener("click", function () {
      setCollapsed(false);
      input.focus();
    });
  }
  var list = document.getElementById("search-results");
  var active = -1;

  function render(q) {
    q = q.trim().toLowerCase();
    var items = POSTS.concat(PAGES).filter(function (i) {
      return !q || (i.title + " " + i.meta).toLowerCase().indexOf(q) !== -1;
    });
    active = -1;
    list.innerHTML = "";
    if (!items.length) {
      list.innerHTML = '<li class="empty">No results for “' +
        q.replace(/[<>&]/g, "") + "”</li>";
      return;
    }
    items.forEach(function (i) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = i.url;
      a.textContent = i.title;
      var small = document.createElement("small");
      small.textContent = i.meta;
      a.appendChild(small);
      li.appendChild(a);
      list.appendChild(li);
    });
  }

  function move(delta) {
    var links = list.querySelectorAll("a");
    if (!links.length) return;
    active = (active + delta + links.length) % links.length;
    links.forEach(function (l, n) {
      l.setAttribute("aria-selected", String(n === active));
    });
  }

  function placeList() {
    var r = input.getBoundingClientRect();
    list.style.top = r.bottom + 6 + "px";
    list.style.left = r.left + "px";
  }

  if (input && list) {
    input.addEventListener("focus", function () {
      render(input.value);
      placeList();
      list.hidden = false;
    });
    window.addEventListener("resize", function () {
      if (!list.hidden) placeList();
    });
    var navEl = document.querySelector(".nav");
    if (navEl) {
      navEl.addEventListener("scroll", function () {
        if (!list.hidden) placeList();
      });
    }
    input.addEventListener("input", function () { render(input.value); });
    input.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
      else if (e.key === "Enter") {
        var links = list.querySelectorAll("a");
        var target = links[active] || links[0];
        if (target) window.location.href = target.href;
      } else if (e.key === "Escape") {
        input.blur();
      }
    });
    input.addEventListener("blur", function () {
      setTimeout(function () { list.hidden = true; }, 150);
    });
    document.addEventListener("keydown", function (e) {
      var tag = (e.target.tagName || "").toLowerCase();
      if (e.key === "/" && tag !== "input" && tag !== "textarea" && tag !== "select") {
        e.preventDefault();
        if (window.matchMedia("(max-width: 768px)").matches) setNav(true);
        else if (root.classList.contains("nav-collapsed")) setCollapsed(false);
        input.focus();
      }
    });
  }

  // Index table: tabs filter rows by data-kind, rows are clickable
  document.querySelectorAll("[data-tabs]").forEach(function (tabs) {
    var table = document.getElementById(tabs.getAttribute("data-tabs"));
    tabs.addEventListener("click", function (e) {
      var tab = e.target.closest(".tab");
      if (!tab) return;
      tabs.querySelectorAll(".tab").forEach(function (t) {
        t.setAttribute("aria-selected", String(t === tab));
      });
      var kind = tab.getAttribute("data-kind");
      var rows = table.querySelectorAll("tbody tr:not([data-empty])");
      var shown = 0;
      rows.forEach(function (row) {
        row.hidden = kind !== "all" && row.getAttribute("data-kind") !== kind;
        if (!row.hidden) shown++;
      });
      var empty = table.querySelector("tbody tr[data-empty]");
      if (empty) empty.hidden = shown > 0;
    });
  });

  document.querySelectorAll(".index-table tbody tr").forEach(function (row) {
    var link = row.querySelector("a");
    if (!link) return;
    row.addEventListener("click", function (e) {
      if (e.target.closest("a")) return;
      link.click();
    });
  });
})();
