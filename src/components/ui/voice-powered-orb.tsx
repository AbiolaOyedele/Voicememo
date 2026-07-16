'use client'

import { useEffect, useRef, type FC } from 'react'
import { Renderer, Program, Mesh, Triangle, Vec3 } from 'ogl'
import { cn } from '@/lib/utils'
import { getMicPermissionState } from '@/lib/mic'

interface VoicePoweredOrbProps {
  className?: string
  hue?: number
  enableVoiceControl?: boolean
  voiceSensitivity?: number
  maxRotationSpeed?: number
  maxHoverIntensity?: number
  onVoiceDetected?: (detected: boolean) => void
  /** Optional shared stream (e.g. from the recorder) so the orb doesn't open a second mic. */
  mediaStream?: MediaStream | null
  /** Deep core tone as normalised [r, g, b] (0–1). Defaults to the app's warm burnt orange. */
  coreColor?: [number, number, number]
  /**
   * Simulate the energetic "recording" look (faster rotation + wavy distortion)
   * without opening a microphone. Ignored while a real analyser is active.
   */
  demo?: boolean
  /**
   * Called when WebGL isn't available (context creation fails) or the context
   * is lost at runtime and the orb can't render. Callers should swap in a
   * non-WebGL fallback — otherwise the orb silently renders nothing.
   */
  onUnavailable?: () => void
}

/** Default deep core tone (#9D2500) — matches the app record screen. */
const DEFAULT_CORE: [number, number, number] = [0.615686, 0.145098, 0.0]

const VERT = /* glsl */ `
  precision highp float;
  attribute vec2 position;
  attribute vec2 uv;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`

const FRAG = /* glsl */ `
  precision highp float;

  uniform float iTime;
  uniform vec3 iResolution;
  uniform float hue;
  uniform float hover;
  uniform float rot;
  uniform float hoverIntensity;
  varying vec2 vUv;

  vec3 rgb2yiq(vec3 c) {
    float y = dot(c, vec3(0.299, 0.587, 0.114));
    float i = dot(c, vec3(0.596, -0.274, -0.322));
    float q = dot(c, vec3(0.211, -0.523, 0.312));
    return vec3(y, i, q);
  }
  vec3 yiq2rgb(vec3 c) {
    float r = c.x + 0.956 * c.y + 0.621 * c.z;
    float g = c.x - 0.272 * c.y - 0.647 * c.z;
    float b = c.x - 1.106 * c.y + 1.703 * c.z;
    return vec3(r, g, b);
  }
  vec3 adjustHue(vec3 color, float hueDeg) {
    float hueRad = hueDeg * 3.14159265 / 180.0;
    vec3 yiq = rgb2yiq(color);
    float cosA = cos(hueRad);
    float sinA = sin(hueRad);
    float i = yiq.y * cosA - yiq.z * sinA;
    float q = yiq.y * sinA + yiq.z * cosA;
    yiq.y = i;
    yiq.z = q;
    return yiq2rgb(yiq);
  }
  vec3 hash33(vec3 p3) {
    p3 = fract(p3 * vec3(0.1031, 0.11369, 0.13787));
    p3 += dot(p3, p3.yxz + 19.19);
    return -1.0 + 2.0 * fract(vec3(p3.x + p3.y, p3.x + p3.z, p3.y + p3.z) * p3.zyx);
  }
  float snoise3(vec3 p) {
    const float K1 = 0.333333333;
    const float K2 = 0.166666667;
    vec3 i = floor(p + (p.x + p.y + p.z) * K1);
    vec3 d0 = p - (i - (i.x + i.y + i.z) * K2);
    vec3 e = step(vec3(0.0), d0 - d0.yzx);
    vec3 i1 = e * (1.0 - e.zxy);
    vec3 i2 = 1.0 - e.zxy * (1.0 - e);
    vec3 d1 = d0 - (i1 - K2);
    vec3 d2 = d0 - (i2 - K1);
    vec3 d3 = d0 - 0.5;
    vec4 h = max(0.6 - vec4(dot(d0, d0), dot(d1, d1), dot(d2, d2), dot(d3, d3)), 0.0);
    vec4 n = h * h * h * h * vec4(
      dot(d0, hash33(i)), dot(d1, hash33(i + i1)), dot(d2, hash33(i + i2)), dot(d3, hash33(i + 1.0))
    );
    return dot(vec4(31.316), n);
  }
  vec4 extractAlpha(vec3 colorIn) {
    float a = max(max(colorIn.r, colorIn.g), colorIn.b);
    return vec4(colorIn.rgb / (a + 1e-5), a);
  }

  // Brand flame (#FF4F03) and warm shades. A glow shader needs saturated colour to
  // read on white — mid-grey was near-invisible; the orange rim shows clearly.
  // baseColor3 (the deep core tone) is a uniform so callers can warm it up.
  const vec3 baseColor1 = vec3(1.000000, 0.309804, 0.011765);
  const vec3 baseColor2 = vec3(1.000000, 0.627451, 0.301961);
  uniform vec3 baseColor3;
  const float innerRadius = 0.6;
  const float noiseScale = 0.65;

  float light1(float intensity, float attenuation, float dist) {
    return intensity / (1.0 + dist * attenuation);
  }
  float light2(float intensity, float attenuation, float dist) {
    return intensity / (1.0 + dist * dist * attenuation);
  }

  vec4 draw(vec2 uv) {
    vec3 color1 = adjustHue(baseColor1, hue);
    vec3 color2 = adjustHue(baseColor2, hue);
    vec3 color3 = adjustHue(baseColor3, hue);
    float ang = atan(uv.y, uv.x);
    float len = length(uv);
    float invLen = len > 0.0 ? 1.0 / len : 0.0;
    float n0 = snoise3(vec3(uv * noiseScale, iTime * 0.5)) * 0.5 + 0.5;
    float r0 = mix(mix(innerRadius, 1.0, 0.4), mix(innerRadius, 1.0, 0.6), n0);
    float d0 = distance(uv, (r0 * invLen) * uv);
    float v0 = light1(1.0, 10.0, d0);
    v0 *= smoothstep(r0 * 1.05, r0, len);
    float cl = cos(ang + iTime * 2.0) * 0.5 + 0.5;
    float a = iTime * -1.0;
    vec2 pos = vec2(cos(a), sin(a)) * r0;
    float d = distance(uv, pos);
    float v1 = light2(1.5, 5.0, d);
    v1 *= light1(1.0, 50.0, d0);
    float v2 = smoothstep(1.0, mix(innerRadius, 1.0, n0 * 0.5), len);
    float v3 = smoothstep(innerRadius, mix(innerRadius, 1.0, 0.5), len);
    vec3 col = mix(color1, color2, cl);
    col = mix(color3, col, v0);
    col = (col + v1) * v2 * v3;
    col = clamp(col, 0.0, 1.0);
    return extractAlpha(col);
  }

  vec4 mainImage(vec2 fragCoord) {
    vec2 center = iResolution.xy * 0.5;
    float size = min(iResolution.x, iResolution.y);
    vec2 uv = (fragCoord - center) / size * 2.0;
    float angle = rot;
    float s = sin(angle);
    float c = cos(angle);
    uv = vec2(c * uv.x - s * uv.y, s * uv.x + c * uv.y);
    uv.x += hover * hoverIntensity * 0.1 * sin(uv.y * 10.0 + iTime);
    uv.y += hover * hoverIntensity * 0.1 * sin(uv.x * 10.0 + iTime);
    return draw(uv);
  }

  void main() {
    vec2 fragCoord = vUv * iResolution.xy;
    vec4 col = mainImage(fragCoord);
    gl_FragColor = vec4(col.rgb * col.a, col.a);
  }
`

