// Toggles the "+" overflow hints on any .scroll-box whose list can be scrolled
// further up or down. Applies to the experience page and the home favorites list.
(function () {
    "use strict";

    var boxes = document.querySelectorAll(".scroll-box");

    Array.prototype.forEach.call(boxes, function (box) {
        var list = box.querySelector(".scroll-box__list");
        if (!list) return;

        function update() {
            var atTop = list.scrollTop <= 1;
            var atBottom = list.scrollTop + list.clientHeight >= list.scrollHeight - 1;
            box.classList.toggle("is-scroll-up", !atTop);
            box.classList.toggle("is-scroll-down", !atBottom);
        }

        list.addEventListener("scroll", update, { passive: true });
        window.addEventListener("resize", update);
        window.addEventListener("load", update);

        // Recompute once the list's size settles (fonts/images loading, etc.)
        if (typeof ResizeObserver !== "undefined") {
            new ResizeObserver(update).observe(list);
        }

        update();
    });
})();
