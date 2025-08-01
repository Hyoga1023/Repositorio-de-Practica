// Configuración inicial
const app = new PIXI.Application({
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: 0x000000,
  antialias: true,
});

document.body.appendChild(app.view);

// Shader modificado para incluir mapa de profundidad
const fragmentShader = `
precision mediump float;

varying vec2 vTextureCoord;
uniform sampler2D uSampler; // Textura principal
uniform sampler2D uDepthMap; // Mapa de profundidad
uniform float uTime;
uniform float uScanProgress;

// Función de ruido
float noise(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// Detección de bordes
float edgeDetection(vec2 uv) {
    vec2 texel = vec2(1.0) / vec2(1024.0);
    float tl = length(texture2D(uSampler, uv + vec2(-texel.x, -texel.y)).rgb);
    float tr = length(texture2D(uSampler, uv + vec2(texel.x, -texel.y)).rgb);
    float bl = length(texture2D(uSampler, uv + vec2(-texel.x, texel.y)).rgb);
    float br = length(texture2D(uSampler, uv + vec2(texel.x, texel.y)).rgb);
    float dx = abs(tl - br) + abs(tr - bl);
    return smoothstep(0.1, 0.8, dx);
}

// Generar patrones
float generatePattern(vec2 uv, float intensity) {
    vec2 hex = vec2(uv.x * 30.0, uv.y * 30.0 + mod(floor(uv.x * 30.0), 2.0) * 0.5);
    vec2 hexCenter = floor(hex) + 0.5;
    float hexDist = length(hex - hexCenter);
    float hexPattern = smoothstep(0.3, 0.7, hexDist);
    float circuit1 = abs(sin(uv.x * 50.0)) * abs(sin(uv.y * 30.0));
    float circuit2 = abs(sin(uv.x * 80.0 + uTime)) * abs(sin(uv.y * 60.0));
    float pattern = hexPattern * 0.4 + circuit1 * 0.3 + circuit2 * 0.3;
    return pattern * intensity;
}

void main() {
    vec2 uv = vTextureCoord;
    vec4 originalColor = texture2D(uSampler, uv);
    float depth = texture2D(uDepthMap, uv).r; // Valor de profundidad (0 a 1)

    // Ajustar la posición del escáner según la profundidad
    float scanPos = uScanProgress;
    float adjustedScanPos = scanPos - depth * 0.3;
    float distToScan = abs(uv.y - adjustedScanPos);

    float edges = edgeDetection(uv);
    float brightness = dot(originalColor.rgb, vec3(0.299, 0.587, 0.114));
    vec3 finalColor = originalColor.rgb;

    // Desactivar todos los efectos si el escaneo ha terminado
    float scanVisibility = smoothstep(1.0, 0.95, uScanProgress); // Desvanecer suavemente cerca del final

    // ZONA DE ANÁLISIS ACTIVA
    if (distToScan < 0.15 && scanVisibility > 0.0) {
        float scanIntensity = (1.0 - (distToScan / 0.15)) * scanVisibility;
        float patterns = generatePattern(uv, scanIntensity);
        patterns *= (edges * 2.0 + brightness * 0.5 + 0.3);

        vec2 distortion = vec2(
            sin(uv.y * 100.0 + uTime * 2.0) * 0.003,
            cos(uv.x * 80.0 + uTime * 1.5) * 0.002
        ) * scanIntensity;
        vec4 distortedColor = texture2D(uSampler, uv + distortion);
        finalColor = mix(finalColor, distortedColor.rgb, scanIntensity * 0.3);
        finalColor += vec3(1.0, 0.0, 0.0) * patterns * 0.6; // Rojo
        finalColor += vec3(0.8, 0.0, 0.0) * patterns * edges * 0.4; // Rojo más oscuro
    }

    // LÍNEA PRINCIPAL DEL ESCÁNER
    if (distToScan < 0.008 && scanVisibility > 0.0) {
        float lineIntensity = (0.008 - distToScan) / 0.008;
        float pulse = sin(uTime * 15.0 + uv.x * 20.0) * 0.3 + 0.7;
        float mainLine = lineIntensity * pulse * (brightness + 0.1);
        finalColor += vec3(1.0, 0.0, 0.0) * mainLine * 0.8 * smoothstep(0.0, 0.2, brightness) * scanVisibility; // Rojo
    }

    // LÍNEAS SECUNDARIAS
    for(float i = 1.0; i <= 3.0; i++) {
        float offset = i * 0.012;
        float secDist = abs(distToScan - offset);
        if (secDist < 0.003 && scanVisibility > 0.0) {
            float secIntensity = (0.003 - secDist) / 0.003;
            float variation = sin(uv.x * 40.0 + i * 2.0) * 0.5 + 0.5;
            secIntensity *= variation * (edges + 0.3);
            finalColor += vec3(1.0, 0.0, 0.0) * secIntensity * (0.4 / i) * smoothstep(0.0, 0.2, brightness) * scanVisibility; // Rojo
        }
    }

    // RESPLANDOR
    if (scanVisibility > 0.0) {
        float glow = exp(-distToScan * 8.0) * 0.15 * (brightness + 0.2);
        finalColor += vec3(1.0, 0.0, 0.0) * glow * smoothstep(0.0, 0.2, brightness) * scanVisibility; // Rojo
    }

    // INTERFERENCIA
    if (distToScan < 0.05 && scanVisibility > 0.0) {
        float interference = noise(uv * 100.0 + uTime * 0.5);
        interference *= edges * (brightness + 0.3);
        if (interference > 0.8) {
            finalColor += vec3(1.0, 0.0, 0.0) * 0.3 * scanVisibility; // Rojo
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
let speeds = [0.5, 1.0, 2.0, 3.0];
let currentSpeedIndex = 1;

// Crear placeholder para mapa de profundidad
function createDepthPlaceholderTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 600;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#ffffff"); // Cerca
  gradient.addColorStop(1, "#000000"); // Lejos
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return PIXI.Texture.from(canvas);
}

// Crear placeholder para imagen principal
function createPlaceholderTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 600;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "#001122");
  gradient.addColorStop(0.5, "#003366");
  gradient.addColorStop(1, "#001122");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#0066cc";
  ctx.lineWidth = 2;
  for (let i = 0; i < 10; i++) {
    ctx.beginPath();
    ctx.arc(
      Math.random() * canvas.width,
      Math.random() * canvas.height,
      Math.random() * 50 + 10,
      0,
      Math.PI * 2
    );
    ctx.stroke();
  }
  ctx.fillStyle = "#00aaff";
  ctx.font = "24px Courier New";
  ctx.textAlign = "center";
  ctx.fillText("ESCÁNER ACTIVO", canvas.width / 2, canvas.height / 2);
  ctx.fillText("ANALIZANDO...", canvas.width / 2, canvas.height / 2 + 40);
  return PIXI.Texture.from(canvas);
}

// Inicializar efecto
async function initScanEffect() {
  console.log("🚀 Iniciando carga de texturas...");
  try {
    // Cargar imagen principal y mapa de profundidad
    const assets = await PIXI.Assets.load([
      "img/Prueba1.png",
      "img/Prueba1_Dark.png",
    ]);
    console.log("✅ Texturas cargadas:", assets);

    const sprite = new PIXI.Sprite(assets["img/Prueba1.png"]);
    const depthTexture = assets["img/Prueba1_Dark.png"];

    // Ajustar tamaño
    const scaleX = app.screen.width / sprite.width;
    const scaleY = app.screen.height / sprite.height;
    const scale = Math.max(scaleX, scaleY);
    sprite.scale.set(scale);
    sprite.anchor.set(0.5);
    sprite.position.set(app.screen.width / 2, app.screen.height / 2);

    // Crear filtro con ambas texturas
    scanFilter = new PIXI.Filter(undefined, fragmentShader, {
      uTime: 0,
      uScanProgress: 0,
      uDepthMap: depthTexture, // Pasar mapa de profundidad
    });

    sprite.filters = [scanFilter];
    app.stage.addChild(sprite);

    console.log("🎯 Sprite agregado al stage");
    document.getElementById("loading").style.display = "none";
    document.getElementById("controls").style.display = "block";
    startScan();
  } catch (error) {
    console.error("❌ Error cargando texturas:", error);
    console.log("🔄 Usando placeholders...");

    const texture = createPlaceholderTexture();
    const depthTexture = createDepthPlaceholderTexture();
    const sprite = new PIXI.Sprite(texture);

    const scaleX = app.screen.width / sprite.width;
    const scaleY = app.screen.height / sprite.height;
    const scale = Math.max(scaleX, scaleY);
    sprite.scale.set(scale);
    sprite.anchor.set(0.5);
    sprite.position.set(app.screen.width / 2, app.screen.height / 2);

    scanFilter = new PIXI.Filter(undefined, fragmentShader, {
      uTime: 0,
      uScanProgress: 0,
      uDepthMap: depthTexture,
    });

    sprite.filters = [scanFilter];
    app.stage.addChild(sprite);

    console.log("🎯 Placeholder agregado al stage");
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
    scanFilter.uniforms.uTime += delta * 0.016;
    if (isScanning) {
      scanProgress += delta * 0.01 * scanSpeed;
      scanFilter.uniforms.uScanProgress = scanProgress;
      if (scanProgress >= 1) {
        isScanning = false;
        setTimeout(() => {
          if (!isScanning) startScan();
        }, 2000);
      }
    }
  }
});

// Controles
window.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
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
});

// Inicializar
setTimeout(initScanEffect, 100);
