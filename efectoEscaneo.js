// Inicializar la aplicación PIXI.js
const app = new PIXI.Application({
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: 0x000000,
  antialias: true,
  resizeTo: window,
});
document.body.appendChild(app.view);

// Shader para el efecto de escaneo con mapa de profundidad
const fragmentShader = `
            precision mediump float;
            varying vec2 vTextureCoord;
            uniform sampler2D uSampler;
            uniform sampler2D uDepthMap;
            uniform float uTime;
            uniform float uScanProgress;

            float noise(vec2 p) {
                return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
            }

            float edgeDetection(vec2 uv) {
                vec2 texel = 1.0 / vec2(1024.0);
                float tl = length(texture2D(uSampler, uv + vec2(-texel.x, -texel.y)).rgb);
                float tr = length(texture2D(uSampler, uv + vec2(texel.x, -texel.y)).rgb);
                float bl = length(texture2D(uSampler, uv + vec2(-texel.x, texel.y)).rgb);
                float br = length(texture2D(uSampler, uv + vec2(texel.x, texel.y)).rgb);
                return smoothstep(0.15, 0.85, abs(tl - br) + abs(tr - bl));
            }

            float scanPattern(vec2 uv, float intensity) {
                float grid = sin(uv.x * 50.0 + uTime * 0.5) * cos(uv.y * 40.0);
                float wave = sin(uv.y * 25.0 + uTime * 1.5) * 0.5 + 0.5;
                return (grid * 0.4 + wave * 0.6) * intensity;
            }

            void main() {
                vec2 uv = vTextureCoord;
                vec4 color = texture2D(uSampler, uv);
                float depth = texture2D(uDepthMap, uv).r;
                float brightness = dot(color.rgb, vec3(0.299, 0.587, 0.114));
                float edges = edgeDetection(uv);
                vec3 finalColor = color.rgb;
                float scanPos = uScanProgress - depth * 0.25;
                float distToScan = abs(uv.y - scanPos);
                float scanVisibility = smoothstep(1.0, 0.9, uScanProgress);

                // Desactivar efectos si el fondo es negro (baja luminosidad)
                if (brightness > 0.05 && max(max(color.r, color.g), color.b) > 0.05) { // Umbral más estricto
                    // Efecto de escaneo activo
                    if (distToScan < 0.12 && scanVisibility > 0.0) {
                        float scanIntensity = (1.0 - distToScan / 0.12) * scanVisibility;
                        float pattern = scanPattern(uv, scanIntensity);
                        vec2 distortion = vec2(
                            sin(uv.y * 60.0 + uTime) * 0.003,
                            cos(uv.x * 40.0 + uTime) * 0.002
                        ) * scanIntensity;
                        finalColor = mix(finalColor, texture2D(uSampler, uv + distortion).rgb, 0.25);
                        finalColor += vec3(0.0, 0.7, 1.0) * pattern * (edges * 0.8 + 0.2) * scanVisibility;
                    }

                    // Colores sugeridos para el escáner:
// vec3(1.0, 0.0, 0.0) // rojo demonio
// vec3(0.0, 1.0, 0.0) // verde alienígena
// vec3(1.0, 1.0, 0.0) // amarillo eléctrico
// vec3(1.0, 0.5, 0.0) // naranja radioactivo
// vec3(0.5, 0.0, 0.5) // púrpura psicodélico
// vec3(0.0, 0.7, 1.0) // azul cian (actual)

                    // Línea principal del escáner
                    if (distToScan < 0.006 && scanVisibility > 0.0) {
                        float lineIntensity = (0.006 - distToScan) / 0.006;
                        finalColor += vec3(0.0, 0.7, 1.0) * lineIntensity * (brightness + 0.3) * scanVisibility;
                    }

                    // Líneas secundarias
                    for (float i = 1.0; i <= 2.0; i++) {
                        float offset = i * 0.015;
                        float secDist = abs(distToScan - offset);
                        if (secDist < 0.004 && scanVisibility > 0.0) {
                            float secIntensity = (0.004 - secDist) / 0.004;
                            finalColor += vec3(0.0, 0.7, 1.0) * secIntensity * (0.3 / i) * scanVisibility;
                        }
                    }

                    // Resplandor
                    if (scanVisibility > 0.0) {
                        float glow = exp(-distToScan * 12.0) * 0.12 * (brightness + 0.3);
                        finalColor += vec3(0.0, 0.7, 1.0) * glow * scanVisibility;
                    }
                }

                gl_FragColor = vec4(finalColor, 1.0);
            }
        `;

