document.addEventListener("DOMContentLoaded", function () {
    // Registra el plugin Observer
    gsap.registerPlugin(Observer);

    // Selecciona las secciones SOLO dentro del bloque_3
    let container = document.querySelector(".animated-sections"),
        sections = container.querySelectorAll("section"),
        images = container.querySelectorAll(".bg"),
        headings = gsap.utils.toArray(".section-heading"),
        outerWrappers = gsap.utils.toArray(".outer"),
        innerWrappers = gsap.utils.toArray(".inner"),
        currentIndex = -1,
        wrap = gsap.utils.wrap(0, sections.length),
        animating;

    // Configuración inicial
    gsap.set(sections, { autoAlpha: 0 }); // Oculta todas las secciones al inicio
    gsap.set(sections[0], { autoAlpha: 1 }); // Muestra la primera sección
    gsap.set(outerWrappers, { yPercent: 100 });
    gsap.set(innerWrappers, { yPercent: -100 });

    // Divide los headings en letras
    headings.forEach(heading => {
        if (!heading.querySelector(".char")) {
            let text = heading.textContent;
            heading.innerHTML = text
                .split("")
                .map(char => `<span class="char">${char}</span>`)
                .join("");
        }
    });

    function gotoSection(index, direction) {
        index = wrap(index);
        animating = true;
        let fromTop = direction === -1,
            dFactor = fromTop ? -1 : 1,
            tl = gsap.timeline({
                defaults: { duration: 1.25, ease: "power1.inOut" },
                onComplete: () => (animating = false),
            });

        if (currentIndex >= 0) {
            gsap.set(sections[currentIndex], { zIndex: 0 });
            tl.to(images[currentIndex], { yPercent: -15 * dFactor }).set(sections[currentIndex], { autoAlpha: 0 });
        }

        gsap.set(sections[index], { autoAlpha: 1, zIndex: 1 });

        // Animación principal
        tl.fromTo(
            [outerWrappers[index], innerWrappers[index]],
            { yPercent: i => (i ? -100 * dFactor : 100 * dFactor) },
            { yPercent: 0 },
            0
        )
        .fromTo(images[index], { yPercent: 15 * dFactor }, { yPercent: 0, duration: 1.25, ease: "power2.out" }, 0)
        .fromTo(
            sections[index].querySelectorAll(".char"), // Letras animadas
            { 
                autoAlpha: 0, 
                yPercent: () => (Math.random() < 0.5 ? -150 : 150) // Algunas letras desde arriba, otras desde abajo
            },
            {
                autoAlpha: 1,
                yPercent: 0,
                duration: 1,
                ease: "power2.out",
                stagger: { each: 0.05, from: "random" } // Letras entran en orden aleatorio
            },
            0.2
        );

        currentIndex = index;
    }

    // Configura el observador para el scroll
    Observer.create({
        target: container, // Limitar el Observer al contenedor del bloque 3
        type: "wheel,touch,pointer",
        wheelSpeed: -1,
        onDown: () => !animating && gotoSection(currentIndex - 1, -1),
        onUp: () => !animating && gotoSection(currentIndex + 1, 1),
        tolerance: 10,
        preventDefault: true,
    });

    // Muestra la primera sección al cargar
    gotoSection(0, 1);

    console.log("GSAP animation with randomized letter effects initialized for bloque_3");
});
// Función para inicializar el efecto de texto rodante
function initRollingText() {
    // Verificar que el contenedor existe
    const container = document.querySelector(".gsap_container");
    if (!container) {
        console.error("Contenedor .gsap_container no encontrado");
        return;
    }

    // Crear o seleccionar .rolling-text
    let rollingText = container.querySelector(".rolling-text");
    if (!rollingText) {
        rollingText = document.createElement("div");
        rollingText.className = "rolling-text";
        rollingText.id = "rollingText";
        container.appendChild(rollingText);
    }

    // Configuración del texto
    const frase = "Este es un texto que rueda mientras haces scroll y ondula de manera dinámica.";
    if (!frase) {
        console.error("La frase está vacía");
        return;
    }

    // Limpiar y crear spans
    rollingText.innerHTML = "";
    frase.split("").forEach((char) => {
        const span = document.createElement("span");
        span.textContent = char;
        rollingText.appendChild(span);
    });

    // Verificar que GSAP y ScrollTrigger estén disponibles
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
        console.error("GSAP o ScrollTrigger no están cargados");
        return;
    }

    // Registrar ScrollTrigger
    gsap.registerPlugin(ScrollTrigger);

    // Animación principal
    gsap.fromTo(
        rollingText,
        { x: window.innerWidth },
        {
            x: -rollingText.offsetWidth - 100,
            ease: "none",
            scrollTrigger: {
                trigger: ".gsap_container",
                start: "top 80%", // Comienza cuando el 80% superior de la sección es visible
                end: "bottom top", // Termina cuando la sección sale de la vista
                scrub: 1, // Suaviza la animación con el scroll
                pin: false, // Desactivado para evitar problemas
                markers: false, 
                onUpdate: () => console.log("Animación en progreso") // Depuración
            }
        }
    );

    // Animación de ondulación
    const chars = rollingText.querySelectorAll("span");
    chars.forEach((char, index) => {
        gsap.to(char, {
            y: -10,
            yoyo: true,
            repeat: -1,
            duration: 0.8 + Math.random() * 0.3,
            ease: "sine.inOut",
            delay: index * 0.05
        });
    });

    // Refrescar ScrollTrigger al redimensionar
    window.addEventListener("resize", () => {
        ScrollTrigger.refresh();
    });
}

// Ejecutar cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM cargado, iniciando initRollingText");
    initRollingText();
});