type LatestProps = Required<Omit<VoicePoweredOrbProps, 'className'>>

/** True when the browser can create a WebGL context at all. */
function webglSupported(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}

/**
 * Animated WebGL orb (ogl) that reacts to microphone loudness. When a shared
 * `mediaStream` is supplied it analyses that instead of opening its own mic, so
 * it can visualise the recorder's audio without a second capture.
 */
export const VoicePoweredOrb: FC<VoicePoweredOrbProps> = ({
  className,
  hue = 0,
  enableVoiceControl = true,
  voiceSensitivity = 1.5,
  maxRotationSpeed = 1.2,
  maxHoverIntensity = 0.8,
  onVoiceDetected,
  mediaStream = null,
  coreColor = DEFAULT_CORE,
  demo = false,
  onUnavailable,
}) => {
  const ctnDom = useRef<HTMLDivElement>(null)

  // Audio analysis refs.
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null)
  const ownStreamRef = useRef<MediaStream | null>(null)

  // Latest props for the animation loop, so the WebGL context is created once.
  const propsRef = useRef<LatestProps>({
    hue,
    enableVoiceControl,
    voiceSensitivity,
    maxRotationSpeed,
    maxHoverIntensity,
    onVoiceDetected: onVoiceDetected ?? (() => {}),
    mediaStream,
    coreColor,
    demo,
    onUnavailable: onUnavailable ?? (() => {}),
  })
  propsRef.current = {
    hue,
    enableVoiceControl,
    voiceSensitivity,
    maxRotationSpeed,
    maxHoverIntensity,
    onVoiceDetected: onVoiceDetected ?? (() => {}),
    mediaStream,
    coreColor,
    demo,
    onUnavailable: onUnavailable ?? (() => {}),
  }

  // --- Audio setup: rebuild the analyser when voice control or the stream changes. ---
  useEffect(() => {
    let cancelled = false

    function teardown(): void {
      sourceRef.current?.disconnect()
      sourceRef.current = null
      analyserRef.current?.disconnect()
      analyserRef.current = null
      dataArrayRef.current = null
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        void audioContextRef.current.close()
      }
      audioContextRef.current = null
      // Only stop a stream the orb created itself — never the shared recorder stream.
      ownStreamRef.current?.getTracks().forEach((t) => t.stop())
      ownStreamRef.current = null
    }

    function attach(stream: MediaStream): void {
      if (cancelled) return
      const AudioCtx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 512
      analyser.smoothingTimeConstant = 0.3
      analyser.minDecibels = -90
      analyser.maxDecibels = -10
      const source = ctx.createMediaStreamSource(stream)
      source.connect(analyser)
      audioContextRef.current = ctx
      analyserRef.current = analyser
      sourceRef.current = source
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount)
    }

    async function setup(): Promise<void> {
      if (!enableVoiceControl) return
      if (mediaStream) {
        attach(mediaStream)
        return
      }
      // Never open our own microphone just because the orb mounted — that would
      // trigger a permission prompt outside a user gesture (the cause of repeat
      // prompts on later visits). Only self-acquire when the browser already
      // reports the mic as granted, which never shows a prompt. If we can't
      // confirm that (denied, prompt, or unsupported), the orb just animates
      // without voice reactivity. On the record screen a shared `mediaStream`
      // is passed in anyway, so this fallback is purely decorative.
      if ((await getMicPermissionState()) !== 'granted' || cancelled) return
      try {
        const own = await navigator.mediaDevices.getUserMedia({ audio: true })
        if (cancelled) {
          own.getTracks().forEach((t) => t.stop())
          return
        }
        ownStreamRef.current = own
        attach(own)
      } catch {
        // Mic unavailable — the orb still animates, just without voice reactivity.
      }
    }

    void setup()
    return () => {
      cancelled = true
      teardown()
    }
  }, [enableVoiceControl, mediaStream])

  // --- WebGL setup: created once; the loop reads latest props via propsRef. ---
  useEffect(() => {
    const container = ctnDom.current
    if (!container) return

    let rafId = 0
    let isVisible = true
    let skipNextDt = false
    // The fragment shader outputs PREMULTIPLIED colour (`col.rgb * col.a`), so the
    // canvas and blend func must both be premultiplied too. Mixing a premultiplied
    // output with `premultipliedAlpha:false` makes the compositor multiply by alpha
    // a second time, darkening the glow's soft edge into a grey halo — most visible
    // at low DPR (desktop). Keeping the whole pipeline premultiplied removes it.
    // WebGL can be missing entirely (old GPUs, Lockdown Mode, some in-app
    // browsers) or blocked — probe first and bail to the caller's fallback
    // instead of letting ogl throw and leave a blank circle.
    if (!webglSupported()) {
      propsRef.current.onUnavailable()
      return
    }
    let renderer: Renderer
    try {
      renderer = new Renderer({
        alpha: true,
        premultipliedAlpha: true,
        antialias: true,
        dpr: window.devicePixelRatio || 1,
      })
      if (!renderer.gl) throw new Error('WebGL context unavailable')
    } catch {
      propsRef.current.onUnavailable()
      return
    }
    const gl = renderer.gl
    gl.clearColor(0, 0, 0, 0)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

    while (container.firstChild) container.removeChild(container.firstChild)
    container.appendChild(gl.canvas)

    // A lost context (GPU memory pressure, backgrounded tab on iOS) leaves the
    // canvas permanently blank unless the browser restores it. Give it a beat
    // to restore; if it doesn't, hand over to the fallback.
    let lostTimer = 0
    const handleContextLost = (e: Event): void => {
      e.preventDefault()
      window.clearTimeout(lostTimer)
      lostTimer = window.setTimeout(() => propsRef.current.onUnavailable(), 1500)
    }
    const handleContextRestored = (): void => {
      window.clearTimeout(lostTimer)
    }
    gl.canvas.addEventListener('webglcontextlost', handleContextLost)
    gl.canvas.addEventListener('webglcontextrestored', handleContextRestored)

    const geometry = new Triangle(gl)
    const program = new Program(gl, {
      vertex: VERT,
      fragment: FRAG,
      uniforms: {
        iTime: { value: 0 },
        iResolution: {
          value: new Vec3(gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height),
        },
        hue: { value: hue },
        hover: { value: 0 },
        rot: { value: 0 },
        hoverIntensity: { value: 0 },
        baseColor3: { value: new Vec3(coreColor[0], coreColor[1], coreColor[2]) },
      },
    })
    const mesh = new Mesh(gl, { geometry, program })

    const resize = (): void => {
      const width = container.clientWidth
      const height = container.clientHeight
      if (width === 0 || height === 0) return
      // ogl's Renderer already applies its own `dpr` to the drawing buffer, so we
      // pass CSS pixels here. Multiplying by devicePixelRatio again would square
      // the buffer (size × dpr²) and, at dpr 3 on iOS Safari, blow the per-canvas
      // WebGL memory ceiling — the context fails silently and the orb goes blank.
      // setSize also writes the canvas CSS width/height, so no manual style needed.
      renderer.setSize(width, height)
      const res = program.uniforms.iResolution.value as Vec3
      res.set(gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height)
    }
    window.addEventListener('resize', resize)
    resize()

    let lastTime = 0
    let currentRot = 0
    const baseRotationSpeed = 0.3

    const readLevel = (): number => {
      const analyser = analyserRef.current
      const data = dataArrayRef.current
      if (!analyser || !data) return 0
      analyser.getByteFrequencyData(data)
      let sum = 0
      for (let i = 0; i < data.length; i++) {
        const v = data[i]! / 255
        sum += v * v
      }
      const rms = Math.sqrt(sum / data.length)
      return Math.min(rms * propsRef.current.voiceSensitivity * 3.0, 1)
    }

    const update = (t: number): void => {
      rafId = requestAnimationFrame(update)
      if (!isVisible) return
      const p = propsRef.current
      // After a pause (orb scrolled off-screen), the first resumed frame would
      // otherwise see a `dt` spanning the whole time it was hidden and jump the
      // rotation/level state forward in one tick. Re-anchor instead of skipping
      // the frame outright, so the shader keeps getting fresh uniforms.
      const dt = skipNextDt ? 0 : (t - lastTime) * 0.001
      lastTime = t
      skipNextDt = false
      program.uniforms.iTime.value = t * 0.001
      program.uniforms.hue.value = p.hue
      const core = program.uniforms.baseColor3.value as Vec3
      core.set(p.coreColor[0], p.coreColor[1], p.coreColor[2])

      if (p.enableVoiceControl && analyserRef.current) {
        const level = readLevel()
        p.onVoiceDetected(level > 0.1)
        const speed = baseRotationSpeed + level * p.maxRotationSpeed * 2.0
        if (level > 0.05) currentRot += dt * speed
        program.uniforms.hover.value = Math.min(level * 2.0, 1.0)
        program.uniforms.hoverIntensity.value = Math.min(
          level * p.maxHoverIntensity * 0.8,
          p.maxHoverIntensity,
        )
      } else if (p.demo) {
        // Mic-free "recording" look: an organic synthetic loudness from layered
        // sines so the orb swirls and distorts as if reacting to a live voice.
        const tt = t * 0.001
        const level = Math.max(
          0.18,
          Math.min(0.85, 0.45 + 0.25 * Math.sin(tt * 2.3) + 0.14 * Math.sin(tt * 5.7 + 1.3)),
        )
        const speed = baseRotationSpeed + level * p.maxRotationSpeed * 2.0
        currentRot += dt * speed
        program.uniforms.hover.value = Math.min(level * 2.0, 1.0)
        program.uniforms.hoverIntensity.value = Math.min(
          level * p.maxHoverIntensity * 0.8,
          p.maxHoverIntensity,
        )
      } else {
        currentRot += dt * baseRotationSpeed * 0.4
        program.uniforms.hover.value = 0
        program.uniforms.hoverIntensity.value = 0
      }

      program.uniforms.rot.value = currentRot
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
      renderer.render({ scene: mesh })
    }

    rafId = requestAnimationFrame(update)

    // Both orb instances on the landing page render behind GSAP's `autoAlpha`
    // (opacity + visibility) gates for most of the pinned scroll sequence, but
    // `visibility: hidden` doesn't stop a WebGL draw call — without this, two
    // shaders keep rendering every frame, off-screen or not, fighting the
    // scroll-driven compositing for GPU time. Gate the actual draw work on
    // real viewport intersection instead.
    const observer = new IntersectionObserver(
      ([entry]) => {
        const nowVisible = entry?.isIntersecting ?? true
        if (nowVisible && !isVisible) skipNextDt = true
        isVisible = nowVisible
      },
      { threshold: 0 },
    )
    observer.observe(container)

    return () => {
      cancelAnimationFrame(rafId)
      observer.disconnect()
      window.removeEventListener('resize', resize)
      window.clearTimeout(lostTimer)
      gl.canvas.removeEventListener('webglcontextlost', handleContextLost)
      gl.canvas.removeEventListener('webglcontextrestored', handleContextRestored)
      if (container.contains(gl.canvas)) {
        try {
          container.removeChild(gl.canvas)
        } catch {
          // already detached
        }
      }
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
    // Created once; dynamic values are read from propsRef.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <div ref={ctnDom} className={cn('relative h-full w-full', className)} />
}
