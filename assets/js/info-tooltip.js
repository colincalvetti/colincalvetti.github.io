// Toggle for the favorites info tooltip (keyboard and pointer on all screen sizes).
(function () {
    "use strict";

    var info = document.querySelector(".favorites .info");
    if (!info) return;

    var tip = info.querySelector(".info__tip");

    function isOpen() {
        return info.classList.contains("is-open");
    }

    function setExpanded(open) {
        info.setAttribute("aria-expanded", open ? "true" : "false");
    }

    function close() {
        info.classList.remove("is-open");
        setExpanded(false);
    }

    function open() {
        info.classList.add("is-open");
        setExpanded(true);
    }

    function toggle(e) {
        if (e) e.stopPropagation();
        if (isOpen()) close();
        else open();
    }

    info.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        toggle();
    });

    info.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle();
        } else if (e.key === "Escape") {
            close();
        }
    });

    if (tip) {
        tip.addEventListener("click", function (e) {
            e.stopPropagation();
        });
    }

    document.addEventListener("click", function (e) {
        if (!isOpen()) return;
        if (!info.contains(e.target)) close();
    });

    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && isOpen()) close();
    });

    info.addEventListener("focusout", function (e) {
        if (!info.contains(e.relatedTarget)) close();
    });

    setExpanded(false);
})();
