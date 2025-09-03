// GSAP.js
// Registra únicamente los plugins que son gratuitos.
gsap.registerPlugin(ScrollTrigger);

// Animación del título de la sección
gsap.from("#inspiracion .title", {
    opacity: 0,
    y: 50,
    duration: 1.5,
    ease: "power2.out",
    scrollTrigger: {
        trigger: "#inspiracion",
        start: "top 80%",
        toggleActions: "play none none reverse"
    }
});

// Animación de los SVGs
gsap.to("#svg-forms path", {
    rotation: 360,
    scale: 1.2,
    stagger: 0.2,
    ease: "power2.inOut",
    scrollTrigger: {
        trigger: "#inspiracion",
        start: "top 80%",
        end: "bottom 20%",
        scrub: true
    }
});