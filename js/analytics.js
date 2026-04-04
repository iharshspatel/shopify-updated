/**
 * GetFastStore GA4 helpers: queues safely before gtag boot (requestIdleCallback).
 *
 * GA4 Admin (one-time): Admin → Data display → Events → mark `calendly_click`
 * as a key event; use DebugView to verify. Optional: Admin → Data streams →
 * Enhanced measurement (outbound clicks, scrolls).
 */
(function () {
  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function gtag() {
      window.dataLayer.push(arguments);
    };

  window.gfsTrack = function (eventName, params) {
    window.gtag("event", eventName, params || {});
  };

  var HASH_TO_SECTION = {
    "#what-i-fix": "what_i_fix",
    "#results": "results",
    "#pricing": "pricing",
    "#blog": "blog",
    "#faq": "faq",
    "#book": "book",
  };

  var TOC_TO_ID = {
    "#cause-1": "cause_1",
    "#cause-2": "cause_2",
    "#cause-3": "cause_3",
    "#cause-4": "cause_4",
    "#cause-5": "cause_5",
    "#cause-6": "cause_6",
    "#cause-7": "cause_7",
    "#key-fact-good-score": "key_fact_good_score",
  };

  function isHomePage() {
    var p = location.pathname || "";
    return p === "/" || /\/index\.html$/i.test(p);
  }

  function isBlogIndexPage() {
    var p = location.pathname || "";
    return /\/blog\/?$/.test(p) || /\/blog\/index\.html$/i.test(p);
  }

  function isArticleWhySlowPage() {
    return (
      (location.pathname || "").indexOf("why-is-my-shopify-store-slow") !== -1
    );
  }

  function init() {
    document.addEventListener(
      "click",
      function (e) {
        var a = e.target.closest("a");
        if (!a) return;
        var href = a.getAttribute("href");
        if (!href) return;

        // Tier 1: Calendly
        if (
          href.indexOf("calendly.com/harsh-1722-patel/new-meeting") !== -1
        ) {
          var loc = a.getAttribute("data-gfs-cta") || "unknown";
          window.gfsTrack("calendly_click", { cta_location: loc });
          return;
        }

        // Tier 3: PageSpeed outbound (article)
        if (href.indexOf("pagespeed.web.dev") !== -1) {
          window.gfsTrack("outbound_tool_click", {
            link_url: href,
            context: "article_body",
          });
          return;
        }

        // Article / blog: audit CTAs to home #book
        var auditPlacement = a.getAttribute("data-gfs-audit-placement");
        if (auditPlacement && href.indexOf("#book") !== -1) {
          var auditPayload = { placement: auditPlacement };
          if (isArticleWhySlowPage()) {
            auditPayload.article_slug = "why-is-my-shopify-store-slow";
          }
          window.gfsTrack("article_audit_cta_click", auditPayload);
          return;
        }

        // Blog card (home + blog index)
        var blogDest = a.getAttribute("data-gfs-blog-dest");
        if (blogDest) {
          window.gfsTrack("blog_card_click", { destination: blogDest });
          return;
        }

        // Home: in-page anchors (nav / footer / same-page)
        if (isHomePage() && href.charAt(0) === "#" && href.length > 1) {
          if (a.classList.contains("btn-ghost") && href === "#results") {
            window.gfsTrack("secondary_cta_click", {
              cta_id: "hero_see_results",
            });
            return;
          }
          var section = HASH_TO_SECTION[href];
          if (section) {
            var inNav = a.closest(".site-nav");
            var inFooter = a.closest("footer");
            var source = inNav ? "header" : inFooter ? "footer" : "content";
            window.gfsTrack("nav_anchor_click", {
              target_section: section,
              source: source,
            });
          }
          return;
        }

        // Blog index: in-page if any (none expected); skip

        // Article: TOC / in-page anchors
        if (isArticleWhySlowPage() && href.charAt(0) === "#") {
          var tid = TOC_TO_ID[href];
          if (tid) {
            window.gfsTrack("toc_click", { target_id: tid });
          }
          return;
        }
      },
      false,
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
