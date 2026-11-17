import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export interface TextRevealOptions {
    /** Punto del viewport donde arranca la animación. */
    start?: string;
    /** Retardo entre palabras. */
    stagger?: number;
    /** Duración de cada palabra. */
    duration?: number;
}

/**
 * Divide el texto en palabras dentro de máscaras, igual que el Hero.
 * Cada palabra sube desde yPercent 100 al entrar en el viewport.
 */
const splitWords = (element: HTMLElement): HTMLElement[] => {
    const text = element.textContent ?? "";
    element.textContent = "";
    const words: HTMLElement[] = [];

    text.split(/(\s+)/).forEach((token) => {
        if (!token) return;
        if (/^\s+$/.test(token)) {
            element.appendChild(document.createTextNode(token));
            return;
        }

        const mask = document.createElement("span");
        mask.className = "inline-block overflow-hidden";

        const word = document.createElement("span");
        word.className = "inline-block will-change-transform";
        word.textContent = token;

        mask.appendChild(word);
        element.appendChild(mask);
        words.push(word);
    });

    return words;
};

/**
 * Anima palabra por palabra los elementos que coincidan con `selector`
 * dentro de `root`, activándose al hacer scroll.
 *
 * Devuelve una función para limpiar y restaurar el HTML original.
 */
export const initTextReveal = (
    root: HTMLElement,
    selector = "[data-reveal]",
    {
        start = "top 85%",
        stagger = 0.04,
        duration = 0.8,
    }: TextRevealOptions = {},
): (() => void) => {
    const elements = Array.from(
        root.querySelectorAll<HTMLElement>(selector),
    );
    if (elements.length === 0) return () => {};

    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
        const originalHTML = new Map<HTMLElement, string>();
        const triggers: ScrollTrigger[] = [];
        const tweens: gsap.core.Tween[] = [];

        elements.forEach((element) => {
            originalHTML.set(element, element.innerHTML);
            const words = splitWords(element);

            if (words.length === 0) return;

            const tween = gsap.from(words, {
                yPercent: 100,
                duration,
                ease: "power2.out",
                stagger,
                paused: true,
            });

            const trigger = ScrollTrigger.create({
                trigger: element,
                start,
                once: true,
                onEnter: () => tween.play(),
            });

            tweens.push(tween);
            triggers.push(trigger);
        });

        return () => {
            triggers.forEach((trigger) => trigger.kill());
            tweens.forEach((tween) => tween.kill());

            // Restaura el texto original sin las máscaras.
            originalHTML.forEach((html, element) => {
                element.innerHTML = html;
            });
            originalHTML.clear();
        };
    });

    return () => mm.revert();
};

/**
 * Revela las tarjetas con la misma animación de "wave" que los textos del
 * Hero: cada card sube desde dentro de su máscara y las de una misma fila
 * se encadenan con un pequeño stagger.
 */
export const initCardReveal = (
    root: HTMLElement,
    selector = "[data-reveal-card]",
    {
        start = "top 85%",
        duration = 0.9,
        stagger = 0.12,
    }: { start?: string; duration?: number; stagger?: number } = {},
): (() => void) => {
    const elements = Array.from(
        root.querySelectorAll<HTMLElement>(selector),
    );
    if (elements.length === 0) return () => {};

    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Estado inicial oculto bajo la máscara del contenedor de cada card.
        gsap.set(elements, { yPercent: 100 });

        const triggers: ScrollTrigger[] = [];
        const tweens: gsap.core.Tween[] = [];

        elements.forEach((element, index) => {
            // El trigger se mide sobre la máscara (sin transformar), no sobre
            // la card desplazada, para que el scroll siempre lo alcance.
            const mask = element.parentElement ?? element;

            const tween = gsap.to(element, {
                yPercent: 0,
                duration,
                ease: "power2.out",
                delay: (index % 3) * stagger,
                paused: true,
            });

            const trigger = ScrollTrigger.create({
                trigger: mask,
                start,
                once: true,
                onEnter: () => tween.play(),
            });

            tweens.push(tween);
            triggers.push(trigger);
        });

        return () => {
            triggers.forEach((trigger) => trigger.kill());
            tweens.forEach((tween) => tween.kill());
            gsap.killTweensOf(elements);
            gsap.set(elements, { clearProps: "all" });
        };
    });

    return () => mm.revert();
};
