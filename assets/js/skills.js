// Skills cloud: shows a subset of skills arranged in rows that fit the available
// space, then continuously swaps small groups of skills for fresh ones.
//
// A swap replaces a contiguous group within a row. Replacements are chosen so
// their combined width fits the row's remaining capacity (screen width minus the
// chips kept on either side of the swap), which guarantees the row never overflows
// while still allowing under-filled rows to grow back toward full width.
(function () {
    "use strict";

    var list = document.querySelector(".skills__list");
    if (!list) return;

    // Skill names come from the server-rendered chips (works without JS too).
    var ALL = Array.prototype.map.call(
        list.querySelectorAll(".skill"),
        function (el) { return el.textContent.trim(); }
    );
    if (ALL.length === 0) return;

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Timing (ms)
    var SWAP_INTERVAL = 2500;
    var STAGGER_MS = 1000;       // initial cascade offset per row index
    var STAGGER_JITTER = 500;   // random extra delay added to each row cycle
    var HIGHLIGHT_MS = 500;
    var FADE_MS = 500;

    var MAX_ROWS = 5;
    var MAX_GROUP_DESKTOP = 5;
    var MAX_GROUP_MOBILE = 3;
    var DESKTOP_MQ = window.matchMedia("(min-width: 901px)");

    function maxGroupSize() {
        return DESKTOP_MQ.matches ? MAX_GROUP_DESKTOP : MAX_GROUP_MOBILE;
    }

    var gap = 8;            // horizontal gap between chips in a row
    var rowGap = 8;         // vertical gap between rows
    var chipHeight = 36;
    var rowWidth = 0;
    var rows = [];          // [[name, ...], ...]
    var rowEls = [];        // matching row container elements
    var widths = {};        // name -> measured pixel width
    var rowTimers = {};     // row index -> timeout id
    var busyRows = {};    // row index -> true while a swap is in flight

    function shuffle(arr) {
        var a = arr.slice();
        for (var i = a.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
        }
        return a;
    }

    function displayedSet() {
        var set = {};
        rows.forEach(function (row) {
            row.forEach(function (name) { set[name] = true; });
        });
        return set;
    }

    function unusedNames() {
        var shown = displayedSet();
        return ALL.filter(function (name) { return !shown[name]; });
    }

    function widthOf(name) {
        return widths[name] || 80;
    }

    // Width occupied by a contiguous group: chip widths plus the gaps between them.
    function groupWidth(names) {
        var total = 0;
        for (var i = 0; i < names.length; i++) {
            total += (i > 0 ? gap : 0) + widthOf(names[i]);
        }
        return total;
    }

    // Width still available in a row once `before` and `after` segments are placed.
    function replacementBudget(before, after) {
        var budget = rowWidth - groupWidth(before) - groupWidth(after);
        if (before.length > 0) budget -= gap;
        if (after.length > 0) budget -= gap;
        return budget;
    }

    // Greedily pick names from `pool` whose group width stays within `budget`.
    function fitWithin(pool, budget) {
        var chosen = [];
        var total = 0;
        for (var i = 0; i < pool.length; i++) {
            var add = (chosen.length > 0 ? gap : 0) + widthOf(pool[i]);
            if (total + add <= budget) {
                chosen.push(pool[i]);
                total += add;
            }
        }
        return chosen;
    }

    function makeChip(name, opts) {
        opts = opts || {};
        var el = document.createElement("span");
        el.className = "skill";
        el.textContent = name;
        if (opts.highlight) el.classList.add("is-highlight");
        if (opts.entering) el.classList.add("is-entering");
        return el;
    }

    // Measure every skill's intrinsic width inside a row (matches rendered layout).
    function measure() {
        var probeRow = document.createElement("div");
        probeRow.className = "skills__row";
        probeRow.style.position = "absolute";
        probeRow.style.visibility = "hidden";
        probeRow.style.pointerEvents = "none";
        list.appendChild(probeRow);

        var probe = document.createElement("span");
        probe.className = "skill";
        probeRow.appendChild(probe);

        ALL.forEach(function (name) {
            probe.textContent = name;
            // offsetWidth matches flex layout width better than getBoundingClientRect.
            widths[name] = probe.offsetWidth;
        });
        chipHeight = probe.offsetHeight || 36;

        list.removeChild(probeRow);
    }

    function readLayoutGap() {
        var rowEl = list.querySelector(".skills__row");
        if (rowEl) {
            var rowStyles = getComputedStyle(rowEl);
            return parseFloat(rowStyles.columnGap || rowStyles.gap) || 8;
        }

        var tmp = document.createElement("div");
        tmp.className = "skills__row";
        tmp.style.position = "absolute";
        tmp.style.visibility = "hidden";
        tmp.style.pointerEvents = "none";
        list.appendChild(tmp);
        var tmpStyles = getComputedStyle(tmp);
        var value = parseFloat(tmpStyles.columnGap || tmpStyles.gap) || 8;
        list.removeChild(tmp);
        return value;
    }

    // Horizontal space available for a single row of chips.
    function availableRowWidth() {
        var section = list.closest(".skills") || list.parentElement;
        var sectionStyles = getComputedStyle(section);
        var sectionInner = section.clientWidth -
            parseFloat(sectionStyles.paddingLeft) -
            parseFloat(sectionStyles.paddingRight);
        var listWidth = list.clientWidth;
        var listRect = list.getBoundingClientRect().width;

        return Math.max(0, Math.floor(Math.min(sectionInner, listWidth, listRect)));
    }

    // Figure out how many rows fit the section and how wide each row can be.
    function readMetrics() {
        rowWidth = availableRowWidth();

        var listStyles = getComputedStyle(list);
        rowGap = parseFloat(listStyles.rowGap || listStyles.gap) || 8;
        gap = readLayoutGap();

        var section = list.closest(".skills") || list.parentElement;
        var sectionStyles = getComputedStyle(section);
        var innerHeight = section.clientHeight -
            parseFloat(sectionStyles.paddingTop) -
            parseFloat(sectionStyles.paddingBottom);

        var count = Math.floor((innerHeight + rowGap) / (chipHeight + rowGap));
        return Math.max(1, Math.min(MAX_ROWS, count));
    }

    // Pull skills out of `remaining` (shuffled) until no further skill fits the
    // row width. Returns the packed row; chosen names are removed from `remaining`.
    function packRow(remaining, maxWidth) {
        var row = [];
        var total = 0;
        var progressed = true;
        while (progressed) {
            progressed = false;
            for (var i = 0; i < remaining.length; i++) {
                var add = (row.length > 0 ? gap : 0) + widthOf(remaining[i]);
                if (total + add <= maxWidth) {
                    row.push(remaining[i]);
                    total += add;
                    remaining.splice(i, 1);
                    progressed = true;
                    break;
                }
            }
        }
        return row;
    }

    function buildRows(rowCount) {
        rows = [];
        var remaining = shuffle(ALL);

        for (var r = 0; r < rowCount && remaining.length > 0; r++) {
            var row = packRow(remaining, rowWidth);
            if (row.length === 0) {     // a single skill wider than the row
                row.push(remaining.shift());
            }
            rows.push(row);
        }
    }

    function render() {
        list.innerHTML = "";
        rowEls = [];
        rows.forEach(function (names) {
            var rowEl = document.createElement("div");
            rowEl.className = "skills__row";
            names.forEach(function (name) { rowEl.appendChild(makeChip(name)); });
            list.appendChild(rowEl);
            rowEls.push(rowEl);
        });
    }

    function rowsOverflow() {
        var limit = availableRowWidth();
        for (var i = 0; i < rowEls.length; i++) {
            if (rowEls[i].scrollWidth > limit) return true;
        }
        return false;
    }

    function rebuild() {
        var rowCount = readMetrics();
        buildRows(rowCount);
        render();

        // Nudge the budget down if rendered rows still exceed the container.
        var attempts = 0;
        while (rowsOverflow() && rowWidth > 0 && attempts < 6) {
            rowWidth -= 2;
            buildRows(rowCount);
            render();
            attempts++;
        }
    }

    // Start a single swap on the given row. Returns true if a swap was started.
    function trySwapOnRow(ri) {
        if (busyRows[ri]) return false;

        var row = rows[ri];
        if (!row || row.length === 0) return false;

        var rowEl = rowEls[ri];

        var maxGroup = maxGroupSize();
        var groupSize = Math.min(
            maxGroup,
            Math.floor(Math.random() * maxGroup) + 1,
            row.length
        );
        var start = Math.floor(Math.random() * (row.length - groupSize + 1));
        var before = row.slice(0, start);
        var after = row.slice(start + groupSize);

        // Budget is the full row slot for replacements, not just the width removed.
        var budget = replacementBudget(before, after);
        if (budget <= 0) return false;

        var incoming = fitWithin(shuffle(unusedNames()), budget);
        if (incoming.length === 0) return false; // nothing fits; leave row unchanged

        busyRows[ri] = true;
        // Reserve incoming names immediately so concurrent swaps don't pick them.
        rows[ri] = row.slice(0, start).concat(incoming, row.slice(start + groupSize));

        var outEls = [];
        for (var k = start; k < start + groupSize; k++) {
            outEls.push(rowEl.children[k]);
        }

        // 1) highlight the outgoing skills
        outEls.forEach(function (el) { el.classList.add("is-highlight"); });

        setTimeout(function () {
            // 2) fade the outgoing skills out
            outEls.forEach(function (el) { el.classList.add("is-leaving"); });

            setTimeout(function () {
                // 3) insert the incoming skills (highlighted) where the group was
                var inEls = incoming.map(function (name) {
                    return makeChip(name, { highlight: true, entering: true });
                });
                var anchor = outEls[0];
                inEls.forEach(function (el) { rowEl.insertBefore(el, anchor); });
                outEls.forEach(function (el) { rowEl.removeChild(el); });

                // fade the incoming skills in
                requestAnimationFrame(function () {
                    requestAnimationFrame(function () {
                        inEls.forEach(function (el) {
                            el.classList.remove("is-entering");
                        });
                    });
                });

                // 4) drop the highlight once they've settled
                setTimeout(function () {
                    inEls.forEach(function (el) { el.classList.remove("is-highlight"); });
                    delete busyRows[ri];
                }, FADE_MS + HIGHLIGHT_MS);
            }, FADE_MS);
        }, HIGHLIGHT_MS);

        return true;
    }

    function nextRowDelay() {
        return SWAP_INTERVAL + Math.random() * STAGGER_JITTER;
    }

    function clearRowTimer(ri) {
        if (rowTimers[ri]) {
            clearTimeout(rowTimers[ri]);
            delete rowTimers[ri];
        }
    }

    // Each row runs its own swap loop with a staggered start and jittered cadence.
    function scheduleRow(ri) {
        clearRowTimer(ri);

        function tick() {
            trySwapOnRow(ri);
            rowTimers[ri] = setTimeout(tick, nextRowDelay());
        }

        var initialDelay = ri * STAGGER_MS + Math.random() * STAGGER_JITTER;
        rowTimers[ri] = setTimeout(tick, initialDelay);
    }

    function start() {
        stop();
        if (reduceMotion) return;
        for (var ri = 0; ri < rows.length; ri++) {
            scheduleRow(ri);
        }
    }

    function stop() {
        for (var ri in rowTimers) {
            if (Object.prototype.hasOwnProperty.call(rowTimers, ri)) {
                clearTimeout(rowTimers[ri]);
            }
        }
        rowTimers = {};
    }

    function init() {
        list.classList.add("is-rotating");
        list.removeAttribute("role");
        measure();
        rebuild();
        start();

        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(function () {
                measure();
                rebuild();
            });
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () {
            requestAnimationFrame(init);
        });
    } else {
        requestAnimationFrame(init);
    }

    var resizeTimer;
    window.addEventListener("resize", function () {
        clearTimeout(resizeTimer);
        stop();
        resizeTimer = setTimeout(function () {
            busyRows = {};
            measure();
            rebuild();
            start();
        }, 250);
    });

    document.addEventListener("visibilitychange", function () {
        if (document.hidden) stop(); else start();
    });
})();
