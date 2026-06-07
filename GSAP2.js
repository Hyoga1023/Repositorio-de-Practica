// GSAP
gsap.registerPlugin(ScrollTrigger);

// Animación de entrada inicial para el título
gsap.from(".panel-intro h1", {
    opacity: 0,
    y: 50,
    duration: 1.5,
    ease: "power3.out"
});

// MatchMedia para animaciones responsivas
let mm = gsap.matchMedia();

mm.add("(min-width: 800px)", () => {
    console.log("Modo escritorio activado");
    // Animaciones para escritorio
    gsap.from(".panel-image img", {
        x: "100%",
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: {
            trigger: ".panel-image",
            start: "top 80%",
            end: "top 20%",
            scrub: true,
        }
    });
    gsap.from(".panel-text h2", {
        x: "-100%",
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: {
            trigger: ".panel-text",
            start: "top 80%",
            end: "top 20%",
            scrub: true,
        }
    });
});

mm.add("(max-width: 799px)", () => {
    console.log("Modo móvil activado");
    // Animaciones para móviles y tablets
    gsap.from(".panel-image img", {
        opacity: 0,
        y: 20,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: {
            trigger: ".panel-image",
            start: "top bottom", 
            toggleActions: "play none none none",
            once: true
        }
    });
    gsap.from(".panel-text h2", {
        opacity: 0,
        y: 20,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: {
            trigger: ".panel-text",
            start: "top bottom",
            toggleActions: "play none none none",
            once: true
        }
    });
});

// Refresco en resize
window.addEventListener("resize", () => {
    ScrollTrigger.refresh();
    console.log("ScrollTrigger refrescado");
});