// Variables de control
let scanFilter;
let scanProgress = 0;
let isScanning = false;
let scanSpeed = 1.0;
const speeds = [0.5, 1.0, 1.5, 2.0];
let currentSpeedIndex = 1;

// Crear texturas placeholder (por si las imágenes no cargan)
function createPlaceholderColorTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1920;
  canvas.height = 1080;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "#001a4d");
  gradient.addColorStop(1, "#003d99");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return PIXI.Texture.from(canvas);
}

function createPlaceholderDepthTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1920;
  canvas.height = 1080;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(1, "#000000");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return PIXI.Texture.from(canvas);
}

// Inicializar efecto con las imágenes específicas
async function initScanEffect() {
  try {
    console.log("Intentando cargar imágenes...");
    const assets = await PIXI.Assets.load([
      "img/Rostro_a_color2.png",
      "img/Rostro_a_grises2.png",
    ]);
    const colorTexture = assets["img/Rostro_a_color2.png"];
    const depthTexture = assets["img/Rostro_a_grises2.png"];

    const sprite = new PIXI.Sprite(colorTexture);
    sprite.width = app.screen.width;
    sprite.height = app.screen.height;
    sprite.anchor.set(0.5);
    sprite.position.set(app.screen.width / 2, app.screen.height / 2);

    scanFilter = new PIXI.Filter(null, fragmentShader, {
      uTime: 0,
      uScanProgress: 0,
      uDepthMap: depthTexture,
    });

    sprite.filters = [scanFilter];
    app.stage.addChild(sprite);

    document.getElementById("loading").style.display = "none";
    document.getElementById("controls").style.display = "block";
    startScan();
  } catch (error) {
    console.error("Error cargando texturas:", error);
    const colorTexture = createPlaceholderColorTexture();
    const depthTexture = createPlaceholderDepthTexture();
    const sprite = new PIXI.Sprite(colorTexture);
    sprite.width = app.screen.width;
    sprite.height = app.screen.height;
    sprite.anchor.set(0.5);
    sprite.position.set(app.screen.width / 2, app.screen.height / 2);

    scanFilter = new PIXI.Filter(null, fragmentShader, {
      uTime: 0,
      uScanProgress: 0,
      uDepthMap: depthTexture,
    });

    sprite.filters = [scanFilter];
    app.stage.addChild(sprite);

    document.getElementById("loading").style.display = "none";
    document.getElementById("controls").style.display = "block";
    startScan();
  }
}

// Iniciar escaneo
function startScan() {
  scanProgress = 0;
  isScanning = true;
}

// Animación
app.ticker.add((delta) => {
  if (scanFilter) {
    scanFilter.uniforms.uTime += delta * 0.015;
    if (isScanning) {
      scanProgress += delta * 0.01 * scanSpeed;
      scanFilter.uniforms.uScanProgress = scanProgress;
      if (scanProgress >= 1) {
        isScanning = false;
        setTimeout(startScan, 2500);
      }
    }
  }
});

// Controles
window.addEventListener("keydown", (e) => {
  if (e.key === "r" || e.key === "R") {
    e.preventDefault();
    startScan();
  }
});

window.addEventListener("click", () => {
  currentSpeedIndex = (currentSpeedIndex + 1) % speeds.length;
  scanSpeed = speeds[currentSpeedIndex];
});

// Redimensionar
window.addEventListener("resize", () => {
  app.renderer.resize(window.innerWidth, window.innerHeight);
  if (app.stage.children.length > 0) {
    const sprite = app.stage.children[0];
    sprite.width = app.screen.width;
    sprite.height = app.screen.height;
    sprite.position.set(app.screen.width / 2, app.screen.height / 2);
  }
});

// Iniciar el efecto
initScanEffect();
